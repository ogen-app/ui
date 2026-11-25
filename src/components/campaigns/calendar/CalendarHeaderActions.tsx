import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Settings01Icon } from '@hugeicons/core-free-icons'
import { HeaderIcon, UnscheduledCalendarIcon } from './HeaderIcon'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useCampaignPosts, useWorkspacePosts } from '@/hooks/usePosts'
import type { Post } from '@/types/posts'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

/**
 * The campaign calendar's header icons — the counter is that campaign's.
 */
export function CalendarHeaderActions({ campaignId }: { campaignId: string }) {
  const { data: posts, isPending } = useCampaignPosts(campaignId)
  return <CalendarActions posts={posts} isPending={isPending} />
}

/**
 * The same icons on the workspace calendar, counting every campaign's strays.
 *
 * A separate entry point rather than a `campaignId ?? ''` inside one, because
 * the two read different queries and a hook cannot take a branch: calling both
 * would make the campaign calendar fetch the whole workspace's posts for a
 * number it never shows.
 */
export function WorkspaceCalendarHeaderActions() {
  const { data: posts, isPending } = useWorkspacePosts()
  return <CalendarActions posts={posts} isPending={isPending} />
}

/**
 * Header icon set for the calendar section: the not-scheduled counter and
 * settings. The panels themselves live in the calendar's drawer beside the
 * grid (`CalendarDrawer`), apart from the assistant's rail; these buttons only
 * switch what it shows. The active icon renders filled in the accent color.
 *
 * Settings comes first and the counter takes the corner: the counter is the
 * one that changes — its word slides open and shut with what is waiting — and
 * at the row's end that never moves the gear.
 */
function CalendarActions({
  posts,
  isPending,
}: {
  posts: Post[] | undefined
  isPending: boolean
}) {
  const { t } = useTranslation()
  const activePanel = useSettingsStore((s) => s.calendarDrawer)
  const toggle = useSettingsStore((s) => s.toggleCalendarDrawer)
  const unscheduledCount = (posts ?? []).filter((p) => !p.scheduled_at).length
  const hasUnscheduled = unscheduledCount > 0

  const settingsActive = activePanel === 'calendarSettings'
  const unscheduledActive = activePanel === 'notScheduled'

  // The width the label wants, measured rather than assumed: it is a different
  // number in every language, and `width: auto` is not a thing CSS can
  // animate from.
  const labelRef = useRef<HTMLSpanElement>(null)
  const [labelWidth, setLabelWidth] = useState(0)
  useLayoutEffect(() => {
    const el = labelRef.current
    if (!el) return
    const measure = () => setLabelWidth(el.offsetWidth)
    measure()
    // `w-max` means the span keeps its natural width inside the collapsed
    // box, so this fires for a language switch or a webfont landing late.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The animation is for a count that *changes* while the user is looking, so
  // it stays off until the posts have arrived and been painted once. Without
  // this the label plays its opening every time the calendar is opened: the
  // first render has no posts yet, so it starts from "nothing unscheduled" and
  // slides open on the query settling — an animation reporting nothing.
  const [animate, setAnimate] = useState(false)
  useEffect(() => {
    if (isPending || animate) return
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [isPending, animate])

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="headerIcon"
        size="excluded"
        className={cn(settingsActive && 'text-accent hover:text-accent')}
        onClick={() => toggle('calendarSettings')}
        aria-label={t('calendar.settings')}
        aria-pressed={settingsActive}
      >
        <HeaderIcon icon={Settings01Icon} />
      </Button>
      <Button
        variant="headerIcon"
        size="excluded"
        className={cn(unscheduledActive && 'text-accent hover:text-accent')}
        onClick={() => toggle('notScheduled')}
        aria-label={t('calendar.unscheduledPosts')}
        aria-pressed={unscheduledActive}
      >
        <span className="relative flex size-[18px] shrink-0">
          <UnscheduledCalendarIcon filled={hasUnscheduled} />
          {hasUnscheduled && (
            // Knocked out of the filled body in the page's colour. The 1px
            // nudge centres it on the body, which sits below the rings.
            <span className="absolute inset-0 flex translate-y-[1px] items-center justify-center text-mark/none font-semibold tabular-nums text-background">
              {unscheduledCount}
            </span>
          )}
        </span>
        {/* The word is only there while there is something to be unscheduled.
            It is not conditionally rendered, though: scheduling the last stray
            post is a thing the user just did, and the row it happened in
            should settle rather than jump. So the label slides shut instead,
            on the sidebar's own 200ms linear curve — everything in the chrome
            that resizes resizes at one speed.
            The measured width is what makes that animate at all: `width: auto`
            doesn't interpolate, and neither does the 0fr grid track this was
            written with first — it looks like it should, but a track sized off
            content resolves to pixels and the transition to `0fr` snaps.
            The 8px gap lives on the inner span rather than on the button
            (`headerIcon` sets `gap-0`), so it is inside the measured width and
            collapses with the word instead of leaving a space behind. */}
        <span
          className={cn(
            'overflow-hidden',
            animate && 'transition-[width] duration-200 ease-linear',
          )}
          style={{ width: hasUnscheduled ? labelWidth : 0 }}
        >
          <span
            ref={labelRef}
            className="block w-max whitespace-nowrap pl-2 text-control font-medium"
          >
            {t('calendar.unscheduled')}
          </span>
        </span>
      </Button>
    </div>
  )
}
