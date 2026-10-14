import questionsRaw from '../../data/questions.json'
import treeRaw from '../../data/knowledge_tree.json'
import statsRaw from '../../data/stats.json'
import type { KnowledgeTree, Question, QuestionsFile, StatsFile } from './types'

export const questionsFile = questionsRaw as unknown as QuestionsFile
export const knowledgeTree = treeRaw as unknown as KnowledgeTree
export const statsFile = statsRaw as unknown as StatsFile

export const questions: Question[] = questionsFile.questions

export const TYPE_LABELS = questionsFile.meta.type_labels

export const years: number[] = Array.from(
  new Set(questions.flatMap((q) => q.source_years)),
).sort((a, b) => a - b)

export const knowledgePoints: string[] = Array.from(
  new Set(questions.flatMap((q) => q.knowledge_points)),
)

/** 知识点 -> 章节 */
export const kpToChapter: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const ch of knowledgeTree.chapters) {
    for (const p of ch.points) m[p.name] = ch.name
  }
  return m
})()

/** 知识点 -> 题目数 */
export const kpCount: Record<string, number> = (() => {
  const m: Record<string, number> = {}
  for (const q of questions) {
    for (const kp of q.knowledge_points) m[kp] = (m[kp] ?? 0) + 1
  }
  return m
})()

export function getQuestion(id: string) {
  return questions.find((q) => q.id === id)
}

export function typesInUse(): string[] {
  return Array.from(new Set(questions.map((q) => q.type)))
}

export const sourceNote = questionsFile.meta.years
