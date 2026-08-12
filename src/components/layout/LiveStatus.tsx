import { CloudSlashIcon, CloudArrowDownIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { QUIET_ATTEMPTS, useEventStreamStore } from '@/stores/eventStreamStore'

/**
 * Says when the live channel is down.
 *
 * The event stream is what keeps a screen honest about work happening
 * elsewhere — a teammate's edit, a publish landing, an account dropping out.
 * When it is gone, nothing on screen looks any different, and that is the
 * problem: the app would go on presenting minutes-old data with the same
 * confidence as live data. This is the only thing that tells you not to trust
 * what you're reading.
 *
 * Which is also why there is no "connected" state. A green light people learn
 * to ignore doesn't make its red twin any louder — being silent while healthy
 * is what makes the warning mean something.
 */
export function LiveStatus({ isCollapsed }: { isCollapsed: boolean }) {
  const status = useEventStreamStore((s) => s.status)
  const attempts = useEventStreamStore((s) => s.attempts)
  const reconciling = useEventStreamStore((s) => s.reconciling)

  // A blip resolves inside the first couple of backoff steps; announcing those
  // would train people to ignore the one that doesn't.
  const dropped = status === 'reconnecting' && attempts >= QUIET_ATTEMPTS
  if (!dropped && !reconciling) return null

  const Icon = reconciling ? CloudArrowDownIcon : CloudSlashIcon
  const label = reconciling ? 'Catching up…' : 'Reconnecting…'
  const detail = reconciling
    ? 'Refreshing what changed while the connection was down.'
    : "Not receiving live updates. What's on screen may be out of date."

  return (
    <div
      role="status"
      title={detail}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-warning',
        isCollapsed && 'justify-center px-0',
      )}
    >
      <Icon weight="bold" className="size-4 shrink-0" />
      <span
        className={cn(
          'truncate transition-opacity duration-200',
          isCollapsed && 'sr-only',
        )}
      >
        {label}
      </span>
    </div>
  )
}
