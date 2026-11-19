import { WarningIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { worstWarning, type PostWarning } from '@/lib/postWarnings'

/**
 * Every warning wears the same orange triangle, whatever its level — the
 * column is one signal, "something here needs a look", and the drawer says
 * how much. The level only orders the drawer's list.
 */
export function WarningGlyph({ className }: { className?: string }) {
  return (
    <WarningIcon
      aria-hidden
      weight="fill"
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
  if (!worstWarning(warnings)) return null
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
      <WarningGlyph />
    </button>
  )
}
