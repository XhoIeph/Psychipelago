export function LeadEvidence({ sourceLabel, url, quote, contextNote, fullText }: {
  sourceLabel: string
  url: string
  quote: string
  contextNote?: string
  fullText?: string
}) {
  return (
    <div className="tc-evidence">
      <a className="tc-evidence-source" href={url} target="_blank" rel="nofollow noopener noreferrer">
        {sourceLabel}
      </a>
      {contextNote && <p className="tc-small tc-muted">{contextNote}</p>}
      <blockquote className="tc-quote">{quote}</blockquote>
      {fullText && fullText !== quote && (
        <details>
          <summary>展开原文</summary>
          <blockquote className="tc-quote">{fullText}</blockquote>
        </details>
      )}
    </div>
  )
}
