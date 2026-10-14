import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Shuffle, ListOrdered, Sparkles, Star, AlertCircle } from 'lucide-react'
import { questions } from '@/lib/data'
import { filterQuestions, modeLabel } from '@/lib/quiz'
import {
  defaultSession,
  loadSession,
  saveSession,
  useProgress,
  type SessionState,
} from '@/lib/storage'
import { cn, typeLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilterSidebar } from '@/components/FilterSidebar'
import { QuestionCard } from '@/components/QuestionCard'
import { AnswerSheet } from '@/components/AnswerSheet'
import { StatsPanel } from '@/components/StatsPanel'

export function Practice() {
  const progress = useProgress()
  const [params, setParams] = useSearchParams()
  const [session, setSession] = React.useState<SessionState>(() => loadSession())
  const appliedRef = React.useRef(false)

  // 从首页入口跳转时带上筛选参数
  React.useEffect(() => {
    if (appliedRef.current) return
    if ([...params.keys()].length === 0) return
    appliedRef.current = true
    const next: SessionState = { ...defaultSession }
    const year = params.get('year')
    const type = params.get('type')
    const kp = params.get('kp')
    const mode = params.get('mode')
    if (year) next.yearFilter = year.split(',').map(Number)
    if (type) next.typeFilter = type.split(',')
    if (kp) next.kpFilter = kp.split(',')
    if (mode === 'wrong') next.wrongOnly = true
    if (mode === 'favorite') next.favoriteOnly = true
    if (mode === 'random') next.order = 'random'
    setSession(next)
    saveSession(next)
    setParams({}, { replace: true })
  }, [params, setParams])

  const patch = React.useCallback(
    (p: Partial<SessionState>) => {
      setSession((prev) => {
        const next = { ...prev, ...p }
        saveSession(next)
        return next
      })
    },
    [],
  )

  const list = React.useMemo(
    () => filterQuestions(session, progress, questions),
    [session, progress],
  )

  const index = Math.min(session.index, Math.max(0, list.length - 1))
  const current = list[index]

  React.useEffect(() => {
    if (index !== session.index) patch({ index })
  }, [index, session.index, patch])

  const jump = (i: number) => patch({ index: Math.max(0, Math.min(list.length - 1, i)) })

  return (
    <div className="space-y-4">
      {/* 顶部模式条 */}
      <div className="sticky top-14 z-20 -mx-4 border-b bg-background/95 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="text-xs">
            {modeLabel(session)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            第{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {list.length ? index + 1 : 0}
            </span>{' '}
            / {list.length} 题
          </span>

          <div className="ml-2 flex flex-wrap items-center gap-1.5">
            <Preset
              icon={<ListOrdered className="h-3.5 w-3.5" />}
              label="顺序练习"
              active={!session.order || (session.order === 'order' && !session.wrongOnly && !session.favoriteOnly)}
              onClick={() =>
                patch({ ...defaultSession, order: 'order', index: 0 })
              }
            />
            <Preset
              icon={<Shuffle className="h-3.5 w-3.5" />}
              label="随机练习"
              active={session.order === 'random'}
              onClick={() => patch({ order: 'random', index: 0 })}
            />
            <Preset
              icon={<AlertCircle className="h-3.5 w-3.5" />}
              label="错题重做"
              active={session.wrongOnly}
              onClick={() => patch({ wrongOnly: true, favoriteOnly: false, index: 0 })}
            />
            <Preset
              icon={<Star className="h-3.5 w-3.5" />}
              label="我的收藏"
              active={session.favoriteOnly}
              onClick={() => patch({ favoriteOnly: true, wrongOnly: false, index: 0 })}
            />
            <Preset
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="按题型"
              active={session.typeFilter.length > 0}
              onClick={() => patch({ typeFilter: ['single_choice'], index: 0 })}
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => jump(index - 1)}
              disabled={index <= 0}
            >
              <ChevronLeft className="mr-0.5 h-4 w-4" /> 上一题
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => jump(index + 1)}
              disabled={index >= list.length - 1}
            >
              下一题 <ChevronRight className="ml-0.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* 左：筛选 */}
        <aside className="order-2 lg:order-1">
          <FilterSidebar
            session={session}
            patch={patch}
            progress={progress}
            onReset={() => patch({ ...defaultSession })}
          />
        </aside>

        {/* 中：题目 */}
        <section className="order-1 lg:order-2">
          {current ? (
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <QuestionCard
                key={current.id}
                question={current}
                record={progress[current.id]}
              />
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">
                {session.wrongOnly
                  ? '错题本还是空的 —— 去刷题吧，答错的题会自动收进这里。'
                  : session.favoriteOnly
                    ? '还没有收藏任何题目，点击题目右上角的 ★ 即可收藏。'
                    : '当前筛选条件下没有题目，试试放宽筛选。'}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => patch({ ...defaultSession })}
              >
                重置筛选
              </Button>
            </div>
          )}

          {current && list.length > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => jump(index - 1)} disabled={index <= 0}>
                <ChevronLeft className="mr-0.5 h-4 w-4" /> 上一题
              </Button>
              <span className="text-xs text-muted-foreground">
                {current.source_years.map((y) => `${y}年`).join(' / ')} ·{' '}
                {typeLabel(current.type)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => jump(index + 1)}
                disabled={index >= list.length - 1}
              >
                下一题 <ChevronRight className="ml-0.5 h-4 w-4" />
              </Button>
            </div>
          )}
        </section>

        {/* 右：答题卡 + 统计 */}
        <aside className="order-3 space-y-3">
          <AnswerSheet
            list={list}
            currentIndex={index}
            progress={progress}
            onJump={jump}
          />
          <StatsPanel
            list={list}
            allAnswered={questions}
            progress={progress}
            currentIndex={index}
            session={session}
          />
        </aside>
      </div>
    </div>
  )
}

function Preset({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:border-primary/40 hover:bg-accent',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
