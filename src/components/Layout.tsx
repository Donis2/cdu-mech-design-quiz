import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { GraduationCap, Home, PenSquare, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { questionsFile } from '@/lib/data'

const NAV = [
  { to: '/', label: '首页', icon: Home },
  { to: '/practice', label: '刷题', icon: PenSquare },
  { to: '/stats', label: '统计', icon: BarChart3 },
]

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">常大 855 机械设计基础</div>
              <div className="text-[11px] text-muted-foreground">考研真题刷题平台</div>
            </div>
          </div>

          <nav className="ml-4 flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive ||
                      (n.to === '/practice' && pathname.startsWith('/practice'))
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden text-xs text-muted-foreground sm:block">
            共 {questionsFile.meta.total_questions} 题 ·{' '}
            {questionsFile.meta.years.map((y) => `${y.year}年`).join(' / ')}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5">
        <Outlet />
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        题库由历年真题 PDF 逐页解析整理，题目版权归常州大学所有，仅供个人学习使用。
      </footer>
    </div>
  )
}
