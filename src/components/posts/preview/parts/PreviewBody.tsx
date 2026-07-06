import { cn } from '@/lib'
import { toPlainText } from '@/lib/postValidation'

type Props = {
  content: string
  className?: string
}

// Renders post markdown as the plain text a reader sees — LinkedIn and
// Threads don't render markdown formatting, so plain text with the
// original line breaks is the faithful projection.
export function PreviewBody({ content, className }: Props) {
  const text = toPlainText(content).trim()
  if (!text) {
    return (
      <p className="text-[14px] text-tertiary-foreground">Nothing to preview yet…</p>
    )
  }
  return (
    <div
      className={cn(
        'text-[14px] leading-[1.45] text-foreground whitespace-pre-wrap break-words',
        className,
      )}
    >
      {text}
    </div>
  )
}
