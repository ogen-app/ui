import { cn } from '@/lib'
import { emphasisParts } from '@/lib/qualityEmphasis'

/**
 * A model-written sentence with its one essential phrase drawn out (CON-443):
 * the phrase semibold in foreground ink, the rest in secondary ink. The
 * contrast does the work — bold at one ink made every paragraph look
 * half-shouted, while two inks let a reader take in only the semibold phrases.
 *
 * The phrase is the one the model wrapped in `**…**`. Text with no clean mark —
 * every row stored before the prompt asked for one — renders as it always did:
 * one run in `className`'s ink, with any stray asterisks removed. That is why
 * this needs no flag: until the API marks a phrase, nothing changes.
 */
export function EmphasisText({
  text,
  className,
}: {
  text: string
  /** The paragraph's type and its unemphasised ink. */
  className?: string
}) {
  const parts = emphasisParts(text)

  if (!parts.some((part) => part.strong)) {
    return <p className={className}>{parts[0]?.text ?? ''}</p>
  }

  return (
    <p className={cn(className, 'text-secondary-foreground')}>
      {parts.map((part, i) =>
        part.strong ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  )
}
