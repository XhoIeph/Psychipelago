'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'

/**
 * 线索原文与出处。
 *
 * 折叠态固定 3 行（小雨 11-09 的要求），卡片高度不再随原文长短变化；
 * 只有内容真的被截断、或另有更长的 fullText 时才出现「展开原文」。
 * 用 ResizeObserver 量 scrollHeight 而不是按字数猜，窄屏换行多也能判准。
 */
export function LeadEvidence({ sourceLabel, url, quote, contextNote, fullText }: {
  sourceLabel: string
  url: string
  quote: string
  contextNote?: string
  fullText?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const quoteRef = useRef<HTMLQuoteElement>(null)
  const hasFullText = Boolean(fullText && fullText !== quote)

  useLayoutEffect(() => {
    const node = quoteRef.current
    if (!node || expanded) return
    const check = () => setOverflowing(node.scrollHeight > node.clientHeight + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(node)
    return () => observer.disconnect()
  }, [quote, expanded])

  const canExpand = hasFullText || overflowing
  const body = hasFullText ? (fullText as string) : quote

  return (
    <div className="tc-evidence">
      <blockquote ref={quoteRef} className={expanded ? 'tc-quote' : 'tc-quote is-clamped'}>
        {expanded ? body : quote}
      </blockquote>
      <a className="tc-evidence-source" href={url} target="_blank" rel="nofollow noopener noreferrer">
        <FileText aria-hidden="true" />
        {sourceLabel}
      </a>
      {contextNote && <p className="tc-small tc-muted">{contextNote}</p>}
      {canExpand && (
        <button
          type="button"
          className="tc-quote-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? '收起原文' : '展开原文'}
        </button>
      )}
    </div>
  )
}
