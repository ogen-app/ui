import { cn } from '@/lib'
import { identityAbbr, identityColorVar } from '@/lib/identity.ts'

/**
 * A workspace's identity mark: a filled square carrying its abbreviation, in
 * the hue hashed from its id (`lib/identity.ts`).
 *
 * Square on purpose. The user's own avatar is the round-ish portrait slot, and
 * this sits on top of it in the sidebar — if both were the same shape the
 * badge would read as part of the person rather than as the place they're
 * working. The same square then repeats in the account menu and on the
 * workspace list, so one glyph means "workspace" everywhere.
 *
 * The caller sizes it (`size-*`, `text-*`); the letters are knocked out in the
 * app background, which is what the seven hues were tuned to carry.
 */
export function WorkspaceMark({
  id,
  name,
  className,
}: {
  id: string
  name: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: identityColorVar(id) }}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center font-grotesk text-[10px] font-bold leading-none uppercase text-primary',
        className,
      )}
    >
      {identityAbbr(name)}
    </span>
  )
}
