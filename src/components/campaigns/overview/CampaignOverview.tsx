import type { ReactNode } from 'react'
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
 * The campaign's front page, drawn from `overviewModel`, in two columns. The
 * left is about time: a band saying where the campaign is in its own time,
 * then this week and the last seven days (the first week while planning, the
 * results once it is over). The right, the page's full height, is one list of
 * what wants the user.
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
            right={
              <LearnCard
                learnMore={handlers.learnMore}
                campaignId={campaignId}
              />
            }
          />
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="flex h-full min-h-0 flex-col">
        <Columns
          left={
            <>
              {model.band && (
                <Band
                  stage={model.stage}
                  band={model.band}
                  campaignId={campaignId}
                  now={now}
                />
              )}
              <TimeColumn model={model} campaignId={campaignId} now={now} />
            </>
          }
          right={
            <NeedsList
              model={model}
              campaignId={campaignId}
              handlers={handlers}
            />
          }
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
 * The two columns every stage shares — where the campaign is and its time on
 * the left, what to do on the right, the full height of the page — each
 * scrolling on its own once the container is wide enough to hold both.
 */
function Columns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @4xl:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3 @4xl:min-h-0 @4xl:overflow-y-auto">
        {left}
      </div>
      <div className="flex min-w-0 flex-col gap-3 @4xl:min-h-0 @4xl:overflow-y-auto">
        {right}
      </div>
    </div>
  )
}

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

// --- The band ---------------------------------------------------------------

/**
 * Where we are: the stage and the day, the window, what goes out next, and
 * the goal as a bar. Everything here is a glance; the goal's arithmetic is on
 * Strategy and the next post's neighbours are on the calendar. (The window as
 * a line with its phases is off for now.)
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
    <section className={cn(SURFACE, 'flex flex-col gap-4 p-6')}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-xl font-medium tracking-tight">
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
      <GoalBar band={band} />
    </section>
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
    <Card
      glyph={<SectionGlyph section="analytics" />}
      title={t('campaignOverview.lastWeek.title')}
      door={{ target: 'analytics' }}
      campaignId={campaignId}
    >
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
    </Card>
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
    </Card>
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
 * Everything that wants the user, in one list, worst first. A problem's
 * other fixes and IGNORE are in the row's menu: the row says what is wrong
 * and offers the likeliest fix, and the alternatives are a click further for
 * the few who want them.
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
    <Card
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
          <button
            type="button"
            className={TEXT_ACTION}
            onClick={handlers.askAll}
          >
            {t('campaignOverview.problems.fixAll')}
          </button>
        )
      }
      campaignId={campaignId}
      className="@4xl:flex-1"
    >
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
    </Card>
  )
}

const TEXT_ACTION =
  'cursor-pointer text-xs font-semibold tracking-[0.06em] text-foreground hover:text-secondary-foreground'

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
