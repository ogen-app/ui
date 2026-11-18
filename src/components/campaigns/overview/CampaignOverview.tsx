import type { ReactNode } from 'react'
import {
  BookOpenIcon,
  CheckIcon,
  CircleDashedIcon,
  DotsThreeIcon,
  PlusIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { IgnoredList } from '@/components/assistant/FindingsBlock'
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
import {
  counted,
  formatDate,
  formatDateRange,
  formatNumber,
  formatRelative,
} from '@/lib/intl'
import { getPlatformByZernioId } from '@/lib/platformDictionary'
import { relativeTime } from '@/lib/relativeTime'
import { SectionLink } from './OverviewCard.tsx'

/**
 * What the screen does when a row is acted on. The route wires these to the
 * assistant, the dismiss endpoint and post creation; the design harness logs
 * them. Links are links either way.
 */
export type OverviewHandlers = {
  /** A server problem's fix, asked of the campaign's assistant. */
  ask: (fix: string, problem: string) => void
  /** Every problem at once — FIX WITH ASSISTANT. */
  askAll: () => void
  ignore: (key: string) => void
  addPost: () => void
  /** A setup step, asked of Ogen: written into the composer, sent by the user. */
  withOgen: (step: SetupStep['id']) => void
  /** Opens the help centre's campaign article; absent while none serves it. */
  learnMore?: () => void
}

/**
 * The campaign's front page, drawn from `overviewModel`: a band across the top
 * saying where the campaign is in its own time, then two columns — the left
 * about time (this week, the last seven days; the first week while planning;
 * the results once it is over), the right one list of what wants the user.
 *
 * The rule for anything added here: a figure goes left, a thing to do goes
 * right, and anything that takes more than a glance to read belongs on the
 * page the row links to. Per-channel counts, the status tiles, the goal's
 * arithmetic and the assets tally all moved to their own pages for that
 * reason.
 */
export function CampaignOverview({
  model,
  campaignId,
  handlers,
  now,
}: {
  model: OverviewModel
  campaignId: string
  handlers: OverviewHandlers
  /** The day the model was worked out for; relative times read from it. */
  now: Date
}) {
  if (model.stage === 'new') {
    return (
      <Frame>
        <div className="flex h-full min-h-0 flex-col">
          <Columns
            left={
              <SetupCard
                steps={model.setup ?? []}
                campaignId={campaignId}
                handlers={handlers}
              />
            }
            right={<LearnCard learnMore={handlers.learnMore} />}
          />
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="flex h-full min-h-0 flex-col gap-3">
        {model.band && (
          <Band
            stage={model.stage}
            band={model.band}
            campaignId={campaignId}
            now={now}
          />
        )}
        <Columns
          left={<TimeColumn model={model} campaignId={campaignId} now={now} />}
          right={
            <div className={cn(SURFACE, 'flex flex-col gap-3 p-5 @4xl:flex-1')}>
              <NeedsList
                model={model}
                campaignId={campaignId}
                handlers={handlers}
              />
            </div>
          }
          rightFirst
        />
      </div>
    </Frame>
  )
}

/**
 * The page's frame: the height the campaign layout hands it, and a container
 * the columns measure against — the right rail can take a third of the
 * window, so the viewport is the wrong ruler.
 */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="@container h-full w-full">
      <div className="h-full overflow-y-auto pb-4 @4xl:overflow-hidden">
        {children}
      </div>
    </div>
  )
}

/**
 * A card on the page: the panel colour with the hairline the menu and the
 * rail are drawn with, so the cards sit in the same frame as the chrome.
 */
const SURFACE = 'rounded-md border border-border bg-primary'

/**
 * The two columns every stage shares — time on the left, what to do on the
 * right — each scrolling on its own once the container is wide enough to
 * hold both. `rightFirst` puts the to-do list on top when they stack.
 */
function Columns({
  left,
  right,
  rightFirst = false,
}: {
  left: ReactNode
  right: ReactNode
  rightFirst?: boolean
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3 @4xl:min-h-0 @4xl:overflow-y-auto">
        {left}
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-col gap-3 @4xl:min-h-0 @4xl:overflow-y-auto',
          rightFirst && 'order-first @4xl:order-none',
        )}
      >
        {right}
      </div>
    </div>
  )
}

/** A small-caps label over a block, the screen's one heading style. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-[0.06em] text-tertiary-foreground uppercase">
      {children}
    </h2>
  )
}

// --- The band ---------------------------------------------------------------

/**
 * Where we are: the stage and the day, the window, what goes out next, then
 * the campaign as a line with today on it and its phases under it, and the
 * goal as a bar. Everything here is a glance; the goal's arithmetic is on
 * Strategy and the next post's neighbours are on the calendar.
 */
function Band({
  stage,
  band,
  campaignId,
  now,
}: {
  stage: OverviewModel['stage']
  band: OverviewBand
  campaignId: string
  now: Date
}) {
  const { t, i18n } = useTranslation()
  const where =
    band.startsIn != null
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

  return (
    <section className={cn(SURFACE, 'flex flex-col gap-4 p-5')}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-lg font-medium">
          {t(`campaignOverview.stage.${stage}`)}
        </span>
        <span className="text-sm text-secondary-foreground">{where}</span>
        <span className="text-sm text-tertiary-foreground">
          {formatDateRange(
            band.start,
            band.end,
            { month: 'short', day: 'numeric', year: 'numeric' },
            i18n.language,
          )}
        </span>
        {stage !== 'ended' && (
          <span className="flex min-w-0 items-baseline gap-2 text-sm @2xl:ml-auto">
            <span className="text-tertiary-foreground">
              {t('campaignOverview.band.next')}
            </span>
            {band.next ? (
              <Link
                to="/campaigns/$campaignId/posts/$postId"
                params={{ campaignId, postId: band.next.id }}
                className="flex min-w-0 items-center gap-1.5 hover:underline"
              >
                <PlatformMark platform={band.next.platform} />
                <span className="truncate">
                  {formatTitle(
                    band.next.title ?? '',
                    t('campaignOverview.stats.untitledPost'),
                  )}
                </span>
                <span className="shrink-0 text-secondary-foreground">
                  {relativeTime(band.next.at, now, i18n.language)}
                </span>
              </Link>
            ) : (
              <span className="text-secondary-foreground">
                {t('campaignOverview.band.nothingNext')}
              </span>
            )}
          </span>
        )}
      </div>
      <Timeline band={band} />
      <GoalBar band={band} />
    </section>
  )
}

/**
 * The window as a line, today as a tick on it, and the phases under it —
 * named, the current one in the foreground. Before the start the tick sits on
 * the left edge; after the end, on the right.
 */
function Timeline({ band }: { band: OverviewBand }) {
  const { t } = useTranslation()
  const total = band.days
  const span = (from: Date, to: Date) =>
    (Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1) / total
  return (
    <div
      className="flex flex-col gap-1.5"
      aria-label={t('campaignOverview.band.timeline')}
    >
      <div className="relative h-1.5 rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-quaternary-foreground"
          style={{ width: `${band.todayAt * 100}%` }}
        />
        <div
          className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 bg-foreground"
          style={{ left: `${band.todayAt * 100}%` }}
          title={t('campaignOverview.band.today')}
        />
      </div>
      {band.phases.length > 0 && (
        <div className="flex gap-0.5 text-xs">
          {band.phases.map((phase) => (
            <div
              key={phase.name + phase.start.toISOString()}
              className={cn(
                'min-w-0 truncate border-t-2 pt-1',
                phase.current
                  ? 'border-foreground text-foreground'
                  : 'border-border text-tertiary-foreground',
              )}
              style={{ width: `${span(phase.start, phase.end) * 100}%` }}
              title={phase.name}
            >
              {phase.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Published against the goal, scheduled stacked after it. */
function GoalBar({ band }: { band: OverviewBand }) {
  const { t } = useTranslation()
  if (!band.goal) {
    return (
      <p className="text-sm text-tertiary-foreground">
        {t('campaignOverview.band.noGoal')}
      </p>
    )
  }
  const { total, published, scheduled } = band.goal
  const of = (n: number) => `${Math.min(100, (n / Math.max(1, total)) * 100)}%`
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="bg-positive" style={{ width: of(published) }} />
        <div className="bg-positive/35" style={{ width: of(scheduled) }} />
      </div>
      <p className="flex flex-wrap gap-x-3 text-sm">
        <span>
          {t('campaignOverview.band.published', {
            published: formatNumber(published),
            total: formatNumber(total),
          })}
        </span>
        {scheduled > 0 && (
          <span className="text-secondary-foreground">
            {t('campaignOverview.band.scheduled', counted(scheduled))}
          </span>
        )}
      </p>
    </div>
  )
}

// --- The left column --------------------------------------------------------

function TimeColumn({
  model,
  campaignId,
  now,
}: {
  model: OverviewModel
  campaignId: string
  now: Date
}) {
  return (
    <>
      {model.week && (
        <WeekBlock
          kind={model.week.kind}
          days={model.week.days}
          campaignId={campaignId}
          now={now}
        />
      )}
      {model.coverage && <CoverageBlock coverage={model.coverage} />}
      {model.lastWeek && (
        <LastWeekBlock
          published={model.lastWeek.published}
          performance={model.lastWeek.performance}
          campaignId={campaignId}
        />
      )}
      {model.results && (
        <ResultsBlock results={model.results} campaignId={campaignId} />
      )}
    </>
  )
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
    <section className={cn(SURFACE, 'flex flex-col gap-3 p-5')}>
      <div className="flex items-center gap-3">
        <Eyebrow>{t(`campaignOverview.week.${kind}`)}</Eyebrow>
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <SectionLink target="calendar" campaignId={campaignId}>
            {t('campaignOverview.openCalendar')}
          </SectionLink>
        </Button>
      </div>
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
    </section>
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

/**
 * Before launch: the first two weeks as a strip of days, filled where a post
 * is planned. Days the campaign doesn't publish on are drawn faint, so a gap
 * on a Sunday the campaign skips doesn't read as a gap.
 */
function CoverageBlock({
  coverage,
}: {
  coverage: NonNullable<OverviewModel['coverage']>
}) {
  const { t, i18n } = useTranslation()
  const publishing = coverage.filter((c) => c.publishing)
  const covered = publishing.filter((c) => c.posts > 0).length
  return (
    <section className={cn(SURFACE, 'flex flex-col gap-3 p-5')}>
      <Eyebrow>{t('campaignOverview.coverage.title')}</Eyebrow>
      <div className="grid grid-cols-7 gap-1">
        {coverage.map((c) => (
          <div
            key={c.date.toISOString()}
            className={cn(
              'flex h-10 flex-col items-center justify-center rounded-sm text-[11px]',
              !c.publishing
                ? 'text-quinary-foreground'
                : c.posts > 0
                  ? 'bg-positive/15 text-foreground'
                  : 'bg-secondary text-tertiary-foreground',
            )}
            title={
              formatDate(c.date, { dateStyle: 'full' }, i18n.language) ??
              undefined
            }
          >
            <span>
              {formatDate(c.date, { weekday: 'narrow' }, i18n.language)}
            </span>
            <span className="font-medium">{c.posts > 0 ? c.posts : '·'}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-secondary-foreground">
        {t('campaignOverview.coverage.summary', {
          covered: formatNumber(covered),
          days: formatNumber(publishing.length),
        })}
      </p>
    </section>
  )
}

function LastWeekBlock({
  published,
  performance,
  campaignId,
}: {
  published: number
  performance: OverviewPerformance | null
  campaignId: string
}) {
  const { t } = useTranslation()
  return (
    <section className={cn(SURFACE, 'flex flex-col gap-3 p-5')}>
      <div className="flex items-center gap-3">
        <Eyebrow>{t('campaignOverview.lastWeek.title')}</Eyebrow>
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <SectionLink target="analytics" campaignId={campaignId}>
            {t('campaignOverview.openAnalytics')}
          </SectionLink>
        </Button>
      </div>
      <Figures
        figures={[
          { label: t('campaignOverview.stats.published'), value: published },
          ...(performance
            ? [
                {
                  label: t('campaignOverview.figures.reach'),
                  value: performance.reach,
                },
                {
                  label: t('campaignOverview.figures.interactions'),
                  value: performance.interactions,
                },
              ]
            : []),
        ]}
      />
      {performance?.best && (
        <BestPost best={performance.best} campaignId={campaignId} />
      )}
    </section>
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
    <section className={cn(SURFACE, 'flex flex-col gap-3 p-5')}>
      <div className="flex items-center gap-3">
        <Eyebrow>{t('campaignOverview.results.title')}</Eyebrow>
        <Button variant="ghost" size="sm" className="ml-auto" asChild>
          <SectionLink target="analytics" campaignId={campaignId}>
            {t('campaignOverview.openAnalytics')}
          </SectionLink>
        </Button>
      </div>
      <Figures
        figures={[
          {
            label:
              results.goal != null
                ? t(
                    'campaignOverview.results.publishedOf',
                    counted(results.goal),
                  )
                : t('campaignOverview.stats.published'),
            value: results.published,
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
      {results.performance?.best && (
        <BestPost best={results.performance.best} campaignId={campaignId} />
      )}
    </section>
  )
}

/** A row of figures, the number large and its name under it. */
function Figures({
  figures,
}: {
  figures: { label: string; value: number; alert?: boolean }[]
}) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      {figures.map((f) => (
        <div key={f.label} className="flex flex-col-reverse">
          <dt className="text-xs text-tertiary-foreground">{f.label}</dt>
          <dd
            className={cn(
              'font-display text-2xl font-medium leading-7 tabular-nums',
              f.alert && 'text-destructive',
              f.value === 0 && !f.alert && 'text-tertiary-foreground',
            )}
          >
            {formatNumber(f.value, {
              notation: f.value >= 10_000 ? 'compact' : 'standard',
            })}
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
 * Everything that wants the user, in one list, worst first — one line a row
 * and its action on the right. A problem's other fixes and IGNORE are in the
 * row's menu: the row says what is wrong and offers the likeliest fix, and
 * the alternatives are a click further for the few who want them.
 */
function NeedsList({
  model,
  campaignId,
  handlers,
}: {
  model: OverviewModel
  campaignId: string
  handlers: OverviewHandlers
}) {
  const { t } = useTranslation()
  const rows = model.needs
  const askable = rows?.some((r) => r.action?.kind === 'ask') ?? false
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Eyebrow>{t(`campaignOverview.needs.${model.needsTitle}`)}</Eyebrow>
        {rows && rows.length > 0 && (
          <span className="text-xs text-tertiary-foreground tabular-nums">
            {formatNumber(rows.length)}
          </span>
        )}
        {askable && (
          <button
            type="button"
            className={cn('ml-auto', TEXT_ACTION)}
            onClick={handlers.askAll}
          >
            {t('campaignOverview.problems.fixAll')}
          </button>
        )}
      </div>
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
            <li key={row.id}>
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
    </section>
  )
}

const TEXT_ACTION =
  'cursor-pointer text-xs font-semibold tracking-[0.06em] text-foreground hover:text-secondary-foreground'

const FIX_CLASS =
  'max-w-40 shrink-0 cursor-pointer truncate border border-border px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-foreground uppercase hover:border-foreground'

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
  const menu =
    row.alternatives.length > 0 || row.ignoreKey ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cursor-pointer rounded-sm p-0.5 text-tertiary-foreground hover:text-foreground"
            aria-label={t('campaignOverview.needs.menu')}
          >
            <DotsThreeIcon className="size-4" weight="bold" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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

  const text = (
    <span className="flex min-w-0 items-baseline gap-2 py-2 whitespace-normal">
      {/* Two lines before it gives up: a problem's sentence is the whole of
          what it says, and the column is narrow. */}
      <span className="line-clamp-2" title={label}>
        {label}
      </span>
      {row.more > 0 && (
        <span className="shrink-0 text-xs text-tertiary-foreground">
          {t('campaignOverview.needs.more', counted(row.more))}
        </span>
      )}
    </span>
  )

  const action = row.action
  // A row whose action is a place is that place, whole-row clickable, the
  // way the rest of the app's line items are.
  if (action?.kind === 'section') {
    return (
      <LineItem
        asChild
        indicator={MARK[row.mark]}
        label={text}
        trailing={
          <span className="group-hover:text-primary-foreground">
            {action.label ?? sectionLabel(t, action.target)}
          </span>
        }
      >
        <TargetLink target={action.target} campaignId={campaignId} />
      </LineItem>
    )
  }

  return (
    <LineItem
      indicator={MARK[row.mark]}
      chevron={false}
      label={text}
      trailing={
        <span className="flex items-center gap-2">
          {action?.kind === 'post' ? (
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId, postId: action.postId }}
              className={FIX_CLASS}
              title={action.label}
            >
              {action.label}
            </Link>
          ) : action?.kind === 'ask' ? (
            <button
              type="button"
              className={FIX_CLASS}
              title={action.fix}
              onClick={() => runAction(action, handlers)}
            >
              {action.fix}
            </button>
          ) : action?.kind === 'add-post' ? (
            <button
              type="button"
              className={FIX_CLASS}
              onClick={handlers.addPost}
            >
              {t('campaignOverview.todo.addPost')}
            </button>
          ) : null}
          {menu}
        </span>
      }
    />
  )
}

function runAction(action: NeedsAction, handlers: OverviewHandlers) {
  if (action.kind === 'ask') handlers.ask(action.fix, action.problem)
  else if (action.kind === 'add-post') handlers.addPost()
  // `section` and `post` are links, rendered as links by the caller.
}

type T = ReturnType<typeof useTranslation>['t']

function stageTodoLabel(t: T, todo: NeedsRow['todo']): string {
  switch (todo?.kind) {
    case 'first-post':
      return t('campaignOverview.needs.firstPost')
    case 'coverage-gaps':
      return t('campaignOverview.needs.coverageGaps', counted(todo.days))
    case 'read-results':
      return t('campaignOverview.needs.readResults')
    case 'archive':
      return t('campaignOverview.needs.archive')
    default:
      return ''
  }
}

function sectionLabel(t: T, target: OverviewTarget): string {
  switch (target) {
    case 'calendar':
      return t('campaignOverview.openCalendar')
    case 'analytics':
      return t('campaignOverview.openAnalytics')
    case 'settings':
      return t('campaignOverview.openSettings')
    case 'strategy':
      return t('campaignOverview.openStrategy')
    case 'assets':
      return t('campaignOverview.openAssets')
    case 'posts':
      return t('campaignOverview.openPosts')
    case 'workspace-settings':
      return t('campaignOverview.openSettings')
  }
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
 * the three things that make one. Every step offers the same pair — do it
 * yourself, or ask Ogen — and only the first step still open is drawn dark,
 * because that is the next thing to do. Steps already done are ticked rather
 * than hidden, so the card reads as progress.
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
    <section className={cn(SURFACE, 'flex flex-col gap-4 p-5')}>
      <Eyebrow>{t('campaignOverview.setup.title')}</Eyebrow>
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="flex items-baseline gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0"
          >
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                step.done
                  ? 'bg-positive text-primary'
                  : 'border border-border text-secondary-foreground',
              )}
            >
              {step.done ? (
                <CheckIcon className="size-3.5" weight="bold" />
              ) : (
                i + 1
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  step.done && 'text-secondary-foreground line-through',
                )}
              >
                {t(`campaignOverview.setup.${step.id}.title`)}
              </span>
              <span className="text-sm text-tertiary-foreground">
                {t(`campaignOverview.setup.${step.id}.detail`)}
              </span>
              {!step.done && (
                <span className="mt-2 flex flex-wrap gap-2">
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
                    <SparkleIcon />
                    <span>{t('campaignOverview.setup.askOgen')}</span>
                  </Button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
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
 * first time would want explained, in three lines, and the way to the help
 * centre's article when one serves the topic. Teaching only — the screen
 * reads the same without it.
 */
function LearnCard({ learnMore }: { learnMore?: () => void }) {
  const { t } = useTranslation()
  const points = ['stages', 'goal', 'ogen'] as const
  return (
    <section className={cn(SURFACE, 'flex flex-col gap-4 p-5')}>
      <Eyebrow>{t('campaignOverview.learn.title')}</Eyebrow>
      <ul className="flex flex-col gap-4">
        {points.map((p) => (
          <li key={p} className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {t(`campaignOverview.learn.${p}.title`)}
            </span>
            <span className="text-sm text-tertiary-foreground">
              {t(`campaignOverview.learn.${p}.detail`)}
            </span>
          </li>
        ))}
      </ul>
      {learnMore && (
        <span>
          <Button variant="outline" size="sm" onClick={learnMore}>
            <BookOpenIcon />
            <span>{t('campaignOverview.learn.more')}</span>
          </Button>
        </span>
      )}
    </section>
  )
}

// --- Shared -----------------------------------------------------------------

/**
 * The platform's mark, drawn as the calendar draws it: filled, in the
 * network's colour, a dashed circle where the build doesn't know it.
 */
function PlatformMark({ platform }: { platform: OverviewPlatform }) {
  const info = platform.zernioId
    ? getPlatformByZernioId(platform.zernioId)
    : undefined
  const Mark = info?.icon ?? CircleDashedIcon
  return (
    <Mark
      weight="fill"
      className={cn('size-4 shrink-0', !info && 'text-tertiary-foreground')}
      style={info ? { color: info.color } : undefined}
      aria-label={info?.name}
    />
  )
}

function platformIndicator(platform: OverviewPlatform): LineItemIndicator {
  return { kind: 'custom', node: <PlatformMark platform={platform} /> }
}
