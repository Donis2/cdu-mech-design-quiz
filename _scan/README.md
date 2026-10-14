# _scan —— 扫描件解析工作目录

本目录存放「把扫描版 PDF 变成结构化题库」的辅助脚本与中间产物。

## 目录用途

| 文件 | 作用 |
|---|---|
| `render.py` | 用 PyMuPDF 把 4 个 PDF 逐页渲染成高清 PNG（2.2×），输出到本目录 |
| `bands.py` | 检测页面中的内容区块（按行墨迹分布找空白间隔），用于定位图形所在的行范围 |
| `crop.py` | 按人工确认的行范围裁切出题图 / 答案图，输出到 `public/images/questions/` |
| `*.png` | 中间产物（页面渲染图），可从 PDF 重新生成，**不参与构建** |

## 复现流程

```bash
# 0. 准备 Python 环境（含 pymupdf / pillow / numpy）
# 1. 渲染 PDF 每页为 PNG
python _scan/render.py
# 2. 查看页面内容区块行范围（用于确定裁切边界）
python _scan/bands.py paper2024_p2.png paper2025_p6.png ...
# 3. 按 crop.py 中定义的坐标裁切题图
python _scan/crop.py
```

> 注意：`crop.py` 中的裁切坐标是针对当前 4 份 PDF 的人工确认值。
> 新增试卷时需要先用 `render.py` 渲染、用 `bands.py` 查看区块、再补充裁切坐标。
> 若新试卷是**可提取文本的电子版 PDF**，则无需本目录，直接文本转录即可。

## 为什么不用 OCR

4 份 PDF 均为纯图像扫描件。OCR 对工程图、公式、上下标（如 `z₂′`、`F_a3`、`d₁`）识别错误率高，
因此采用「高清渲染 + 人工识读」的方式转录，正确率更高。后续试卷量增大时建议引入带公式识别的 OCR + 人工校对。
