export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'fill_blank'
  | 'true_false'
  | 'short_answer'
  | 'calculation'

export interface Option {
  key: string
  text: string
}

export interface Question {
  id: string
  source_years: number[]
  source: string
  type: QuestionType
  stem: string
  options: Option[]
  /** 选择/多选：["A"]；判断：[true]；填空：["a","b"]；简答：字符串；计算：步骤数组 */
  answer: string[] | string | boolean[]
  explanation?: string
  knowledge_points: string[]
  chapter?: string
  difficulty?: string
  score?: number
  images: string[]
  answer_images: string[]
  original_numbers: Record<string, string>
  tags: string[]
  merge_key?: string
}

export interface QuestionsFile {
  meta: {
    subject: string
    school: string
    generated_at: string
    total_questions: number
    type_labels: Record<string, string>
    years: {
      year: number
      source: string
      paper_file: string
      answer_file: string
      note: string
      count: number
    }[]
  }
  questions: Question[]
}

export interface KnowledgePoint {
  id: string
  name: string
  questionCount: number
  questionIds: string[]
}

export interface Chapter {
  id: string
  name: string
  points: KnowledgePoint[]
  questionCount: number
}

export interface KnowledgeTree {
  subject: string
  school: string
  outline_source: string
  exam: {
    duration_minutes: number
    total_score: number
    question_types: string[]
    calculator_allowed: boolean
    references: string[]
  }
  chapters: Chapter[]
  total_questions: number
}

export interface StatsFile {
  generated_at: string
  subject: string
  total_questions: number
  total_score: number
  by_year: { year: number; count: number; types: Record<string, number> }[]
  by_type: { type: string; label: string; count: number; score: number }[]
  by_difficulty: { difficulty: string; count: number }[]
  by_chapter: { chapter: string; count: number }[]
  knowledge_point_ranking: { name: string; chapter: string; count: number }[]
  calculation_analysis: {
    total: number
    score: number
    by_knowledge_point: { name: string; chapter: string; count: number }[]
    by_type_shape: { shape: string; count: number }[]
  }
  accuracy_stats: { note: string }
}

/** 本地答题记录 */
export interface ProgressRecord {
  questionId: string
  attempts: number
  correctCount: number
  wrongCount: number
  /** 是否在错题本中 */
  inWrongBook: boolean
  favorite: boolean
  lastCorrect: boolean | null
  lastUserAnswer: unknown
  lastTs: number
}
