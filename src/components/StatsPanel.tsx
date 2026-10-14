import { Target, TrendingUp, BookOpen, ListChecks } from 'lucide-react'
import type { ProgressMap, SessionState } from '@/lib/storage'
import type { Question } from '@/lib/types'
import { cn, pct, typeLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function StatsPanel({
  list,
  allAnswered,
  progress,
  currentIndex,
  session,
}: {
  list: Question[]
  allAnswered: Question[]
  progress: ProgressMap
  currentIndex: number
  session: SessionState
}) {
  const stats = computeStats(list, allAnswered, progress)
  const done = list.filter((q) => (progress[q.id]?.attempts ?? 0) > 0).length

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">本次练习</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">进度</span>
            <span className="font-semibold tabular-nums">
              {currentIndex + 1} / {list.length}
            </span>
          </div>
          <Progress value={list.length ? ((currentIndex + 1) / list.length) * 100 : 0} />
          <div className="grid grid-cols-2 gap-2 text-center">
            <Metric label="已作答" value={`${done}`} />
            <Metric
              label="正确率"
              value={stats.attempts ? `${pct(stats.correct, stats.attempts)}%` : '—'}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            当前模式：{modeText(session)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ListChecks className="h-4 w-4" /> 全库统计
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row icon={<Target className="h-3.5 w-3.5" />} label="题目总数" value={`${allAnswered.length}`} />
          <Row
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="累计作答次数"
            value={`${stats.totalAttempts}`}
          />
          <Row
            icon={<Target className="h-3.5 w-3.5" />}
            label="总正确率"
            value={stats.totalAttempts ? `${pct(stats.totalCorrect, stats.totalAttempts)}%` : '—'}
          />
          <Row
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="错题本"
            value={`${Object.values(progress).filter((r) => r.inWrongBook).length}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">按题型正确率</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {stats.byType.length === 0 && (
            <p className="text-xs text-muted-foreground">暂无作答记录</p>
          )}
          {stats.byType.map((t) => (
            <div key={t.type} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{typeLabel(t.type)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {t.correct}/{t.attempts} · {pct(t.correct, t.attempts)}%
                </span>
              </div>
              <Progress
                value={pct(t.correct, t.attempts)}
                className="h-1.5"
                indicatorClassName={cn(
                  pct(t.correct, t.attempts) >= 80
                    ? 'bg-emerald-500'
                    : pct(t.correct, t.attempts) >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500',
                )}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function computeStats(list: Question[], all: Question[], progress: ProgressMap) {
  let attempts = 0
  let correct = 0
  let totalAttempts = 0
  let totalCorrect = 0
  const byType: Record<string, { attempts: number; correct: number; type: string }> = {}

  for (const q of list) {
    const r = progress[q.id]
    if (!r) continue
    attempts += r.attempts
    correct += r.correctCount
    byType[q.type] ??= { attempts: 0, correct: 0, type: q.type }
    byType[q.type].attempts += r.attempts
    byType[q.type].correct += r.correctCount
  }
  for (const q of all) {
    const r = progress[q.id]
    if (!r) continue
    totalAttempts += r.attempts
    totalCorrect += r.correctCount
  }
  return {
    attempts,
    correct,
    totalAttempts,
    totalCorrect,
    byType: Object.values(byType).sort((a, b) => b.attempts - a.attempts),
  }
}

function modeText(s: SessionState) {
  const parts: string[] = []
  parts.push(s.order === 'random' ? '随机' : '顺序')
  if (s.wrongOnly) parts.push('错题')
  if (s.favoriteOnly) parts.push('收藏')
  if (s.yearFilter.length) parts.push(s.yearFilter.join('/') + '年')
  return parts.join(' · ')
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/70 px-2 py-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
