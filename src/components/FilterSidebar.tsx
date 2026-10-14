import * as React from 'react'
import { RotateCcw, Search, Filter } from 'lucide-react'
import { knowledgeTree, questions } from '@/lib/data'
import type { ProgressMap, SessionState } from '@/lib/storage'
import { TYPE_ORDER, cn, typeLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function useCounts() {
  return React.useMemo(() => {
    const byType: Record<string, number> = {}
    const byYear: Record<string, number> = {}
    const byKp: Record<string, number> = {}
    for (const q of questions) {
      byType[q.type] = (byType[q.type] ?? 0) + 1
      for (const y of q.source_years) byYear[y] = (byYear[y] ?? 0) + 1
      for (const k of q.knowledge_points) byKp[k] = (byKp[k] ?? 0) + 1
    }
    return { byType, byYear, byKp }
  }, [])
}

export function FilterSidebar({
  session,
  patch,
  onReset,
  progress,
}: {
  session: SessionState
  patch: (p: Partial<SessionState>) => void
  onReset: () => void
  progress: ProgressMap
}) {
  const counts = useCounts()
  const [kpQuery, setKpQuery] = React.useState('')
  const [openChapters, setOpenChapters] = React.useState<string[]>([])

  const wrongCount = React.useMemo(
    () => Object.values(progress).filter((r) => r.inWrongBook).length,
    [progress],
  )
  const favCount = React.useMemo(
    () => Object.values(progress).filter((r) => r.favorite).length,
    [progress],
  )

  const years = React.useMemo(
    () => Array.from(new Set(questions.flatMap((q) => q.source_years))).sort(),
    [],
  )

  const filteredChapters = React.useMemo(() => {
    if (!kpQuery.trim()) return knowledgeTree.chapters
    const kw = kpQuery.trim()
    return knowledgeTree.chapters
      .map((ch) => ({
        ...ch,
        points: ch.points.filter(
          (p) => p.name.includes(kw) || ch.name.includes(kw),
        ),
      }))
      .filter((ch) => ch.points.length > 0)
  }, [kpQuery])

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" /> 筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 错题 / 收藏 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => patch({ wrongOnly: !session.wrongOnly, favoriteOnly: false, index: 0 })}
              className={cn(
                'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                session.wrongOnly
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'hover:bg-accent',
              )}
            >
              错题本 {wrongCount}
            </button>
            <button
              onClick={() => patch({ favoriteOnly: !session.favoriteOnly, wrongOnly: false, index: 0 })}
              className={cn(
                'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                session.favoriteOnly
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'hover:bg-accent',
              )}
            >
              收藏 {favCount}
            </button>
          </div>

          {/* 年份 */}
          <Section title="年份">
            <div className="flex flex-wrap gap-1.5">
              {years.map((y) => (
                <Chip
                  key={y}
                  active={session.yearFilter.includes(y)}
                  onClick={() =>
                    patch({ yearFilter: toggle(session.yearFilter, y), index: 0 })
                  }
                >
                  {y}年 <span className="opacity-60">{counts.byYear[y] ?? 0}</span>
                </Chip>
              ))}
            </div>
          </Section>

          {/* 题型 */}
          <Section title="题型">
            <div className="flex flex-wrap gap-1.5">
              {TYPE_ORDER.filter((t) => counts.byType[t]).map((t) => (
                <Chip
                  key={t}
                  active={session.typeFilter.includes(t)}
                  onClick={() =>
                    patch({ typeFilter: toggle(session.typeFilter, t), index: 0 })
                  }
                >
                  {typeLabel(t)} <span className="opacity-60">{counts.byType[t]}</span>
                </Chip>
              ))}
            </div>
          </Section>

          <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> 清空筛选
          </Button>
        </CardContent>
      </Card>

      {/* 知识点 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            知识点（按考纲章节）
            {session.kpFilter.length > 0 && (
              <span className="ml-2 text-xs font-normal text-primary">
                已选 {session.kpFilter.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={kpQuery}
              onChange={(e) => setKpQuery(e.target.value)}
              placeholder="搜索知识点 / 章节"
              className="h-9 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {session.kpFilter.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {session.kpFilter.map((k) => (
                <Badge
                  key={k}
                  variant="info"
                  className="cursor-pointer"
                  onClick={() =>
                    patch({ kpFilter: session.kpFilter.filter((x) => x !== k), index: 0 })
                  }
                >
                  {k} ✕
                </Badge>
              ))}
            </div>
          )}

          <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
            {filteredChapters.map((ch) => {
              const open = openChapters.includes(ch.id) || !!kpQuery.trim()
              const selectedInCh = ch.points.filter((p) =>
                session.kpFilter.includes(p.name),
              ).length
              return (
                <div key={ch.id} className="rounded-md border">
                  <button
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-medium hover:bg-accent"
                    onClick={() =>
                      setOpenChapters((prev) =>
                        prev.includes(ch.id)
                          ? prev.filter((x) => x !== ch.id)
                          : [...prev, ch.id],
                      )
                    }
                  >
                    <span className="flex-1">{ch.name}</span>
                    {selectedInCh > 0 && <Badge variant="info">{selectedInCh}</Badge>}
                    <Badge variant={ch.questionCount ? 'secondary' : 'outline'}>
                      {ch.questionCount}
                    </Badge>
                  </button>
                  {open && ch.points.length > 0 && (
                    <div className="space-y-0.5 border-t px-1.5 py-1.5">
                      {ch.points.map((p) => (
                        <button
                          key={p.id}
                          onClick={() =>
                            patch({
                              kpFilter: toggle(session.kpFilter, p.name),
                              index: 0,
                            })
                          }
                          className={cn(
                            'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs',
                            session.kpFilter.includes(p.name)
                              ? 'bg-primary/10 font-medium text-primary'
                              : 'hover:bg-accent',
                            p.questionCount === 0 && 'opacity-60',
                          )}
                        >
                          <span className="flex-1">{p.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {p.questionCount}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'hover:border-primary/40 hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}
