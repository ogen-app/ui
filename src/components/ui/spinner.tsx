import { cn } from '@/lib'

/**
 * Which surface the line sits on. The default assumes an inverted one — it is
 * mostly worn by buttons, whose fill is `primary` — so anything drawing it on
 * an ordinary page passes `onSurface` rather than re-tinting by hand.
 */
type SpinnerTone = 'onPrimary' | 'onSurface'

const TONE: Record<SpinnerTone, string> = {
  onPrimary: 'bg-primary/20 before:bg-primary',
  onSurface: 'bg-primary-foreground/20 before:bg-primary-foreground',
}

export function Spinner({
  tone = 'onPrimary',
  className,
}: {
  tone?: SpinnerTone
  className?: string
}) {
  return (
    <div
      data-spinner
      className={cn(
        'relative w-6 h-[2px]',
        TONE[tone],
        "before:absolute before:content-['] before:inset-0 before:animate-[spinner-line_0.7s_cubic-bezier(0,0,0.03,0.9)_infinite]",
        className
      )}
    />
  )
}
