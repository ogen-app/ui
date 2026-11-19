import { WarningCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import {
  worstWarning,
  type PostWarning,
  type PostWarningLevel,
} from '@/lib/postWarnings'

/**
 * One glyph per level, so the column reads at a glance: red where the post
 * will not go out as it stands, amber where it will but something is off, and
 * a quieter amber outline for what is only worth knowing.
 */
export function WarningGlyph({
  level,
  className,
}: {
  level: PostWarningLevel
  className?: string
}) {
  if (level === 'blocking')
    return (
      <WarningCircleIcon
        aria-hidden
        weight="fill"
        className={cn('size-4.5 text-destructive', className)}
      />
    )
  return (
    <WarningIcon
      aria-hidden
      weight={level === 'warning' ? 'fill' : 'bold'}
      className={cn('size-4.5 text-warning', className)}
    />
  )
}

/**
 * A posts-list row's Warnings cell: the mark for its worst warning, as the
 * button that opens the drawer listing them all. Nothing at all for a post
 * with none — an empty cell is the all-clear.
 */
export function PostWarningsMark({
  warnings,
  label,
  pressed,
  onPress,
}: {
  warnings: readonly PostWarning[]
  /** Read aloud and on hover: how many, on which post. */
  label: string
  pressed: boolean
  onPress: () => void
}) {
  const level = worstWarning(warnings)
  if (!level) return null
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onPress()
      }}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'flex size-7 items-center justify-center rounded-sm transition-colors hover:bg-secondary',
        pressed && 'bg-secondary',
      )}
    >
      <WarningGlyph level={level} />
    </button>
  )
}
