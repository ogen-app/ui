import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib'

const textareaVariants = cva(
  // Regular, not the 500 the single-line `Input` carries. A textarea holds
  // prose — a brief's audience and tone run to paragraphs — and a paragraph
  // set at 500 reads as emphasis applied to everything, which is a wall. The
  // weight difference between the two controls is not an inconsistency: an
  // input's value is a short label the eye picks out of a form, a textarea's
  // is text the user actually reads.
  'text-[14px] font-normal ' +
    'placeholder:text-tertiary-foreground selection:bg-selection/20 border-input flex w-full min-w-0 bg-transparent ' +
    'transition-[color,border-color,box-shadow] duration-300 outline-none resize-none overflow-hidden ' +
    'disabled:pointer-events-none disabled:cursor-not-allowed ' +
    // Read-only reads as plain text: no field fill, and no dimming — the value
    // is content, not a disabled control. Keyed off the attribute rather than
    // :read-only, which CSS also matches on merely disabled inputs.
    '[&:disabled:not([readonly])]:opacity-50 [&[readonly]]:bg-transparent',
  {
    variants: {
      variant: {
        primary:
          'bg-input-secondary rounded-none border-b-2 border-quaternary px-4 py-2 shadow-none focus-visible:border-foreground aria-invalid:border-destructive',
        default:
          'bg-input rounded-none border-b-1 border-quaternary px-4 py-2 shadow-none focus-visible:border-foreground aria-invalid:border-destructive',
      },
      rows: {
        sm: 'min-h-16',
        default: 'min-h-24',
        lg: 'min-h-40',
      },
    },
    defaultVariants: {
      variant: 'default',
      rows: 'default',
    },
  },
)

function resize(el: HTMLTextAreaElement | null) {
  if (!el) return
  // Collapse to nothing before measuring, not to `auto`: `auto` on a textarea
  // is its `rows` attribute (2 by default), which would floor every empty box
  // at two lines. `min-h-*` from the `rows` variant still wins over the 0.
  el.style.height = '0px'
  el.style.height = `${el.scrollHeight}px`
}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>
>(
  (
    { className, variant, rows, onChange, value, defaultValue, ...props },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

    React.useImperativeHandle(
      ref,
      () => innerRef.current as HTMLTextAreaElement,
      [],
    )

    React.useLayoutEffect(() => {
      resize(innerRef.current)
    }, [value, defaultValue])

    // A narrower box wraps the same text into more lines, so the autosized
    // height is only right for the width it was measured at. Width-only: the
    // height changes are ours, and re-measuring on them would loop.
    React.useEffect(() => {
      const el = innerRef.current
      if (!el) return
      let last = el.clientWidth
      const observer = new ResizeObserver(() => {
        if (el.clientWidth === last) return
        last = el.clientWidth
        resize(el)
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    return (
      <textarea
        ref={innerRef}
        data-slot="textarea"
        className={cn(textareaVariants({ variant, rows, className }))}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => {
          resize(e.currentTarget)
          onChange?.(e)
        }}
        {...props}
      />
    )
  },
)

Textarea.displayName = 'Textarea'

// eslint-disable-next-line react-refresh/only-export-components
export { Textarea, textareaVariants }
