import { Fragment, useEffect, useRef } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import {
  CaretRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleDashedIcon,
  DotsThreeIcon,
  PlusIcon,
} from '@phosphor-icons/react'
import {
  Alert02Icon,
  BookOpen01Icon,
  Task01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'
import { IgnoredList } from '@/components/assistant/FindingsBlock'
import { GridCell, PageGrid } from '@/components/page-primitives/PageGrid'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { LineItem, type LineItemIndicator } from '@/components/ui/line-item'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { cn, formatTitle } from '@/lib'
import { campaignSection } from '@/lib/campaignSections'
import { findScrollParent } from '@/lib/scrollParent'
import type {
  NeedsAction,
  NeedsRow,
  OverviewBand,
  OverviewDay,
  OverviewModel,
  OverviewPerformance,
  OverviewPlatform,
  OverviewPostRow,
  OverviewTarget,
  SetupStep,
} from '@/lib/campaignOverview'
import { RECENT_DAYS } from '@/lib/campaignOverview'
import {
  counted,
  formatDate,
  formatDateRange,
  formatNumber,
  formatRelative,
} from '@/lib/intl'
import { getPlatformByZernioId } from '@/lib/platformDictionary'
import { stageTodoLabel, type NeedsLine } from './needsLines'
import { SectionLink } from './OverviewCard.tsx'

/**
 * What the screen does when a row is acted on. The route wires these to the
 * assistant, the dismiss endpoint and post creation; the design harness logs
 * them. Links are links either way.
 */
export type OverviewHandlers = {
  /** A server problem's fix, asked of the campaign's assistant. */
  ask: (fix: string, problem: string) => void
  /** Every problem at once — FIX WITH OGEN. */
  askAll: () => void
  ignore: (key: string) => void
  addPost: () => void
  /** A setup step, asked of Ogen: written into the composer, sent by the user. */
  withOgen: (step: SetupStep['id']) => void
  /** Opens the help centre's campaign article; absent while none serves it. */
  learnMore?: () => void
}

/**
 * The campaign's front page, drawn from `overviewModel`, as a dashboard
 * (`PageGrid`) read in order of importance. Two columns: the progress card
 * and the time cards — what goes out (this week; the first week while
 * planning; the results once it is over), then the campaign's analytics card
 * while it runs — and beside them the one list of what wants the user, held
 * on screen while they are read. On a narrow page that order is the stack,
 * the list last.
 *
 * The rule for anything added here: a figure goes in a time card, a thing to
 * do goes in the list, and anything that takes more than a glance to read
 * belongs on the page the row links to. Per-channel counts, the status tiles,
 * the goal's arithmetic and the assets tally all moved to their own pages for
 * that reason.
 */
export function CampaignOverview({
  model,
  campaignId,
  handlers,
  now,
  analytics,
}: {
  model: OverviewModel
  campaignId: string
  handlers: OverviewHandlers
  /** The day the model was worked out for; relative times read from it. */
  now: Date
  /**
   * The analytics page's own overview card, narrowed to this campaign — a
   * slot rather than a read here, so the harness can hand it fixtures.
   */
  analytics?: ReactNode
}) {
  if (model.stage === 'new') {
    return (
      <div className="pb-10">
        <PageGrid>
          <GridCell span="wide">
            <SetupCard
              steps={model.setup ?? []}
              campaignId={campaignId}
              handlers={handlers}
            />
          </GridCell>
          <GridCell span="narrow">
            <LearnCard learnMore={handlers.learnMore} campaignId={campaignId} />
          </GridCell>
        </PageGrid>
      </div>
    )
  }

  // The progress card and the time cards are one column, beside the list;
  // the list is held on screen while they are read. With none, the list takes
  // the row. Once the campaign is over the results say how it went, so the
  // progress card goes.
  const column = [
    model.band && model.stage !== 'ended' && (
      <ProgressCard key="band" stage={model.stage} band={model.band} />
    ),
    ...timeCards(model, campaignId, now, analytics),
  ].filter(Boolean)
  return (
    <div className="pb-10">
      <PageGrid>
        {column.length > 0 && (
          <GridCell span="wide">
            {/* Each card keeps its height; the last takes what the list
                leaves, so the column ends with it. */}
            <div className="flex flex-col gap-4 *:last:flex-1">{column}</div>
          </GridCell>
        )}
        <GridCell span={column.length > 0 ? 'narrow' : 'full'}>
          <NeedsList
            model={model}
            campaignId={campaignId}
            handlers={handlers}
            pinned={column.length > 0}
          />
        </GridCell>
      </PageGrid>
    </div>
  )
}

/**
 * A card on the page: the panel colour with the hairline the menu and the
 * rail are drawn with, so the cards sit in the same frame as the chrome.
 */
const SURFACE = 'rounded-md border border-border bg-primary'

/**
 * Where a card's header goes: a section of the campaign, or something the
 * screen opens itself (the help centre's article).
 */
type CardDoor = { target: OverviewTarget } | { open: () => void; label: string }

/**
 * Every card on the page, built as Brand's section cards are: the glyph in its
 * section's hue, the title in the display face, and — when the card has
 * somewhere to go — a caret at the far end, the whole header being the way
 * there. The caret replaces the OPEN … buttons, which named a destination in
 * words on one card and not on the next.
 *
 * Only the header is the door, never the card: the rows inside are links and
 * buttons of their own. The 20px glyph and its gap put the title's first
 * letter on the same 28px the rows' labels start on (`LineItem`).
 */
function Card({
  glyph,
  title,
  door,
  aside,
  campaignId,
  className,
  children,
}: {
  glyph: ReactNode
  title: ReactNode
  door?: CardDoor
  /** Opposite the title, for a card with no door: a count, an action. */
  aside?: ReactNode
  campaignId: string
  className?: string
  children?: ReactNode
}) {
  const head = (
    <>
      {glyph}
      <span className="truncate">{title}</span>
    </>
  )
  const caret = (
    <CaretRightIcon
      className="ml-auto size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
      weight="bold"
      aria-hidden
    />
  )
  const doorClass =
    'group -m-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm p-1 text-left'
  return (
    <section className={cn(SURFACE, 'flex flex-col gap-4 p-6', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 font-display text-xl font-medium tracking-tight">
          {!door ? (
            head
          ) : 'target' in door ? (
            <TargetLink
              target={door.target}
              campaignId={campaignId}
              className={doorClass}
            >
              {head}
              {caret}
            </TargetLink>
          ) : (
            <button
              type="button"
              className={doorClass}
              onClick={door.open}
              title={door.label}
            >
              {head}
              {caret}
            </button>
          )}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** A campaign section's glyph in its hue, the one the rail draws. */
function SectionGlyph({ section }: { section: 'calendar' | 'analytics' }) {
  const meta = campaignSection(section)
  return <Glyph icon={meta.icon} tone={meta.tone} />
}

function Glyph({ icon, tone }: { icon: IconSvgElement; tone?: string }) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={20}
      strokeWidth={1.5}
      className="shrink-0"
      style={tone ? { color: tone } : undefined}
      aria-hidden
    />
  )
}

// --- The progress card -----------------------------------------------------

/**
 * Where the campaign is in its own time: the stage and the day, the window,
 * today's phase, and the goal as a bar. Everything here is a glance; the
 * goal's arithmetic is on Strategy. What goes out next is the week card's,
 * so it is not repeated here. Two type styles: the title, and one size of
 * text at full strength — the bar's colours are carried by its legend's
 * dots, not by fading the words.
 *
 * Exported for the design harness's specimens.
 */
export function ProgressCard({
  stage,
  band,
}: {
  stage: OverviewModel['stage']
  band: OverviewBand
}) {
  return (
    <section className={cn(SURFACE, 'flex flex-col gap-4 p-6')}>
      <ProgressHeader stage={stage} band={band} />
      <PostsBar band={band} />
    </section>
  )
}

/**
 * The progress card's first line: the stage and today's phase on the left,
 * the dates and the day on the right. `row` is the Campaigns list's size,
 * where the campaign's name is the largest thing and the stage sits under
 * it as a column head. Without a band — a campaign with no dates — the stage
 * alone.
 */
export function ProgressHeader({
  stage,
  band,
  size = 'card',
}: {
  stage: OverviewModel['stage']
  band: OverviewBand | null
  size?: 'card' | 'row'
}) {
  const { t, i18n } = useTranslation()
  const where =
    band == null
      ? null
      : band.startsIn != null
        ? t('campaignOverview.stats.startsIn', {
            when: formatRelative(band.startsIn, 'day', i18n.language),
          })
        : band.endedAgo != null
          ? t('campaignOverview.stats.ended', {
              when: formatRelative(-band.endedAgo, 'day', i18n.language),
            })
          : t('campaignOverview.stats.dayOf', {
              day: formatNumber(band.day),
              total: formatNumber(band.days),
            })
  // Only today's phase; none before the start, between phases or after.
  const phase = band?.phases.find((p) => p.current)
  const Heading = size === 'row' ? 'h3' : 'h2'

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="flex flex-col gap-1">
        <Heading
          className={cn(
            'font-display font-medium',
            size === 'row' ? 'text-base' : 'text-xl tracking-tight',
          )}
        >
          {t(`campaignOverview.stage.${stage}`)}
        </Heading>
        {phase?.day != null && (
          <p className="text-sm">
            {t('campaignOverview.band.phaseNow', {
              name: phase.name,
              day: formatNumber(phase.day),
              total: formatNumber(phase.days),
            })}
          </p>
        )}
      </div>
      {band && where && (
        <span className="ml-auto text-sm">
          {t('campaignOverview.band.when', {
            range: formatDateRange(
              band.start,
              band.end,
              { month: 'short', day: 'numeric', year: 'numeric' },
              i18n.language,
            ),
            where,
          })}
        </span>
      )}
    </div>
  )
}

/**
 * The posts against the goal, scheduled stacked after the published. With no
 * goal — the common case — the last 30 days' published against the next 30
 * days' scheduled, so the bar is the proportion done; an empty grey track
 * when there is neither. Under it, the same figures as the other cards, the
 * pace last.
 */
export function PostsBar({
  band,
  size = 'card',
}: {
  band: OverviewBand
  /** `row` is the Campaigns list's: the figures on one line, in its text. */
  size?: 'card' | 'row'
}) {
  const { t } = useTranslation()
  const { goal, pace } = band
  const { published, scheduled } = goal != null ? band : band.recent
  // With a goal, scheduled only fills what the published leave of it.
  const track = goal ?? published + scheduled
  const shown =
    goal != null
      ? Math.min(scheduled, Math.max(0, goal - published))
      : scheduled
  const of = (n: number) =>
    `${track > 0 ? Math.min(100, (n / track) * 100) : 0}%`
  const days = formatNumber(RECENT_DAYS)
  const figures: FigureRow[] = [
    // Before the start nothing can be out; with a goal, the count still reads.
    ...(published > 0 || goal != null || band.startsIn == null
      ? [
          {
            // On one line the goal reads as a fraction: "Published 40/48".
            label:
              goal == null
                ? t('campaignOverview.band.publishedRecent', { days })
                : size === 'row'
                  ? t('campaignOverview.stats.published')
                  : t('campaignOverview.results.publishedOf', counted(goal)),
            value: published,
            ...(size === 'row' && goal != null ? { of: goal } : {}),
            dot: 'bg-positive',
          },
        ]
      : []),
    ...(scheduled > 0
      ? [
          {
            label:
              goal != null
                ? t('campaignOverview.band.scheduled')
                : t('campaignOverview.band.scheduledRecent', { days }),
            value: scheduled,
            dot: 'bg-positive/35',
          },
        ]
      : []),
    ...(pace
      ? [
          {
            label: pace.planned
              ? t('campaignOverview.band.pacePlanned')
              : t('campaignOverview.band.pace'),
            value: Math.round(pace.perWeek * 10) / 10,
          },
        ]
      : []),
  ]
  // Nothing at all: the grey track alone.
  const empty = published === 0 && scheduled === 0 && !pace && goal == null
  return (
    <div className={cn('flex flex-col', size === 'row' ? 'gap-3' : 'gap-4')}>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="bg-positive" style={{ width: of(published) }} />
        <div className="bg-positive/35" style={{ width: of(shown) }} />
      </div>
      {!empty && <Figures figures={figures} inline={size === 'row'} />}
    </div>
  )
}

function Dot({ className }: { className: string }) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', className)}
      aria-hidden
    />
  )
}

// --- The time cards ---------------------------------------------------------

/** What the stage has to say about time, most pressing first. */
function timeCards(
  model: OverviewModel,
  campaignId: string,
  now: Date,
  analytics: ReactNode,
): ReactElement[] {
  return [
    model.week && (
      <WeekBlock
        key="week"
        kind={model.week.kind}
        days={model.week.days}
        campaignId={campaignId}
        now={now}
      />
    ),
    model.analytics && analytics && (
      <Fragment key="analytics">{analytics}</Fragment>
    ),
    model.results && (
      <ResultsBlock
        key="results"
        results={model.results}
        campaignId={campaignId}
      />
    ),
  ].filter((card): card is ReactElement => !!card)
}

/**
 * The week as days, each with its posts — the calendar's week in a list,
 * because the question here is "what goes out", not "where is the gap". A
 * post the user publishes by hand says so: it is the one kind that won't go
 * out unless somebody does something.
 */
function WeekBlock({
  kind,
  days,
  campaignId,
  now,
}: {
  kind: 'this' | 'first'
  days: OverviewDay[]
  campaignId: string
  now: Date
}) {
  const { t, i18n } = useTranslation()
  const empty = days.every((d) => d.posts.length === 0)
  const todayKey = now.toDateString()
  return (
    <Card
      glyph={<SectionGlyph section="calendar" />}
      title={t(`campaignOverview.week.${kind}`)}
      door={{ target: 'calendar' }}
      campaignId={campaignId}
    >
      {empty ? (
        <p className="text-sm text-tertiary-foreground">
          {t('campaignOverview.week.empty')}
        </p>
      ) : (
        <ol className="flex flex-col">
          {days
            .filter((d) => d.posts.length > 0)
            .map((day) => (
              <li
                key={day.date.toISOString()}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] border-t border-border py-1 first:border-t-0"
              >
                <span
                  className={cn(
                    'pt-2.5 text-xs',
                    day.date.toDateString() === todayKey
                      ? 'font-semibold text-foreground'
                      : 'text-tertiary-foreground',
                  )}
                >
                  {day.date.toDateString() === todayKey
                    ? t('campaignOverview.week.today')
                    : formatDate(
                        day.date,
                        { weekday: 'short', day: 'numeric' },
                        i18n.language,
                      )}
                </span>
                <ul className="flex flex-col">
                  {day.posts.map((post) => (
                    <li key={post.id}>
                      <WeekPostRow post={post} campaignId={campaignId} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ol>
      )}
    </Card>
  )
}

function WeekPostRow({
  post,
  campaignId,
}: {
  post: OverviewPostRow
  campaignId: string
}) {
  const { t, i18n } = useTranslation()
  return (
    <LineItem
      asChild
      indicator={platformIndicator(post.platform)}
      label={formatTitle(
        post.title ?? '',
        t('campaignOverview.stats.untitledPost'),
      )}
      trailing={
        <>
          {post.manual && (
            <span className="text-[11px] font-semibold tracking-[0.06em] text-warning-ink">
              {t('campaignOverview.week.manual')}
            </span>
          )}
          <PostStatusBadge status={post.status} />
          <span className="w-16 text-right whitespace-nowrap tabular-nums">
            {post.at
              ? formatDate(
                  post.at,
                  { hour: '2-digit', minute: '2-digit' },
                  i18n.language,
                )
              : ''}
          </span>
        </>
      }
    >
      <Link
        to="/campaigns/$campaignId/posts/$postId"
        params={{ campaignId, postId: post.id }}
      />
    </LineItem>
  )
}

function ResultsBlock({
  results,
  campaignId,
}: {
  results: NonNullable<OverviewModel['results']>
  campaignId: string
}) {
  const { t } = useTranslation()
  return (
    <Card
      glyph={<SectionGlyph section="analytics" />}
      title={t('campaignOverview.results.title')}
      door={{ target: 'analytics' }}
      campaignId={campaignId}
    >
      <ResultsFigures results={results} />
      {results.performance?.best && (
        <BestPost best={results.performance.best} campaignId={campaignId} />
      )}
    </Card>
  )
}

/** What an ended campaign came to: out, failed, never out, and the reach. */
export function ResultsFigures({
  results,
  size = 'card',
}: {
  results: NonNullable<OverviewModel['results']>
  size?: 'card' | 'row'
}) {
  const { t } = useTranslation()
  return (
    <Figures
      inline={size === 'row'}
      figures={[
        {
          label:
            results.goal != null && size === 'card'
              ? t('campaignOverview.results.publishedOf', counted(results.goal))
              : t('campaignOverview.stats.published'),
          value: results.published,
          ...(size === 'row' && results.goal != null
            ? { of: results.goal }
            : {}),
        },
        {
          label: t('campaignOverview.stats.failed'),
          value: results.failed,
          alert: results.failed > 0,
        },
        {
          label: t('campaignOverview.results.neverPublished'),
          value: results.neverPublished,
        },
        ...(results.performance
          ? [
              {
                label: t('campaignOverview.figures.reach'),
                value: results.performance.reach,
              },
              {
                label: t('campaignOverview.figures.interactions'),
                value: results.performance.interactions,
              },
            ]
          : []),
      ]}
    />
  )
}

type FigureRow = {
  label: string
  value: number
  alert?: boolean
  /** What it is out of, written after it on a line of `inline` figures. */
  of?: number
  /** The colour it has in a bar above, as a dot before its name. */
  dot?: string
}

/**
 * A row of figures, the number large and its name under it — or, `inline`,
 * each figure one line of body text, its name then its number, for a row on
 * the Campaigns list where every column reads in the same size.
 */
function Figures({
  figures,
  inline = false,
}: {
  figures: FigureRow[]
  inline?: boolean
}) {
  const value = (f: FigureRow) =>
    formatNumber(f.value, {
      notation: f.value >= 10_000 ? 'compact' : 'standard',
    })
  if (inline)
    return (
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {figures.map((f) => (
          <div key={f.label} className="flex items-center gap-1.5">
            {f.dot && <Dot className={f.dot} />}
            <dt>{f.label}</dt>
            <dd
              className={cn(
                'font-medium tabular-nums text-primary-foreground',
                f.alert && 'text-destructive',
                f.value === 0 && !f.alert && 'text-tertiary-foreground',
              )}
            >
              {value(f)}
              {f.of != null && (
                <span className="font-normal text-tertiary-foreground">
                  /{formatNumber(f.of)}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    )
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      {figures.map((f) => (
        <div key={f.label} className="flex flex-col-reverse">
          <dt className="flex items-center gap-1.5 text-xs text-tertiary-foreground">
            {f.dot && <Dot className={f.dot} />}
            {f.label}
          </dt>
          <dd
            className={cn(
              'font-display text-2xl font-medium leading-7 tabular-nums',
              f.alert && 'text-destructive',
              f.value === 0 && !f.alert && 'text-tertiary-foreground',
            )}
          >
            {value(f)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function BestPost({
  best,
  campaignId,
}: {
  best: NonNullable<OverviewPerformance['best']>
  campaignId: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-tertiary-foreground">
        {t('campaignOverview.figures.best')}
      </span>
      <LineItem
        asChild
        indicator={platformIndicator(best.platform)}
        label={formatTitle(
          best.title,
          t('campaignOverview.stats.untitledPost'),
        )}
        trailing={
          <span className="tabular-nums">
            {t('campaignOverview.figures.reachOf', {
              reach: formatNumber(best.reach, { notation: 'compact' }),
            })}
          </span>
        }
      >
        <Link
          to="/campaigns/$campaignId/posts/$postId"
          params={{ campaignId, postId: best.postId }}
        />
      </LineItem>
    </div>
  )
}

// --- The right column -------------------------------------------------------

const MARK: Record<NeedsRow['mark'], LineItemIndicator> = {
  broken: { kind: 'notification', tone: 'alert' },
  risk: { kind: 'notification', tone: 'warning' },
  todo: { kind: 'task', done: false },
}

/**
 * Sets `--scroll-viewport` on the element to the visible height of the area
 * it scrolls in (the window's when nothing else scrolls), re-read whenever
 * that area changes size.
 */
function useScrollViewport(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const scroller = findScrollParent(el)
    const apply = () =>
      el.style.setProperty(
        '--scroll-viewport',
        `${scroller?.clientHeight ?? window.innerHeight}px`,
      )
    apply()
    const observer =
      scroller && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(apply)
        : null
    if (scroller) observer?.observe(scroller)
    window.addEventListener('resize', apply)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', apply)
      el.style.removeProperty('--scroll-viewport')
    }
  }, [ref])
}

/**
 * Everything that wants the user, in one list, worst first. A problem's
 * other fixes and IGNORE are in the row's menu: the row says what is wrong
 * and offers the likeliest fix, and the alternatives are a click further for
 * the few who want them.
 *
 * `pinned` — beside the time card — keeps it on screen while that card is
 * read, 16px under the top of the scroll area, as tall as its rows up to the
 * height of the screen; past that the rows scroll inside it, under a header
 * that stays. Nothing is folded away: every problem is still in the list.
 * Stacked, it is an ordinary card.
 */
function NeedsList({
  model,
  campaignId,
  handlers,
  pinned = false,
}: {
  model: OverviewModel
  campaignId: string
  handlers: OverviewHandlers
  pinned?: boolean
}) {
  const { t } = useTranslation()
  const frameRef = useRef<HTMLDivElement>(null)
  useScrollViewport(frameRef)
  const rows = model.needs
  const askable = rows?.some((r) => r.action?.kind === 'ask') ?? false
  return (
    <div ref={frameRef} className="flex flex-col">
      <Card
        className={cn(
          'flex-1',
          pinned &&
            '@min-[40rem]:sticky @min-[40rem]:top-4 @min-[40rem]:max-h-[calc(var(--scroll-viewport,100svh)-2rem)] @min-[40rem]:flex-none @min-[40rem]:overflow-hidden',
        )}
        glyph={<Glyph icon={Alert02Icon} tone="var(--nav-overview)" />}
        title={
          <>
            {t(`campaignOverview.needs.${model.needsTitle}`)}
            {rows && rows.length > 0 && (
              <span className="ml-2 font-sans text-sm font-normal text-tertiary-foreground tabular-nums">
                {formatNumber(rows.length)}
              </span>
            )}
          </>
        }
        aside={
          askable && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handlers.askAll}
            >
              <Logo variant="mark" />
              <span>{t('campaignOverview.problems.fixAll')}</span>
            </Button>
          )
        }
        campaignId={campaignId}
      >
        {/* The rows scroll under the header once the card is as tall as the
          screen; edge to edge, so the bar sits on the card's border. */}
        <div className="-mx-6 -mb-6 flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-6">
          {rows === null ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : rows.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-secondary-foreground">
              <CheckIcon className="size-4 text-positive" aria-hidden />
              {t('campaignOverview.needs.none')}
            </p>
          ) : (
            <ul className="flex flex-col">
              {rows.map((row) => (
                <li key={row.id} className={DIVIDED}>
                  <NeedsRowView
                    row={row}
                    campaignId={campaignId}
                    handlers={handlers}
                  />
                </li>
              ))}
            </ul>
          )}
          <IgnoredList
            campaignId={campaignId}
            items={model.ignored.map((p) => ({ key: p.key, title: p.message }))}
          />
        </div>
      </Card>
    </div>
  )
}

/**
 * A warning is a row like the setup card's steps, in the same grammar: the
 * sentence on the left, and either the whole row going where it is fixed
 * (with the caret saying so), or the likeliest fix under it as a button —
 * the setup card's outline buttons, beside the menu of the other fixes and
 * IGNORE.
 */
function NeedsRowView({
  row,
  campaignId,
  handlers,
}: {
  row: NeedsRow
  campaignId: string
  handlers: OverviewHandlers
}) {
  const { t } = useTranslation()
  const label = row.label ?? stageTodoLabel(t, row.todo)
  const notes = [
    row.idea && t('assistant.findings.fromIdea', { title: row.idea }),
    row.more > 0 && t('campaignOverview.needs.more', counted(row.more)),
  ].filter(Boolean)

  // Two lines before it gives up: a problem's sentence is the whole of what
  // it says, and the column is narrow.
  const sentence = (
    <span className="line-clamp-2 whitespace-normal" title={label}>
      {label}
    </span>
  )
  const details =
    notes.length > 0 ? (
      <span className="text-secondary-foreground">{notes.join(' · ')}</span>
    ) : undefined

  const action = row.action
  if (action?.kind === 'section') {
    return (
      <LineItem
        asChild
        className="hover:bg-transparent"
        indicator={MARK[row.mark]}
        label={sentence}
        details={details}
      >
        <TargetLink target={action.target} campaignId={campaignId} />
      </LineItem>
    )
  }

  const fix =
    action?.kind === 'post' ? (
      <Button variant="outline" size="sm" asChild>
        <Link
          to="/campaigns/$campaignId/posts/$postId"
          params={{ campaignId, postId: action.postId }}
          title={action.label}
        >
          <span className="truncate">{action.label}</span>
        </Link>
      </Button>
    ) : action?.kind === 'ask' ? (
      <Button
        variant="outline"
        size="sm"
        title={action.fix}
        onClick={() => runAction(action, handlers)}
      >
        <span className="truncate">{action.fix}</span>
      </Button>
    ) : action?.kind === 'add-post' ? (
      <Button variant="outline" size="sm" onClick={handlers.addPost}>
        <PlusIcon />
        <span>{t('campaignOverview.todo.addPost')}</span>
      </Button>
    ) : null
  const menu =
    row.alternatives.length > 0 || row.ignoreKey ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="smIcon"
            aria-label={t('campaignOverview.needs.menu')}
          >
            <DotsThreeIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {row.alternatives.map((alt, i) =>
            alt.action.kind === 'post' ? (
              <DropdownMenuItem key={i} asChild>
                <Link
                  to="/campaigns/$campaignId/posts/$postId"
                  params={{ campaignId, postId: alt.action.postId }}
                >
                  {alt.label}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={i}
                onSelect={() => runAction(alt.action, handlers)}
              >
                {alt.label}
              </DropdownMenuItem>
            ),
          )}
          {row.ignoreKey && (
            <DropdownMenuItem onSelect={() => handlers.ignore(row.ignoreKey!)}>
              {t('campaignOverview.problems.ignore')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null

  return (
    <>
      <LineItem
        indicator={MARK[row.mark]}
        chevron={false}
        label={sentence}
        details={details}
      />
      {(fix || menu) && (
        <span className="flex min-w-0 flex-wrap gap-2 pb-3 pl-7">
          {fix}
          {menu}
        </span>
      )}
    </>
  )
}

function runAction(action: NeedsAction, handlers: OverviewHandlers) {
  if (action.kind === 'ask') handlers.ask(action.fix, action.problem)
  else if (action.kind === 'add-post') handlers.addPost()
  // `section` and `post` are links, rendered as links by the caller.
}

/**
 * The list, short: its title and count, the first `limit` rows as one line
 * each, and how many more. The Campaigns list's third column — a row there is
 * one link to the Overview, so these are words and not doors, and the fixes
 * are the Overview's. With nothing in it, one line saying so where the title
 * would be. `lines` null is still loading.
 *
 * Two children, the title and the rows, so the row's grid can put the title
 * on the line the other columns' heads share.
 */
export function NeedsPreview({
  title,
  lines,
  limit = 3,
}: {
  title: string
  lines: NeedsLine[] | null
  limit?: number
}) {
  const { t } = useTranslation()
  if (lines && lines.length === 0)
    return (
      <p className="font-display text-base font-medium">
        <CheckCircleIcon
          weight="fill"
          className="mr-1.5 inline size-5 align-[-0.3em] text-positive"
          aria-hidden
        />
        {t('campaigns.list.goodShape')}
      </p>
    )
  return (
    <>
      <h3 className="font-display text-base font-medium">
        {title}
        {lines && (
          <span className="ml-2 font-sans text-sm font-normal text-tertiary-foreground tabular-nums">
            {formatNumber(lines.length)}
          </span>
        )}
      </h3>
      {lines === null ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <ul className="flex min-w-0 flex-col gap-1 text-sm">
          {lines.slice(0, limit).map((line) => (
            <li key={line.id} className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  PREVIEW_DOT[line.mark],
                )}
                aria-hidden
              />
              <span className="truncate" title={line.label}>
                {line.label}
              </span>
            </li>
          ))}
          {lines.length > limit && (
            <li className="pl-3.5 text-tertiary-foreground">
              {t(
                'campaignOverview.needs.moreRows',
                counted(lines.length - limit),
              )}
            </li>
          )}
        </ul>
      )}
    </>
  )
}

/** The preview's marks: the list's colours, a hollow dot for a step to do. */
const PREVIEW_DOT: Record<NeedsLine['mark'], string> = {
  broken: 'bg-destructive',
  risk: 'bg-warning',
  todo: 'border border-tertiary-foreground',
}

/** `SectionLink`, plus the campaign's Settings, where archiving lives. */
function TargetLink({
  target,
  campaignId,
  className,
  children,
}: {
  target: OverviewTarget
  campaignId: string
  /** From `LineItem asChild`, which styles the row through its child. */
  className?: string
  children?: ReactNode
}) {
  if (target === 'settings') {
    return (
      <Link
        to="/campaigns/$campaignId/settings"
        params={{ campaignId }}
        className={className}
      >
        {children}
      </Link>
    )
  }
  return (
    <SectionLink target={target} campaignId={campaignId} className={className}>
      {children}
    </SectionLink>
  )
}

// --- New ---------------------------------------------------------------------

/**
 * A campaign with no dates has no time to place it in, so the left column is
 * the three things that make one, numbered because they are done in order.
 * Each step is a row like any other on the page: the whole row goes where the
 * step is done (Strategy for the dates and the channels, the posts for the
 * first post), with the caret saying so. Under an open step sits the same
 * pair — do it yourself, or ask Ogen — and only the first step still open is
 * drawn dark, because that is the next thing to do. Steps already done are
 * ticked and struck rather than hidden, so the card reads as progress.
 */
function SetupCard({
  steps,
  campaignId,
  handlers,
}: {
  steps: SetupStep[]
  campaignId: string
  handlers: OverviewHandlers
}) {
  const { t } = useTranslation()
  const next = steps.find((s) => !s.done)?.id
  return (
    <Card
      glyph={<Glyph icon={Task01Icon} tone="var(--nav-overview)" />}
      title={t('campaignOverview.setup.title')}
      campaignId={campaignId}
    >
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <li key={step.id} className={DIVIDED}>
            {/* No hover fill: the row sits between hairlines with its own
                buttons under it, and a fill stopping short of them reads as
                a box around half a step. The caret darkening is enough. */}
            <LineItem
              asChild
              variant="entry"
              className="hover:bg-transparent"
              indicator={{
                kind: 'custom',
                node: <StepMark n={i + 1} done={step.done} />,
              }}
              label={
                <span
                  className={cn(
                    step.done && 'text-secondary-foreground line-through',
                  )}
                >
                  {t(`campaignOverview.setup.${step.id}.title`)}
                </span>
              }
              details={
                <span className="text-secondary-foreground">
                  {t(`campaignOverview.setup.${step.id}.detail`)}
                </span>
              }
            >
              <TargetLink
                target={step.id === 'posts' ? 'posts' : 'strategy'}
                campaignId={campaignId}
              />
            </LineItem>
            {/* Outside the row's link — a button can't sit inside one — and
                set in to the label's 28px. */}
            {!step.done && (
              <span className="flex flex-wrap gap-2 pb-3 pl-7">
                <SetupAction
                  step={step.id}
                  primary={step.id === next}
                  campaignId={campaignId}
                  handlers={handlers}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlers.withOgen(step.id)}
                >
                  <Logo variant="mark" />
                  <span>{t('campaignOverview.setup.withOgen')}</span>
                </Button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  )
}

/** A hairline between rows, none above the first, and a little air under it. */
const DIVIDED = 'border-t border-border pt-2 first:border-t-0 first:pt-0'

/** A step's number in a ring, or the tick once it is done — 16px, the row's slot. */
function StepMark({ n, done }: { n: number; done: boolean }) {
  if (done) {
    return <CheckCircleIcon weight="fill" className="size-4 text-positive" />
  }
  return (
    <span className="flex size-4 items-center justify-center rounded-full border border-border text-[10px] leading-none font-semibold text-secondary-foreground tabular-nums">
      {formatNumber(n)}
    </span>
  )
}

/**
 * A step's do-it-yourself half: dates and channels are set on Strategy, so
 * those go there; the first post is made here.
 */
function SetupAction({
  step,
  primary,
  campaignId,
  handlers,
}: {
  step: SetupStep['id']
  primary: boolean
  campaignId: string
  handlers: OverviewHandlers
}) {
  const { t } = useTranslation()
  const variant = primary ? 'defaultInverted' : 'outline'
  if (step === 'posts') {
    return (
      <Button variant={variant} size="sm" onClick={handlers.addPost}>
        <PlusIcon />
        <span>{t('campaignOverview.setup.posts.action')}</span>
      </Button>
    )
  }
  return (
    <Button variant={variant} size="sm" asChild>
      <SectionLink target="strategy" campaignId={campaignId}>
        {t(`campaignOverview.setup.${step}.action`)}
      </SectionLink>
    </Button>
  )
}

/**
 * The right column of a new campaign: what someone setting one up for the
 * first time would want explained, in three lines. Its header opens the help
 * centre's article when one serves the topic, and is only a title otherwise.
 * Teaching only — the screen reads the same without it.
 */
function LearnCard({
  learnMore,
  campaignId,
}: {
  learnMore?: () => void
  campaignId: string
}) {
  const { t } = useTranslation()
  const points = ['stages', 'goal', 'ogen'] as const
  return (
    <Card
      glyph={<Glyph icon={BookOpen01Icon} />}
      title={t('campaignOverview.learn.title')}
      door={
        learnMore && {
          open: learnMore,
          label: t('campaignOverview.learn.more'),
        }
      }
      campaignId={campaignId}
    >
      <ul className="flex flex-col">
        {points.map((p) => (
          <li key={p} className={DIVIDED}>
            <LineItem
              variant="entry"
              indicator={{ kind: 'notification', tone: 'neutral' }}
              label={t(`campaignOverview.learn.${p}.title`)}
              details={
                <span className="text-secondary-foreground">
                  {t(`campaignOverview.learn.${p}.detail`)}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}

// --- Shared -----------------------------------------------------------------

/**
 * The platform's mark, drawn as the calendar draws it: filled, in the
 * network's colour, a dashed circle where the build doesn't know it.
 */
export function PlatformMark({
  platform,
  className,
}: {
  platform: OverviewPlatform
  className?: string
}) {
  const info = platform.zernioId
    ? getPlatformByZernioId(platform.zernioId)
    : undefined
  const Mark = info?.icon ?? CircleDashedIcon
  return (
    <Mark
      weight="fill"
      className={cn(
        'size-4 shrink-0',
        !info && 'text-tertiary-foreground',
        className,
      )}
      style={info ? { color: info.color } : undefined}
      aria-label={info?.name}
    />
  )
}

function platformIndicator(platform: OverviewPlatform): LineItemIndicator {
  return { kind: 'custom', node: <PlatformMark platform={platform} /> }
}
