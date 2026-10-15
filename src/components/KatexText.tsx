import * as React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { cn } from '@/lib/utils'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderKatex(tex: string, displayMode: boolean) {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
    })
  } catch {
    return escapeHtml(displayMode ? `$$${tex}$$` : `$${tex}$`)
  }
}

/**
 * 渲染带 $...$ / $$...$$ 公式的文本（KaTeX），其余部分按纯文本（含换行）显示。
 */
export function KatexText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const html = React.useMemo(() => {
    const parts = String(text ?? '').split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
    return parts
      .filter((p) => p !== '')
      .map((part) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          return renderKatex(part.slice(2, -2), true)
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          // 包一层横向滚动容器：窄屏长公式不撑破布局
          return `<span class="katex-inline-scroll">${renderKatex(part.slice(1, -1), false)}</span>`
        }
        return escapeHtml(part).replace(/\n/g, '<br/>')
      })
      .join('')
  }, [text])

  return <span className={cn('break-words', className)} dangerouslySetInnerHTML={{ __html: html }} />
}

/** 多行内容（解析 / 答案步骤）渲染 */
export function KatexBlock({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const lines = String(text ?? '').split('\n').filter((l) => l.trim() !== '')
  return (
    <div className={cn('space-y-1.5 leading-relaxed', className)}>
      {lines.map((l, i) => (
        <div key={i}>
          <KatexText text={l} />
        </div>
      ))}
    </div>
  )
}
