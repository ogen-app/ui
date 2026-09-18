import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  countdownRefreshMs,
  publishTiming,
  type PublishCountdown,
  type PublishTiming,
} from '@/lib/publishCountdown'
import { formatNumber, formatRelative } from '@/lib/intl'
import type { Post } from '@/types/posts'

export type PublishStatus = {
  /** "Auto-publishing in 2 days" — what the bar says when it has the room. */
  full: string
  /** "2d" — the same fact, for when it doesn't. */
  compact: string
}

/**
 * What is going to happen to this post, or null when nothing is (CON-195).
 *
 * A hook returning strings, rather than a component that renders nothing,
 * because of where the answer is consumed: the bar it sits on rules a divider
 * between its children, and `Children.toArray` counts an element whose render
 * returns `null` as a child all the same. The caller has to be able to see the
 * emptiness to leave the slot out, so the emptiness has to be a value.
 */
export function usePublishStatus(post: Post): PublishStatus | null {
  const { t, i18n } = useTranslation()
  const timing = useLiveTiming(post)
  const locale = i18n.language

  if (!timing) return null

  const { value, unit } = timing.countdown
  /**
   * "in 2 days" / "2 days ago" / "now", in the active language.
   *
   * `Intl.RelativeTimeFormat` rather than catalogue entries per unit: it
   * already knows every language's plural rules and its own word for "now",
   * so the catalogue only carries the sentence around it.
   */
  const when = formatRelative(value, unit, locale)

  return {
    full: t(
      timing.method === 'auto'
        ? 'posts.publishStatus.auto'
        : 'posts.publishStatus.manual',
      { when },
    ),
    compact:
      value === 0
        ? t('posts.publishStatus.compactNow')
        : // Compact drops the "in …" framing, so an overdue post would
          // otherwise read exactly like an upcoming one. The marker is the
          // only thing left telling them apart.
          value < 0
          ? t('posts.publishStatus.compactLate', {
              amount: compactAmount(timing.countdown, locale),
            })
          : compactAmount(timing.countdown, locale),
  }
}

/**
 * "2 days", "3 hr", "3 mths".
 *
 * `Intl.NumberFormat`'s unit style rather than a table of English suffixes: it
 * abbreviates correctly per language, and the catalogue never has to learn a
 * form per unit. Only the two words around it — "now" and the overdue marker —
 * are entries.
 *
 * `short`, not `narrow`, and the difference matters: narrow renders both
 * `minute` and `month` as "3m" in English. On a publish countdown that is the
 * one collision worth paying two characters to avoid — "3m" meaning three
 * minutes and "3m" meaning three months call for very different reactions.
 */
function compactAmount(
  { value, unit }: PublishCountdown,
  locale: string,
): string {
  return formatNumber(
    Math.abs(value),
    { style: 'unit', unit, unitDisplay: 'short' },
    locale,
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

  // The clock only ticks while a countdown is showing, so it is stale by
  // however long the editor sat on a draft — schedule a post after 45 minutes
  // of editing and the first sentence would be computed against a `now` from
  // 45 minutes ago, with the correcting tick up to a full period away. Any
  // change to what is being counted restarts the clock from the real time.
  useEffect(() => {
    setNow(Date.now())
  }, [post.id, post.status, post.scheduled_at])

  useEffect(() => {
    if (refreshMs === null) return
    const id = setInterval(() => setNow(Date.now()), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs])

  return timing
}
