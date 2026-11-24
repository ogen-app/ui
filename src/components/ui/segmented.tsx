import { useRef, type KeyboardEvent } from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib'

const trackVariants = cva(
  'flex rounded-md bg-quaternary p-1 gap-1 select-none',
  {
    variants: {
      size: {
        // Tabs' `segmented`: a 40px track, 32px segments.
        default: 'h-10',
        // Inside a card's head or a filter panel, where 40px is taller than
        // the line it sits on.
        sm: 'h-8',
      },
      fill: { true: 'w-full', false: 'w-fit' },
    },
    defaultVariants: { size: 'default', fill: false },
  },
)

const segmentVariants = cva(
  'flex-1 cursor-pointer whitespace-nowrap rounded-md px-3 text-control font-medium tabular-nums transition-colors outline-none ' +
    'focus-visible:inset-ring-[2px] focus-visible:inset-ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: { default: 'h-8', sm: 'h-6' },
      on: {
        true: 'bg-primary text-primary-foreground',
        false: 'text-secondary-foreground hover:text-foreground',
      },
    },
    defaultVariants: { size: 'default', on: false },
  },
)

/**
 * One choice of a few, every option on screen: the segmented look (Tabs'
 * `segmented`) over a radio group's semantics. A tab list announces panels
 * that switch, which a mode or a count is not; when the choice does switch
 * panels, use `Tabs` with `variant="segmented"` instead.
 *
 * Arrow keys move the choice and the focus together, as a radio group's do.
 */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = 'default',
  fill = false,
  className,
  ...aria
}: {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  size?: 'default' | 'sm'
  /** Stretch across the container, the segments sharing it equally. */
  fill?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (step === 0) return
    e.preventDefault()
    const next = Math.min(options.length - 1, Math.max(0, index + step))
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="radiogroup"
      {...aria}
      className={cn(trackVariants({ size, fill }), className)}
    >
      {options.map((o, index) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => move(e, index)}
            className={segmentVariants({ size, on })}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
