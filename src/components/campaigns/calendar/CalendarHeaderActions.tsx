import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CalendarBlankIcon, GearSixIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useCampaignPosts } from '@/hooks/usePosts'
import { usePanelScope } from '@/hooks/usePanelScope'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib'

/**
 * Header icon set for the calendar section: the not-scheduled counter and
 * settings. The panels themselves live in the right sidebar (shared with the
 * AI assistant — one at a time); these buttons only switch what it shows. The
 * active icon renders filled in the accent color.
 *
 * The counter comes first because it is about this campaign's posts and
 * settings is about the view — the same order the rest of the app puts them
 * in, work before preferences, and it keeps the gear last where a gear is
 * always looked for.
 *
 * This component exists exactly while the calendar does, so it is also where
 * the calendar declares its panel scope: leaving hides the calendar's panels
 * without forgetting which one was open, and coming back brings it straight
 * back up.
 */
export function CalendarHeaderActions({ campaignId }: { campaignId: string }) {
  usePanelScope('calendar', campaignId)

  const { t } = useTranslation()
  const activePanel = useSettingsStore(selectActivePanel)
  const toggle = useSettingsStore((s) => s.toggleRightPanel)
  const { data: posts, isPending } = useCampaignPosts(campaignId)
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
        className={cn(unscheduledActive && 'text-accent hover:text-accent')}
        onClick={() => toggle('notScheduled')}
        aria-label={t('calendar.unscheduledPosts')}
        aria-pressed={unscheduledActive}
      >
        <span className="relative flex size-5 shrink-0">
          <CalendarBlankIcon
            weight={unscheduledActive || hasUnscheduled ? 'fill' : 'regular'}
            className="size-5"
          />
          {hasUnscheduled && (
            // Knocked out of the filled icon in the page background color; the
            // 2px nudge centers it optically in the calendar body below the
            // header strip of the glyph.
            <span className="absolute inset-0 flex translate-y-[2px] items-center justify-center text-[10px]/none font-medium tabular-nums text-background">
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
            className="block w-max whitespace-nowrap pl-2 text-[13px]/4 font-medium"
          >
            {t('calendar.unscheduled')}
          </span>
        </span>
      </Button>
      <Button
        variant="headerIcon"
        size="excluded"
        className={cn(settingsActive && 'text-accent hover:text-accent')}
        onClick={() => toggle('calendarSettings')}
        aria-label={t('calendar.settings')}
        aria-pressed={settingsActive}
      >
        <GearSixIcon
          weight={settingsActive ? 'fill' : 'regular'}
          className="size-5"
        />
      </Button>
    </div>
  )
}
