import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib'
import type { PlatformInfo } from '@/lib/platformDictionary'

/**
 * A connected social account's picture, with the platform it belongs to marked
 * in the corner.
 *
 * Round, unlike the app's own `Avatar` default: these are people's and pages'
 * profile pictures as the platform itself draws them, and the round crop is
 * what makes the square platform badge read as a badge rather than as part of
 * the image.
 *
 * The initial is a fallback, not the design. Radix only swaps it in once the
 * image has actually failed, so a letter tile on screen means the URL was
 * empty or the request was refused — worth knowing when one shows up.
 */
type Size = 'sm' | 'md'

const SIZES: Record<Size, { root: string; badge: string; icon: string }> = {
  sm: { root: 'size-6', badge: 'size-3.5 rounded-[4px]', icon: 'size-2.5' },
  md: { root: 'size-10', badge: 'size-[18px] rounded-[5px]', icon: 'size-3' },
}

export function AccountAvatar({
  src,
  name,
  platform,
  size = 'md',
  className,
}: {
  src?: string | null
  /** Used for the fallback initial only — the name is always beside it. */
  name: string
  /** Omit to draw the picture without a platform badge. */
  platform?: PlatformInfo
  size?: Size
  className?: string
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase()
  const s = SIZES[size]
  const Icon = platform?.icon

  return (
    <span className={cn('relative inline-flex shrink-0', s.root, className)}>
      <Avatar className="size-full rounded-full">
        {src && (
          // Profile CDNs (Facebook's and Instagram's especially) refuse
          // requests that carry a referrer they don't recognise, which lands
          // as a plain load error and silently drops us to the initial.
          <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />
        )}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      {Icon && (
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 flex items-center justify-center ring-2 ring-primary',
            s.badge,
          )}
          // Brand colours, like everywhere else the platform icons appear
          // (`PlatformInfo.color`): a network's mark is its own, and a
          // semantic token would repaint it. The glyph is knocked out white
          // against it rather than themed, for the same reason.
          style={{ background: platform.color }}
          aria-hidden
        >
          <Icon className={s.icon} weight="fill" style={{ color: '#ffffff' }} />
        </span>
      )}
    </span>
  )
}
