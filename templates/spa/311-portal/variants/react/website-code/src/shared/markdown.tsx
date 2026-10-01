// src/shared/markdown.tsx
// Minimal Markdown rendering for server-supplied text.
//
// Everything here produces React nodes and never touches dangerouslySetInnerHTML, so text
// coming from Dataverse or the generative-AI summarization endpoints cannot inject markup.
// The supported grammar is intentionally tiny — **bold** and blank-line paragraph breaks —
// because that is all the article content and AI summaries emit. Widening it would add
// escaping surface for no benefit.

import type { ReactNode } from 'react'

/**
 * Render `**bold**` runs inside a single line of text.
 *
 * `String.split` with a capturing group alternates literal and captured segments, so every
 * odd-indexed part is the text that was wrapped in the delimiters. An unterminated `**` is
 * left as literal text, which is the desired degradation.
 */
export function renderInline(text: string): ReactNode[] {
  return text.split(/\*\*(.*?)\*\*/).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

interface SummaryMarkdownProps {
  text: string
  style?: React.CSSProperties
}

/**
 * Render a generative-AI summary: blank lines separate paragraphs, single newlines become
 * line breaks, and `**bold**` is honoured within each line.
 */
export function SummaryMarkdown({ text, style }: SummaryMarkdownProps) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return null

  return (
    <div style={style}>
      {paragraphs.map((paragraph, pi) => (
        <p
          key={pi}
          style={{ lineHeight: 1.7, margin: pi === paragraphs.length - 1 ? 0 : '0 0 12px' }}
        >
          {paragraph.split('\n').map((line, li, lines) => (
            <span key={li}>
              {renderInline(line)}
              {li < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
