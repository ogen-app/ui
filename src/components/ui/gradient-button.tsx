import {
  forwardRef,
  useId,
  type ComponentProps,
  type ComponentPropsWithoutRef,
} from 'react'
import { SparkleIcon, type Icon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'

/**
 * A Phosphor mark painted with the blue-to-green sweep, tipped with orange.
 *
 * An icon cannot be clipped to a CSS gradient the way text can (`.text-sweep`),
 * so the mark carries an SVG gradient of its own on the same tokens. One per
 * instance: an id shared across the page would resolve to whichever mark
 * mounted first, and vanish with it. React's ids carry colons, which a
 * `url(#…)` paint reference does not survive.
 */
export function GradientMark({
  icon: Mark = SparkleIcon,
  ...props
}: { icon?: Icon } & ComponentPropsWithoutRef<Icon>) {
  const gradient = `sweep-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  return (
    <Mark color={`url(#${gradient})`} aria-hidden {...props}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sweep-from)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--sweep-to)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sweep-splash)' }} />
        </linearGradient>
      </defs>
    </Mark>
  )
}

/**
 * An accented button: the default surface, with the sweep over its mark and
 * its label instead of a fill.
 *
 * For an action worth drawing the eye to without the weight of the filled
 * teal `accent` — the same rule applies, though: one on a screen, or the
 * colour stops meaning anything. The gradient is decoration; the label must
 * still say what the control does.
 */
export const GradientButton = forwardRef<
  HTMLButtonElement,
  Omit<ComponentProps<typeof Button>, 'variant'> & {
    /** The leading mark; a sparkle unless the control has its own icon. */
    icon?: Icon
  }
>(function GradientButton({ icon, children, ...props }, ref) {
  return (
    <Button ref={ref} variant="gradient" {...props}>
      {/* A control's own icon keeps the weight every button gives it; only
          the stand-in sparkle, which has no plain version to match, is
          filled. */}
      <GradientMark icon={icon} weight={icon ? undefined : 'fill'} />
      <span className="text-sweep">{children}</span>
    </Button>
  )
})
