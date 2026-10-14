# -*- coding: utf-8 -*-
"""
题库构建脚本
============
把 data/source/ 下按年份存放的原始题目 JSON 合并为站点使用的数据文件：

    data/questions.json       合并后的结构化题库（含 source_years 与各年题号）
    data/knowledge_tree.json  知识点树（含每知识点/章节的题目数统计）
    data/stats.json           题库统计（题型/知识点/年份/计算题考点/分值）
    data/validation.json      校验报告（缺题号、缺答案、缺选项、重复题等）

新增年份试卷的做法：
  1. 在 data/source/ 下新增 <年份>.json（格式参考现有文件）；
  2. 运行 `python scripts/build_data.py`；
  3. 刷新前端即可，无需改动任何页面代码。
跨年份重复的题目：在题目里加 "merge_key"（同一道题用同一个值），
脚本会自动合并为一条，并把各个年份写进 source_years 与 original_numbers。
"""
from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter, OrderedDict
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "source")
OUT = os.path.join(ROOT, "data")

TYPE_LABELS = {
    "single_choice": "单选题",
    "multiple_choice": "多选题",
    "fill_blank": "填空题",
    "true_false": "判断题",
    "short_answer": "简答题",
    "calculation": "计算题",
}

CHOICE_TYPES = {"single_choice", "multiple_choice", "true_false"}


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def norm_stem(s: str) -> str:
    return re.sub(r"[\s　，。、（）()？?：:；;．.,]", "", s or "")


def main():
    tree_src = load_json(os.path.join(SRC, "knowledge_tree.json"))

    # 知识点 -> 章节 索引
    kp_chapter = {}
    kp_order = []
    for ch in tree_src["chapters"]:
        for p in ch["points"]:
            kp_chapter[p["name"]] = ch["name"]
            kp_order.append(p["name"])

    year_files = sorted(
        f for f in os.listdir(SRC) if re.fullmatch(r"\d{4}\.json", f)
    )
    if not year_files:
        print("未找到任何年份文件（data/source/<年份>.json）")
        sys.exit(1)

    merged: "OrderedDict[str, dict]" = OrderedDict()
    merge_index: dict[str, str] = {}
    year_meta = []

    for yf in year_files:
        doc = load_json(os.path.join(SRC, yf))
        year = doc["year"]
        year_meta.append({
            "year": year,
            "source": doc["source"],
            "paper_file": doc.get("paper_file", ""),
            "answer_file": doc.get("answer_file", ""),
            "note": doc.get("note", ""),
            "count": len(doc["questions"]),
        })
        for q in doc["questions"]:
            q = dict(q)
            q.setdefault("source_years", [year])
            q.setdefault("source", doc["source"])
            q.setdefault("original_numbers", {})
            q.setdefault("options", [])
            q.setdefault("images", [])
            q.setdefault("answer_images", [])
            q.setdefault("tags", [])
            q.setdefault("knowledge_points", [])
            key = q.get("merge_key")
            if key and key in merge_index:
                base = merged[merge_index[key]]
                for y in q["source_years"]:
                    if y not in base["source_years"]:
                        base["source_years"].append(y)
                base["source_years"].sort()
                base["original_numbers"].update(q["original_numbers"])
                base["source"] = "、".join(
                    "%d年855机械设计基础真题" % y for y in base["source_years"]
                )
                if "跨年份重复" not in base["tags"]:
                    base["tags"].append("跨年份重复")
                # 答案更长的优先保留
                if len(str(q.get("answer", ""))) > len(str(base.get("answer", ""))):
                    base["answer"] = q["answer"]
                    base["explanation"] = q.get("explanation") or base["explanation"]
            else:
                q["source_years"].sort()
                if len(q["source_years"]) > 1:
                    q["source"] = "、".join(
                        "%d年855机械设计基础真题" % y for y in q["source_years"]
                    )
                merged[q["id"]] = q
                if key:
                    merge_index[key] = q["id"]

    questions = list(merged.values())

    # ---------------- 校验 ----------------
    issues = {
        "缺题号": [], "缺答案": [], "缺选项": [], "重复题": [],
        "年份不明": [], "知识点未标注": [], "知识点不在考纲": [], "图片文件缺失": [],
    }
    for q in questions:
        if not q["original_numbers"]:
            issues["缺题号"].append(q["id"])
        ans = q.get("answer")
        if ans is None or (isinstance(ans, (list, str)) and len(ans) == 0):
            issues["缺答案"].append(q["id"])
        if q["type"] in CHOICE_TYPES and len(q["options"]) < 2:
            issues["缺选项"].append(q["id"])
        if not q["source_years"]:
            issues["年份不明"].append(q["id"])
        if not q["knowledge_points"]:
            issues["知识点未标注"].append(q["id"])
        for kp in q["knowledge_points"]:
            if kp not in kp_chapter:
                issues["知识点不在考纲"].append({"id": q["id"], "kp": kp})
        for img in list(q["images"]) + list(q["answer_images"]):
            p = os.path.join(ROOT, "public", img.lstrip("/").replace("/", os.sep))
            if not os.path.exists(p):
                issues["图片文件缺失"].append({"id": q["id"], "img": img})

    seen = {}
    for q in questions:
        k = norm_stem(q["stem"])
        seen.setdefault(k, []).append(q["id"])
    for k, ids in seen.items():
        if len(ids) > 1:
            issues["重复题"].append(ids)

    # ---------------- 知识点树（带统计） ----------------
    kp_count = Counter()
    ch_count = Counter()
    kp_questions = {}
    for q in questions:
        for kp in q["knowledge_points"]:
            kp_count[kp] += 1
            kp_questions.setdefault(kp, []).append(q["id"])
        if q["chapter"]:
            ch_count[q["chapter"]] += 1

    tree = json.loads(json.dumps(tree_src, ensure_ascii=False))
    for ch in tree["chapters"]:
        for p in ch["points"]:
            p["questionCount"] = kp_count.get(p["name"], 0)
            p["questionIds"] = kp_questions.get(p["name"], [])
        ch["questionCount"] = ch_count.get(ch["name"], 0)
    tree["generated_from"] = year_meta
    tree["total_questions"] = len(questions)

    # ---------------- 统计 ----------------
    def count_by(fn):
        c = Counter()
        s = Counter()
        for q in questions:
            k = fn(q)
            if k is None:
                continue
            c[k] += 1
            s[k] += q.get("score", 0) or 0
        return c, s

    type_c, type_s = count_by(lambda q: q["type"])
    diff_c, _ = count_by(lambda q: q.get("difficulty", "未标注"))
    year_c = Counter()
    for q in questions:
        for y in q["source_years"]:
            year_c[y] += 1

    calc = [q for q in questions if q["type"] == "calculation"]
    calc_kp = Counter()
    for q in calc:
        for kp in q["knowledge_points"]:
            calc_kp[kp] += 1

    stats = {
        "generated_at": datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"),
        "subject": tree_src["subject"],
        "total_questions": len(questions),
        "total_score": sum(q.get("score", 0) or 0 for q in questions),
        "by_year": [
            {"year": y, "count": year_c[y],
             "types": dict(Counter(q["type"] for q in questions if y in q["source_years"]))}
            for y in sorted(year_c)
        ],
        "by_type": [
            {"type": t, "label": TYPE_LABELS.get(t, t), "count": type_c[t], "score": type_s[t]}
            for t in TYPE_LABELS if type_c[t]
        ],
        "by_difficulty": [
            {"difficulty": d, "count": c} for d, c in
            sorted(diff_c.items(), key=lambda x: ["简单", "中等", "较难", "未标注"].index(x[0])
                   if x[0] in ["简单", "中等", "较难", "未标注"] else 99)
        ],
        "by_chapter": [
            {"chapter": ch["name"], "count": ch["questionCount"]}
            for ch in tree["chapters"] if ch["questionCount"] > 0
        ],
        "knowledge_point_ranking": [
            {"name": name, "chapter": kp_chapter.get(name, ""), "count": cnt}
            for name, cnt in kp_count.most_common()
        ],
        "calculation_analysis": {
            "total": len(calc),
            "score": sum(q.get("score", 0) or 0 for q in calc),
            "by_knowledge_point": [
                {"name": name, "chapter": kp_chapter.get(name, ""), "count": cnt}
                for name, cnt in calc_kp.most_common()
            ],
            "by_type_shape": [
                {"shape": "机构自由度计算",
                 "count": sum(1 for q in calc if "平面机构的自由度" in q["knowledge_points"])},
                {"shape": "轮系传动比计算",
                 "count": sum(1 for q in calc if any("轮系" in k for k in q["knowledge_points"]))},
                {"shape": "螺栓组强度计算",
                 "count": sum(1 for q in calc if "螺纹连接的强度计算" in q["knowledge_points"])},
                {"shape": "齿轮几何尺寸计算",
                 "count": sum(1 for q in calc if any("几何尺寸" in k for k in q["knowledge_points"]))},
                {"shape": "平衡（回转件）计算",
                 "count": sum(1 for q in calc if "刚性回转件的平衡（静平衡、动平衡）" in q["knowledge_points"])},
                {"shape": "结构改错（轴系）",
                 "count": sum(1 for q in calc if "结构改错" in q["tags"])},
                {"shape": "传动系统受力分析",
                 "count": sum(1 for q in calc if "受力分析" in q["tags"])},
            ],
        },
        "accuracy_stats": {
            "note": "正确率无法从题库静态计算，由前端根据本地答题记录（localStorage）实时统计。"
        },
        "source_distribution": [
            {"source": "、".join(str(y) for y in q["source_years"]), "year": q["source_years"][0]}
            for q in questions
        ],
    }

    # ---------------- 输出 ----------------
    payload = {
        "meta": {
            "subject": tree_src["subject"],
            "school": tree_src["school"],
            "generated_at": stats["generated_at"],
            "years": year_meta,
            "total_questions": len(questions),
            "type_labels": TYPE_LABELS,
        },
        "questions": questions,
    }
    dump_json(os.path.join(OUT, "questions.json"), payload)
    dump_json(os.path.join(OUT, "knowledge_tree.json"), tree)
    dump_json(os.path.join(OUT, "stats.json"), stats)
    dump_json(os.path.join(OUT, "validation.json"), {
        "generated_at": stats["generated_at"],
        "total_questions": len(questions),
        "issue_counts": {k: len(v) for k, v in issues.items()},
        "issues": issues,
    })

    print("题库构建完成：共 %d 题，年度 %s" % (
        len(questions), "、".join(str(m["year"]) for m in year_meta)))
    print("题型分布：", dict(type_c))
    print("校验：", {k: len(v) for k, v in issues.items()})


if __name__ == "__main__":
    main()
