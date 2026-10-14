import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TYPE_LABELS: Record<string, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  fill_blank: '填空题',
  true_false: '判断题',
  short_answer: '简答题',
  calculation: '计算题',
}

export const TYPE_ORDER = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'fill_blank',
  'short_answer',
  'calculation',
]

export function typeLabel(t: string) {
  return TYPE_LABELS[t] ?? t
}

/** 是否为客观题（点击选项即时判分） */
export function isObjective(t: string) {
  return t === 'single_choice' || t === 'multiple_choice' || t === 'true_false'
}

export function formatTs(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function pct(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 100)
}

/** 题库图片路径需要编码（文件名含中文） */
export function imgUrl(p: string) {
  return encodeURI(p)
}
