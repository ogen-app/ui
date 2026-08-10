import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePublishingAccount } from '@/hooks/usePublishingAccount'
import {
  countdownRefreshMs,
  publishTiming,
  type PublishTiming,
} from '@/lib/publishCountdown'
import type { Post } from '@/types/posts'

/**
 * "Will be published in 2 days as Alephbet" — or null when nothing is going to
 * publish this post (CON-195).
 *
 * A hook returning the sentence, rather than a component that renders nothing,
 * because of where the answer is consumed: the bar it sits on rules a divider
 * between its children, and `Children.toArray` counts an element whose render
 * returns `null` as a child all the same. The caller has to be able to see the
 * emptiness to leave the slot out, so the emptiness has to be a value.
 */
export function usePublishStatus(post: Post): string | null {
  const { t, i18n } = useTranslation()
  const timing = useLiveTiming(post)
  // The same resolution the quick-settings bar and the preview use, so the
  // three can't name different accounts for one post.
  const account = usePublishingAccount(
    post.platform_id,
    post.social_account_id,
    post.social_account,
  )

  /**
   * "in 2 days" / "2 days ago" / "now", in the active language.
   *
   * `Intl.RelativeTimeFormat` rather than catalogue entries per unit: it
   * already knows every language's plural rules and its own word for "now",
   * so the catalogue only carries the sentence around it.
   */
  const relative = useMemo(
    () => new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }),
    [i18n.language],
  )

  if (!timing) return null

  const when = relative.format(timing.countdown.value, timing.countdown.unit)
  const named = account.name

  return t(
    timing.method === 'auto'
      ? named
        ? 'posts.publishStatus.autoAs'
        : 'posts.publishStatus.auto'
      : named
        ? 'posts.publishStatus.manualAs'
        : 'posts.publishStatus.manual',
    { when, account: named ?? '' },
  )
}

/**
 * The timing, kept true as time passes.
 *
 * A post editor stays open for a long time, so a value computed once at mount
 * would quietly drift — "in 2 hours" still on screen an hour later. The tick
 * period comes off the unit being shown (`countdownRefreshMs`): a post going
 * out this minute is worth watching closely, one three weeks away is not.
 */
function useLiveTiming(post: Post): PublishTiming | null {
  const [now, setNow] = useState(() => Date.now())
  const timing = publishTiming(post, now)
  // Null when there is no countdown on screen — then there is no interval at
  // all, rather than one waking up to recompute nothing.
  const refreshMs = timing ? countdownRefreshMs(timing.countdown.unit) : null

  useEffect(() => {
    if (refreshMs === null) return
    const id = setInterval(() => setNow(Date.now()), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs])

  return timing
}
