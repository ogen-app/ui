import { Fragment } from 'react'
import { cn } from '@/lib'
import { summaryParts } from '@/lib/assetAnalysis'
import { parseAssistantMarkup, type InlineSpan } from '@/lib/assistantMarkup'

/**
 * The summary, as the light Markdown the model writes it in: paragraphs,
 * lists, bold — read with the assistant's own parser rather than an editor.
 */
export function SummaryText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-7 text-foreground">
      {summaryParts(text).map((part, i) =>
        part.kind === 'heading' ? (
          <p
            key={i}
            role="heading"
            aria-level={Math.min(part.level + 2, 6)}
            className={cn(
              'font-semibold text-foreground',
              part.level <= 2 ? 'text-base' : 'text-[15px]',
            )}
          >
            <HeadingSpans text={part.text} />
          </p>
        ) : (
          <MarkupBlocks key={i} text={part.text} />
        ),
      )}
    </div>
  )
}

/** A heading's own inline markup — `## **Bold** title` — read like a line. */
function HeadingSpans({ text }: { text: string }) {
  const [block] = parseAssistantMarkup(text)
  return block?.kind === 'paragraph' ? (
    <Spans spans={block.spans} />
  ) : (
    <>{text}</>
  )
}

function MarkupBlocks({ text }: { text: string }) {
  return (
    <>
      {parseAssistantMarkup(text).map((block, i) =>
        block.kind === 'paragraph' ? (
          <p key={i}>
            <Spans spans={block.spans} />
          </p>
        ) : block.ordered ? (
          <ol key={i} className="flex list-decimal flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ol>
        ) : (
          <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  )
}

export function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.bold ? (
          <strong key={i} className="font-semibold">
            {span.text}
          </strong>
        ) : (
          <Fragment key={i}>{span.text}</Fragment>
        ),
      )}
    </>
  )
}

/**
 * The summary's lead: its first paragraph's text, past any heading — what the
 * reading shows at rest (CON-369), clamped to four lines by the caller.
 * Empty when the summary has no paragraph to lead with.
 */
export function SummaryLead({ text }: { text: string }) {
  const first = summaryParts(text).find((part) => part.kind === 'text')
  const block = first ? parseAssistantMarkup(first.text)[0] : undefined
  if (!block) return null
  const spans =
    block.kind === 'paragraph' ? block.spans : (block.items[0] ?? [])
  return <Spans spans={spans} />
}
