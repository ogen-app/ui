import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthDensity } from '@/components/campaigns/calendar/MonthDensity'
import { MonthPostCard } from '@/components/campaigns/calendar/MonthPostCard'
import { PostCard } from '@/components/campaigns/calendar/PostCard'
import { PLATFORMS_KEY } from '@/hooks/usePlatforms'
import { POST_STATUS_LABELS, type Post } from '@/types/posts'
import { cn } from '@/lib'
import {
  ACCOUNT_A,
  ACCOUNT_GONE,
  MEDIA,
  PLATFORM,
  SEEDED_PLATFORMS,
  STATUSES,
  TITLES,
  at,
  post,
} from './-fixtures'
import {
  MONTH_RUNGS,
  WEEK_RUNGS,
  pickMonthRung,
  pickWeekRung,
  weekCardHeight,
  type MonthRung,
} from '@/components/campaigns/calendar/cardRungs'
import {
  CARD_FIELDS,
  CARD_FIELD_LABELS,
  DEFAULT_CARD_FIELDS,
  type CardField,
  type CardFields,
} from '@/components/campaigns/calendar/cardFields'
import {
  CalendarCheckIcon,
  CheckCircleIcon,
  HandIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  XCircleIcon,
  type Icon,
} from '@phosphor-icons/react'
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  Caption,
  Cell,
  LANE_WIDTH,
  Lane,
  Section,
  Specimen,
  WeekGrid,
  cellLaneHeight,
  weekLaneHeight,
} from './-parts'

/**
 * A query client that exists only to make the account states real.
 *
 * `PostCard`'s warning flag partly depends on `usePublishingAccount`, which
 * reads the platforms query — so "two accounts connected and this post names
 * neither" cannot be faked from a post fixture alone. Seeding is deliberately
 * scoped to its own provider rather than the app's client: this module is in
 * the main bundle, and writing fixture platforms into the shared cache would
 * leave the real calendar resolving accounts against them for the rest of the
 * session.
 */
const seededClient = new QueryClient()
seededClient.setQueryData(PLATFORMS_KEY, SEEDED_PLATFORMS)

/* ---------------------------------------------------------------- fixtures */

/**
 * The month rungs by name. A specimen that pins one is pinning a *card*, not a
 * position, and the ladder has grown twice at the top — an index would have
 * quietly re-pointed every one of these both times.
 */
const RUNG = Object.fromEntries(MONTH_RUNGS.map((r) => [r.id, r])) as Record<
  MonthRung['id'],
  MonthRung
>

const CLEAN = post({ title: TITLES.medium })

const BY_STATUS = STATUSES.map((status) =>
  post({
    status,
    title: POST_STATUS_LABELS[status],
    scheduled_at: at('09:30'),
    published_at: status === 'published' ? at('09:30') : null,
  }),
)

const FLAGS = [
  { note: 'Draft — nothing to say', p: post({ title: TITLES.short }) },
  {
    note: 'Auto-publish — a plane on the left, the lock in the corner',
    p: post({ status: 'scheduled', title: TITLES.short }),
  },
  {
    note: 'Published — a check, locked for good',
    p: post({ status: 'published', title: TITLES.short, published_at: at('09:30') }),
  },
  { note: 'Failed — the publish went wrong', p: post({ status: 'failed', title: TITLES.short }) },
  {
    note: 'Not published — the window passed',
    p: post({ status: 'not_published', title: TITLES.short }),
  },
  {
    note: 'No platform — nothing can publish it',
    p: post({ platform_id: PLATFORM.none, platform_post_type: '', title: TITLES.short }),
  },
  {
    note: 'No post type — no shape to publish in',
    p: post({ platform_post_type: '', title: TITLES.short }),
  },
  {
    note: 'Locked AND broken — the warning takes the status slot, the corner is unaffected',
    p: post({ status: 'scheduled', platform_post_type: '', title: TITLES.short }),
  },
]

const ACCOUNTS = [
  {
    note: 'Two accounts, one named — clean',
    p: post({
      platform_id: PLATFORM.youtube,
      platform_post_type: 'video',
      social_account_id: ACCOUNT_A,
      title: TITLES.short,
    }),
  },
  {
    note: 'Two accounts, none named — the server refuses to schedule this',
    p: post({
      platform_id: PLATFORM.youtube,
      platform_post_type: 'video',
      title: TITLES.short,
    }),
  },
  {
    note: 'Names an account the platform no longer has',
    p: post({
      platform_id: PLATFORM.youtube,
      platform_post_type: 'video',
      social_account_id: ACCOUNT_GONE,
      title: TITLES.short,
    }),
  },
]

const TITLE_LADDER = [
  { note: '14 characters — top of the range', p: post({ title: TITLES.short }) },
  { note: '39 — one step down', p: post({ title: TITLES.medium }) },
  { note: '64 — the 12px floor', p: post({ title: TITLES.long }) },
  { note: '141 — the floor plus line-clamp-2', p: post({ title: TITLES.overflowing }) },
  { note: 'No title at all', p: post({ title: TITLES.empty }) },
]

const WIDE = post({ title: TITLES.long })

const MEDIA_BACKINGS = [
  { note: 'Pale — the easy case', p: post({ title: TITLES.medium, media_urls: [MEDIA.pale] }) },
  {
    note: 'Saturated mid-tone — the ordinary photograph',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.vivid] }),
  },
  {
    note: 'Near-black — the longest fade, and where the join shows if it shows',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.dark] }),
  },
  {
    note: 'Pale top, dark bottom — the whole range inside one card',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.split] }),
  },
  {
    note: 'Fine detail — where a wash reads as blur rather than as a fade',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.detailed] }),
  },
  {
    note: 'A face — the crop takes the top and bottom of it',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.portrait] }),
  },
  {
    note: '3:2 — the crop still applies; the picture fills the card either way',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.landscape] }),
  },
]

/** The desaturation, against the same picture on a card with nothing wrong. */
const PROBLEM_BACKINGS = [
  {
    note: 'Clean — full colour',
    p: post({ title: TITLES.medium, media_urls: [MEDIA.vivid] }),
  },
  {
    note: 'Failed — the publish went wrong',
    p: post({ status: 'failed', title: TITLES.medium, media_urls: [MEDIA.vivid] }),
  },
  {
    note: 'No post type — nothing can publish it',
    p: post({ platform_post_type: '', title: TITLES.medium, media_urls: [MEDIA.vivid] }),
  },
  {
    note: 'Not published — the window passed',
    p: post({ status: 'not_published', title: TITLES.medium, media_urls: [MEDIA.portrait] }),
  },
]

/** Plain and backed together, which is what a real week column looks like. */
const MIXED_COLUMN = [
  post({ title: TITLES.medium, media_urls: [MEDIA.vivid] }),
  post({ title: TITLES.short, status: 'ready_for_publish' }),
  post({ title: TITLES.long, media_urls: [MEDIA.dark] }),
  post({ title: TITLES.medium, status: 'scheduled' }),
  post({ title: TITLES.short, media_urls: [MEDIA.portrait] }),
]

/* The field switches. One post that has something for every row to show. */
const FIELD_POST = post({ title: TITLES.medium, media_urls: [MEDIA.vivid] })

/** The same post with nothing to back it — the majority of a real calendar. */
const PLAIN_FIELD_POST = post({ title: TITLES.medium })

const without = (field: CardField): CardFields => ({
  ...DEFAULT_CARD_FIELDS,
  [field]: false,
})

const onlyField = (field: CardField): CardFields =>
  Object.fromEntries(CARD_FIELDS.map((f) => [f, f === field])) as CardFields

/** A week's Tuesday, three of them backed — the load the settings act on. */
const FIELD_COLUMN_POSTS = [
  post({ title: TITLES.medium, media_urls: [MEDIA.vivid] }),
  post({ title: TITLES.short, status: 'ready_for_publish' }),
  post({ title: TITLES.long, media_urls: [MEDIA.portrait] }),
  post({ title: TITLES.medium, status: 'scheduled' }),
  post({ title: TITLES.short, media_urls: [MEDIA.pale] }),
  post({ title: TITLES.medium }),
  post({ title: TITLES.short, status: 'ready_for_publish' }),
]

const FIELD_COLUMNS: { note: string; fields: CardFields }[] = [
  { note: 'Default', fields: DEFAULT_CARD_FIELDS },
  { note: 'Pictures off', fields: without('image') },
  { note: 'Account on', fields: { ...DEFAULT_CARD_FIELDS, account: true } },
]

const TIME_LADDER = [
  { note: 'Scheduled — the time it goes out', p: post({ title: TITLES.short }) },
  {
    note: 'Published — falls back to when it went out',
    p: post({ status: 'published', title: TITLES.short, scheduled_at: null, published_at: at('07:05') }),
  },
  {
    note: "Neither — the row is omitted, not blanked",
    p: post({ title: TITLES.short, scheduled_at: null }),
  },
]

const PLATFORM_LADDER = [
  { id: PLATFORM.linkedin, type: 'carousel' },
  { id: PLATFORM.instagram, type: 'reel' },
  { id: PLATFORM.facebook, type: 'story' },
  { id: PLATFORM.x, type: 'thread' },
  { id: PLATFORM.threads, type: 'text-post' },
  { id: PLATFORM.youtube, type: 'short' },
  { id: PLATFORM.none, type: '' },
].map(({ id, type }) =>
  post({ platform_id: id, platform_post_type: type, title: TITLES.short }),
)

const MONTH_BY_STATUS = STATUSES.map((status) =>
  post({
    status,
    title: POST_STATUS_LABELS[status],
    published_at: status === 'published' ? at('09:30') : null,
  }),
)

const MONTH_CONTENT = [
  { note: 'Time and title', p: post({ title: TITLES.short }) },
  { note: 'A title no cell fits — truncated, and the full one is the tooltip', p: post({ title: TITLES.overflowing }) },
  { note: 'Untitled', p: post({ title: TITLES.empty }) },
  {
    note: 'No time — the title takes the whole line',
    p: post({ title: TITLES.medium, scheduled_at: null }),
  },
]

/**
 * A day's worth of posts, one every twenty minutes from 06:00 — spaced rather
 * than stacked so the cards carry distinct times, and in minutes rather than
 * hours so a 31-post day still lands inside the day it belongs to.
 */
function day(count: number, platforms: string[] = [PLATFORM.linkedin]): Post[] {
  return Array.from({ length: count }, (_, i) => {
    const minutes = 6 * 60 + i * 20
    const hhmm = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    return post({
      title: `Post ${i + 1}`,
      platform_id: platforms[i % platforms.length],
      platform_post_type: 'text-post',
      scheduled_at: at(hhmm),
    })
  })
}

const MIX = [PLATFORM.linkedin, PLATFORM.instagram, PLATFORM.facebook, PLATFORM.x, PLATFORM.threads, PLATFORM.youtube]

const DENSITIES = [
  { note: 'One channel', posts: day(5) },
  { note: 'Two', posts: day(7, MIX.slice(0, 2)) },
  { note: 'Three', posts: day(9, MIX.slice(0, 3)) },
  { note: 'All six — wraps inside the cell', posts: day(14, MIX) },
  { note: 'A post with no platform yet, sorted last', posts: day(6, [PLATFORM.linkedin, PLATFORM.none]) },
  { note: 'Counts into double figures', posts: day(31, MIX.slice(0, 2)) },
]

const CELL_LANE = cellLaneHeight(CELL_HEIGHT)
/** One count per rung, plus the one past the last — the whole ladder in a row. */
const SWAP = [1, 2, 3, 4, 6, 12]

/** A busy week column, for the rung ladder — three of them carry pictures. */
const BUSY = [1, 2, 3, 4, 6].map((n) =>
  day(n).map((p, i) => (i % 3 === 0 ? { ...p, media_urls: [MEDIA.portrait] } : p)),
)

const FIXTURE_DAY = new Date(2026, 7, 12)

/** The week lane the ladder specimens run against — a real column's height. */
const WEEK_LANE_BOX = 460
const WEEK_LANE = weekLaneHeight(WEEK_LANE_BOX)

function factsFor(posts: Post[]) {
  return posts.map((p) => ({
    hasTime: Boolean(p.scheduled_at ?? p.published_at),
    hasFlag: p.status === 'scheduled' || p.status === 'published',
    hasImage: p.media_urls.length > 0,
  }))
}

function rungFor(posts: Post[], lane = WEEK_LANE, fields = DEFAULT_CARD_FIELDS) {
  return pickWeekRung(factsFor(posts), lane, fields)
}

/*
 * The five-vs-seven grid in section 2: one week's load, drawn at both column
 * counts. The two grids share a width and stack — the whole comparison is
 * "same space, fewer columns", so they have to be the same width, and stacked
 * puts one grid's columns directly above the other's instead of asking the eye
 * to carry a width across a gap.
 */
const WEEK_GRID_WIDTH = 840
const WEEK_GRID_HEIGHT = 420
const WEEK_DAYS = [
  { label: 'Monday', dateLabel: '10 August' },
  { label: 'Tuesday', dateLabel: '11 August' },
  { label: 'Wednesday', dateLabel: '12 August' },
  { label: 'Thursday', dateLabel: '13 August' },
  { label: 'Friday', dateLabel: '14 August' },
  { label: 'Saturday', dateLabel: '15 August' },
  { label: 'Sunday', dateLabel: '16 August' },
]
const WEEK_LOAD: Post[][] = [
  [post({ title: TITLES.medium, media_urls: [MEDIA.portrait] })],
  day(2, MIX.slice(0, 2)),
  [post({ title: TITLES.long }), post({ title: TITLES.short, status: 'scheduled' })],
  day(4, MIX.slice(0, 3)),
  [post({ title: TITLES.medium, status: 'ready_for_publish' })],
  [],
  [post({ title: TITLES.short, status: 'published', published_at: at('11:00') })],
]

/* -------------------------------------------------------------------- page */

/**
 * TEMPORARY design harness — every state the two calendar cards and the
 * density summary can be in, on one page.
 *
 * The week and the month draw the same object twice, and the argument this
 * page exists to test is that the month's card is a *second representation*
 * rather than a smaller copy of the week's: it keeps when and what, and drops
 * platform, post type and the warning flag, because a 20px line has room for
 * two facts and a month is read for those two. Section 1 puts them side by
 * side; everything after it walks one axis at a time.
 *
 * Nothing here is reachable from the app. Delete `routes/design/` and the
 * `/design` exemption in `__root.tsx` when the design is settled.
 */
export function CalendarCardsDesignHarness() {
  return (
    <div className="min-h-svh bg-background px-8 py-8 text-foreground">
      <header className="mb-12 flex max-w-3xl flex-col gap-2">
        <h1 className="font-display text-xl font-medium tracking-tight">Calendar cards</h1>
        <p className="text-sm text-tertiary-foreground">
          Every state of the week card, the month card and the density summary, drawn from
          fixtures in the frame each one really sits in — a {LANE_WIDTH}px column lane, a{' '}
          {CELL_WIDTH}×{CELL_HEIGHT} month cell. Temporary: delete with{' '}
          <code className="text-xs">routes/design/</code>.
        </p>
        <p className="text-sm text-tertiary-foreground">
          Cards are real <code className="text-xs">Link</code>s. Clicking one leaves the harness
          for a post that does not exist, so don&apos;t.
        </p>
      </header>

      <Section
        title="1 · Two representations, not two sizes"
        intro="The same post in both views. The week card is taller than a whole month cell, so shrinking it was never on the table — the month card is a different reading of the same row, keeping when and what and dropping the rest."
      >
        <Specimen label="One post, both cards">
          <Lane caption="Week — time, title, platform, and the media if there is any">
            <PostCard post={CLEAN} />
          </Lane>
          <Cell caption="Month — the same post, on one line">
            <MonthPostCard post={CLEAN} rung={RUNG.regular} />
          </Cell>
        </Specimen>
      </Section>

      <Section
        title="2 · The week at five days and seven"
        intro="Hiding the weekend does not just remove two columns — it makes the other five wider, and the card sizes its title off its own width. So five days and seven days are two different cards, and the only honest way to judge either is against the other. The two grids below are the same width and hold the same posts, stacked so one grid's columns land directly above the other's; only the column count differs."
      >
        <Specimen
          label="Same posts, same width, five days against seven"
          note="Note that the lane has no inset at all — cards run to the column's edges and a 2px gap is the only thing between them. It used to be 4px on every side, which at a 150px column was five per cent of the card's width spent on nothing: the lane is a container, not a frame, and the gap already does the job the inset was there for."
        >
          <div className="flex w-full flex-col gap-8">
            {[5, 7].map((count) => {
              const columnWidth = Math.round(WEEK_GRID_WIDTH / count)
              return (
                <WeekGrid
                  key={count}
                  width={WEEK_GRID_WIDTH}
                  height={WEEK_GRID_HEIGHT}
                  caption={`${count} days · ${columnWidth}px columns`}
                  columns={WEEK_DAYS.slice(0, count).map((d, i) => ({
                    key: d.label,
                    label: d.label,
                    dateLabel: d.dateLabel,
                    lane: (() => {
                      const posts = WEEK_LOAD[i] ?? []
                      const rung = rungFor(posts)
                      return posts.map((p) => <PostCard key={p.id} post={p} rung={rung} />)
                    })(),
                  }))}
                />
              )
            })}
          </div>
        </Specimen>
      </Section>

      <Section
        title="3 · Week card · status"
        intro="Seven statuses, each with its 2px left accent from the shared table in `calendar/status.ts` — shared so the two views can never disagree about what colour a draft is. The card no longer spends a line on the word: the same colour reaches the indicator icon beside the time, so the edge and the mark always agree. Draft is the one place the two tables part company — the edge stays pale, the mark takes the grey of the type beside it, because a hairline at the rim and a 14px glyph inside the content are not the same drawing problem. Every card lies flat at rest; hover one and only the five whose date is still editable will lift. The lift has somewhere to go, which took two things: a lane that isn't overflowing doesn't scroll, and every lane keeps 4px of side padding — what this theme's `--shadow-md` (`0 5px 10px -1px`) actually reaches sideways, not the 2px Tailwind's stock one would — because anything that clips, the lane when it does scroll or the grid at its first and last column, clips at the padding box. The column gutter can't pay for it; the gutter is outside all of those."
      >
        <Specimen label="The full ladder">
          <Lane width={170} caption="All seven, in lifecycle order — the status is the accent and the icon's tint">
            {BY_STATUS.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </Lane>
        </Specimen>
      </Section>

      <Section
        title="4 · Week card · the indicator"
        intro="Status and time used to be two rows — a word at the top, an hour with a clock lower down. They are one now. The leading mark takes the status's colour and its shape: a plane for a post that leaves on its own, a check for one that already left, a clock for the rest, and a warning in place of all of them where something is broken. Ranking the lock into that same slot was the bug — it made `scheduled` and `published`, the two most distinct things a post can be, draw the same padlock. It is an independent attribute now (`LockMark`, not `status.ts`), two tones lighter, and it sits at the far right of the row: everything on the left is what this post is, and the one thing on the right is what you can't do to it."
      >
        <Specimen label="Plane, check, clock, warning — and the lock at the far end">
          {FLAGS.map(({ note, p }) => (
            <Lane key={p.id} caption={note}>
              <PostCard post={p} />
            </Lane>
          ))}
        </Specimen>

        <Specimen
          label="Account resolution"
          note="The one problem a post fixture can't produce on its own — it needs two accounts to exist on the platform. Seeded into a throwaway query client, on YouTube, which nothing else here publishes to."
        >
          <QueryClientProvider client={seededClient}>
            {ACCOUNTS.map(({ note, p }) => (
              <Lane key={p.id} caption={note}>
                <PostCard post={p} />
              </Lane>
            ))}
          </QueryClientProvider>
        </Specimen>
      </Section>

      <Section
        title="5 · Week card · title"
        intro="The type scale runs off two things at once — how wide the card is, and how much there is to fit — so a longer title starts lower in the range and reaches the 12px floor sooner. Below the floor is line-clamp-2 and nothing else."
      >
        <Specimen label="Length ladder, at the column floor">
          {TITLE_LADDER.map(({ note, p }) => (
            <Lane key={p.id} caption={note}>
              <PostCard post={p} />
            </Lane>
          ))}
        </Specimen>
      </Section>

      <Section
        title="6 · Week card · column width"
        intro="Columns are flex-1 from a 150px floor, so the same card is cramped on a seven-day week and roomy on a two-day one. The card is an @container and sizes its title off its own width — which is why hiding five weekdays has to be tested here rather than assumed."
      >
        <Specimen label="One title, four widths">
          {[150, 190, 240, 320].map((width) => (
            <Lane key={width} width={width} caption={`${width}px`}>
              <PostCard post={WIDE} />
            </Lane>
          ))}
        </Specimen>
      </Section>

      <Section
        title="7 · Week card · the two types"
        intro="There are two week cards, and a post's media decides which it is: plain, or backed by its picture. A backed card is a hundred pixels taller — the band of clear picture on top of it — and that is not a rounding error, it is five times what any rung on the ladder buys back. Only `media_urls` reaches the card at all; the editor's uploads live in `post_attachments` and a week view will not make one request per card for them."
      >
        <Specimen
          label="Plain against backed"
          note="The same post, once without a picture and once with. The picture is full-bleed behind the whole card; what you see of it is decided by the gradient over it — clear for the first 84px, then an eased ramp that reaches 90% of the card's own fill at the bottom edge and stops there. The rows therefore sit on the picture rather than below it, on the stretch where it is giving way, and the last row still has a tenth of a photograph under it."
        >
          <Lane caption="Plain — 89px">
            <PostCard post={post({ title: TITLES.medium })} />
          </Lane>
          <Lane caption="Backed — 189px, the extra hundred all picture">
            <PostCard post={post({ title: TITLES.medium, media_urls: [MEDIA.vivid] })} />
          </Lane>
        </Specimen>

        <Specimen
          label="What the fade has to survive"
          note="Real photographs rather than flat swatches, because the thing that kills 12px grey is not a tone but a highlight landing exactly where a letter is. The ramp is a curve, not a line: soft off the top so the picture is not cut by a visible edge, steepest around a fifth of the way down, and roughly 87% covered by 30% of the way. It now starts 24px above the first row rather than level with it, which is what gives that row the same footing as the rest — the run-up is spent on the curve's soft toe, where nothing much was happening anyway. The other end stops at 90%, so the bottom of the card is still a tenth photograph rather than flat fill. Two things to judge and they pull against each other: whether the fade reads as one surface rather than a strip stuck on top, and whether every row survives. The dark and split cards are where both break first; the knee's position in `FADE_CURVE` and `FADE_MAX` are the two dials."
        >
          {MEDIA_BACKINGS.map(({ note, p }) => (
            <Lane key={p.id} caption={note}>
              <PostCard post={p} />
            </Lane>
          ))}
        </Specimen>

        <Specimen
          label="A column of them"
          note="The case the picture is for: finding one post among several without reading any of them. Mixed plain and backed, as a real week is — and the honest look at what the band costs a column, since three pictures here are three hundred pixels. Five backed posts do not fit a real column at any rung, and what a lane does about that is scroll: the cards are `shrink-0`, so the overflow lands on the lane instead of taking a few pixels off every card. Without it flexbox quietly compressed each card to fit, and the picture band — the tallest thing on the card and the one with no text in it to resist — went first."
        >
          <Lane height={WEEK_LANE_BOX} caption="Mixed, at one rung — the lane scrolls">
            {MIXED_COLUMN.map((pst) => (
              <PostCard key={pst.id} post={pst} rung={rungFor(MIXED_COLUMN)} />
            ))}
          </Lane>
          <Lane height={WEEK_LANE_BOX} caption="The same five, pictures off — fits, no scroll">
            {MIXED_COLUMN.map((pst) => (
              <PostCard
                key={pst.id}
                post={pst}
                fields={without('image')}
                rung={rungFor(MIXED_COLUMN, WEEK_LANE, without('image'))}
              />
            ))}
          </Lane>
        </Specimen>

        <Specimen
          label="A picture on a post that can't publish"
          note="The same photograph on a clean card and on three broken ones. A full-colour photograph is the most confident thing on the screen, and a card that can't publish has no business being the brightest in the column — so the picture drains to 70% grey, driven by the same flag that turns the status mark into a warning. 70% rather than 100% because the point is that it is *less* than the others, not that it has become a different kind of object."
        >
          {PROBLEM_BACKINGS.map(({ note, p }) => (
            <Lane key={p.id} caption={note}>
              <PostCard post={p} />
            </Lane>
          ))}
        </Specimen>
      </Section>

      <Section
        title="8 · Week card · what the user leaves on"
        intro="Six switches in Calendar Settings, stored per user per campaign. They are not the rung ladder and must not be read as a smaller version of it: the ladder is *space* and can only take away from what is allowed, while these are *preference* and hold at every size. The picture is the clearest case — it is the most expensive thing on the card and the ladder still won't drop it, because whether a calendar shows pictures is a question the ladder has no standing to answer. All but one can be off; the status colour on the left edge has no switch at all."
      >
        <Specimen
          label="Every field, one at a time — on a post with a picture"
          note="The default card, then the same post with each field turned off on its own. Note that the account row is off by default and appears only in its own specimen — turning it on is what adds a row nobody had yesterday."
        >
          <Lane caption="Default — image, time, title, platform">
            <PostCard post={FIELD_POST} />
          </Lane>
          {CARD_FIELDS.filter((field) => DEFAULT_CARD_FIELDS[field]).map((field) => (
            <Lane key={field} caption={`No ${CARD_FIELD_LABELS[field].toLowerCase()}`}>
              <PostCard post={FIELD_POST} fields={without(field)} />
            </Lane>
          ))}
        </Specimen>

        <Specimen
          label="Every field, one at a time — on a post without one"
          note="The same ladder on a post that has no media, which is the majority of a real calendar and the version of these cards nobody was looking at. Row for row it is the row above with the band taken out, and that is the thing worth checking: the switches have to read the same on a card whose top is its own fill as on one whose top is a photograph. The image switch is left out here — on a post with nothing to show it turns nothing off."
        >
          <Lane caption="Default — time, title, platform">
            <PostCard post={PLAIN_FIELD_POST} />
          </Lane>
          {CARD_FIELDS.filter((field) => DEFAULT_CARD_FIELDS[field] && field !== 'image').map(
            (field) => (
              <Lane key={field} caption={`No ${CARD_FIELD_LABELS[field].toLowerCase()}`}>
                <PostCard post={PLAIN_FIELD_POST} fields={without(field)} />
              </Lane>
            ),
          )}
        </Specimen>

        <Specimen
          label="The two rows that are off by default"
          note="Writing the status out is the only switch that moves another field: it takes the slot beside the mark, so the time drops to a line of its own rather than being squeezed beside a word. The account is the post's publisher, resolved exactly as the schedule button resolves it — and drawn even when there isn't one, because “no account” is the state the server refuses to schedule and the state most worth seeing."
        >
          <Lane caption="Status written out — time on its own line">
            <PostCard post={FIELD_POST} fields={{ ...DEFAULT_CARD_FIELDS, status: true }} />
          </Lane>
          <Lane caption="Account on — resolved">
            <QueryClientProvider client={seededClient}>
              <PostCard
                post={post({
                  platform_id: PLATFORM.youtube,
                  platform_post_type: 'video',
                  social_account_id: ACCOUNT_A,
                  title: TITLES.medium,
                })}
                fields={{ ...DEFAULT_CARD_FIELDS, account: true }}
              />
            </QueryClientProvider>
          </Lane>
          <Lane caption="Account on — no platform, so nothing to resolve to">
            {/* Deliberately platform-less rather than merely account-less: the
                harness runs inside the real app, so a LinkedIn fixture resolves
                against whatever this workspace has actually connected and the
                specimen would say something different on every machine. */}
            <PostCard
              post={post({ platform_id: PLATFORM.none, platform_post_type: '', title: TITLES.medium })}
              fields={{ ...DEFAULT_CARD_FIELDS, account: true }}
            />
          </Lane>
          <Lane caption="Both, plus the picture — the tallest card there is">
            <PostCard
              post={post({ title: TITLES.long, media_urls: [MEDIA.vivid] })}
              fields={{ ...DEFAULT_CARD_FIELDS, status: true, account: true }}
            />
          </Lane>
        </Specimen>

        <Specimen
          label="The floor"
          note="One field left on, which the panel will not let the user go below. A card down to one row says its status in words whether or not the status switch is on — the mark, and “Draft” beside it. Without that rule this specimen was a title on its own, a time on its own, and, on a post with no picture, an empty white rectangle: the accent down the left edge is a colour with nothing to attach it to, and a user who arrives here by flipping switches reads it as the calendar being broken rather than as their own doing. Note the “only time” card, which is now two rows — the word takes the slot beside the mark and displaces the time, exactly as the status switch does, because the floor and the switch reach the same card by different routes."
        >
          {(['title', 'time', 'image'] as CardField[]).map((only) => (
            <Lane key={only} caption={`Only ${CARD_FIELD_LABELS[only].toLowerCase()}`}>
              <PostCard post={FIELD_POST} fields={onlyField(only)} />
            </Lane>
          ))}
          <Lane caption="Only image — on a post that hasn't got one">
            <PostCard post={post({ title: TITLES.short, scheduled_at: null })} fields={onlyField('image')} />
          </Lane>
          <Lane caption="Two fields — above the floor, so no word">
            <PostCard post={FIELD_POST} fields={{ ...onlyField('title'), time: true }} />
          </Lane>
        </Specimen>

        <Specimen
          label="What it does to a column"
          note="The same seven posts under three settings. This is the argument for having the switches at all: turning the pictures off is worth more column than the whole rung ladder, and turning the account on costs a row on every card in the week."
        >
          {FIELD_COLUMNS.map(({ note, fields: f }) => (
            <Lane key={note} height={WEEK_LANE_BOX} caption={note}>
              {FIELD_COLUMN_POSTS.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  fields={f}
                  rung={rungFor(FIELD_COLUMN_POSTS, WEEK_LANE, f)}
                />
              ))}
            </Lane>
          ))}
        </Specimen>
      </Section>

      <Section
        title="9 · Week card · time and platform"
        intro="The indicator row disappears rather than empties when there is nothing to put in it. An unscheduled post never appears in the grid — it waits in the rail — but the card is the same component there, so the no-time state is real: the row goes, unless a warning or a lock is holding it open."
      >
        <Specimen label="Time source">
          {TIME_LADDER.map(({ note, p }) => (
            <Lane key={p.id} caption={note}>
              <PostCard post={p} />
            </Lane>
          ))}
        </Specimen>

        <Specimen
          label="Every platform, plus none"
          note="Brand hues are hard-coded in the platform dictionary, so these are the one place in the app where a colour is not a token. No platform falls back to a dashed circle in the muted tertiary — an absence, not a warning; the warning flag above says that separately."
        >
          <Lane width={170} caption="Six platforms and an unassigned post">
            {PLATFORM_LADDER.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </Lane>
        </Specimen>
      </Section>

      <Section
        title="10 · Month card"
        intro="Status accent, mark, time, title — and the lock at the far right, the same arrangement the week card uses. A plane for auto-publish, a check for published, both from the week's own table, so the two views can't drift. The lock has no width threshold where the time does: a time that drops out leaves a card that says less, a lock that drops out leaves one that says something false, so it costs the title 18px at every width. The warning is the one signal that doesn't make it across — it needs the account resolved, which is a hook per card, and a six-row month grid will not pay it. A broken post therefore wears an ordinary clock here. Everything below is the single-line card; the two-line ones are in section 12, with the ladder that decides between them."
      >
        <Specimen label="The same seven statuses">
          <Cell height={CELL_HEIGHT + 60} caption="Accent colours match section 3 exactly">
            {MONTH_BY_STATUS.map((p) => (
              <MonthPostCard key={p.id} post={p} rung={RUNG.regular} />
            ))}
          </Cell>
        </Specimen>

        <Specimen label="What fits on the line">
          {MONTH_CONTENT.map(({ note, p }) => (
            <Cell key={p.id} caption={note}>
              <MonthPostCard post={p} rung={RUNG.regular} />
            </Cell>
          ))}
        </Specimen>

        <Specimen
          label="Cell width"
          note="Hiding weekdays widens every remaining column; a seven-day month on a narrow window squeezes them. The time is never truncated — only the title is."
        >
          {[96, CELL_WIDTH, 180, 260].map((width) => (
            <Cell key={width} width={width} caption={`${width}px`}>
              <MonthPostCard post={post({ title: TITLES.medium })} rung={RUNG.regular} />
            </Cell>
          ))}
        </Specimen>

        <Specimen label="A spill day" note="Days from the neighbouring months are real days — droppable, clickable, just quieter.">
          <Cell day={31} outside caption="31 July, seen from August">
            <MonthPostCard post={post({ title: TITLES.short })} rung={RUNG.regular} />
          </Cell>
        </Specimen>
      </Section>

      <Section
        title="11 · Density"
        intro="What a day looks like once its posts outnumber the rows the cell can hold: the channel mix and how much of each, instead of three titles and a lie about the rest. Grouped by platform because that is the one thing a glyph can say without words — “Instagram Reel ×3” does not fit where a logo and a number do. Biggest group first; the whole block opens the week containing that day."
      >
        <Specimen label="One group to six">
          {DENSITIES.map(({ note, posts }, i) => (
            <Cell key={i} caption={`${note} · ${posts.length} posts`}>
              <MonthDensity campaignId="fixture-campaign" day={FIXTURE_DAY} posts={posts} />
            </Cell>
          ))}
        </Specimen>
      </Section>

      <Section
        title="12 · The swap"
        intro={`Where the cards stop and the density starts. The cell measures its own lane rather than assuming a number, because a month is four to six rows deep and the row height moves with both the month and the window. It tries the 52px card first — two lines of 13px title under the time — then the 34px two-line one, then the 20px row, then the 16px one, and only when none of them fits every post does the day become a summary. So nothing is ever half-shown, a cell that would once have collapsed at five posts shows five, and a quiet day spends what it has left on lines and on type rather than banking it.`}
      >
        <Specimen label={`A ${CELL_HEIGHT}px cell — one post at a time`}>
          {SWAP.map((count) => {
            const posts = day(count, MIX.slice(0, 3))
            const rung = pickMonthRung(count, CELL_LANE)
            return (
              <Cell
                key={count}
                caption={
                  rung
                    ? `${count} post${count === 1 ? '' : 's'} · ${rung.id} (${rung.height}px)`
                    : `${count} posts — no row size fits, so: density`
                }
              >
                {rung ? (
                  posts.map((p) => <MonthPostCard key={p.id} post={p} rung={rung} />)
                ) : (
                  <MonthDensity campaignId="fixture-campaign" day={FIXTURE_DAY} posts={posts} />
                )}
              </Cell>
            )
          })}
        </Specimen>

        <Specimen
          label="A shorter cell decides differently"
          note="The same five posts at three cell heights. The threshold is not a constant in the code and should not be one in your head."
        >
          {[CELL_HEIGHT - 44, CELL_HEIGHT, CELL_HEIGHT + 44].map((height) => {
            const posts = day(5, MIX.slice(0, 3))
            const rung = pickMonthRung(posts.length, cellLaneHeight(height))
            return (
              <Cell
                key={height}
                height={height}
                caption={`${height}px → ${rung ? `${rung.id} rows` : 'density'}`}
              >
                {rung ? (
                  posts.map((p) => <MonthPostCard key={p.id} post={p} rung={rung} />)
                ) : (
                  <MonthDensity campaignId="fixture-campaign" day={FIXTURE_DAY} posts={posts} />
                )}
              </Cell>
            )
          })}
        </Specimen>

        <Specimen
          label="All four rungs, side by side"
          note="Between the lower two the only difference is the row height and the type on it. The upper two are a different card: the time takes a line of its own, so the title gets the card's full width rather than what the time leaves of it, and the width rule below stops applying — there is nothing left for it to arbitrate. The top one goes further and gives the title two lines at 13px, which is the only rung where a title is set to be read rather than recognised. Everything a month card says, all four still say."
        >
          {MONTH_RUNGS.map((rung) => (
            <Cell
              key={rung.id}
              height={CELL_HEIGHT + 60}
              caption={`${rung.id} · ${rung.height}px rows · ${rung.lines === 2 ? 'two lines' : 'one line'}${rung.titleLines === 2 ? ', title on two' : ''}`}
            >
              {day(3, MIX.slice(0, 3)).map((p) => (
                <MonthPostCard key={p.id} post={p} rung={rung} />
              ))}
            </Cell>
          ))}
        </Specimen>

        <Specimen
          label="What the tallest rung is for"
          note="A long title at each of the two-line sizes. On the 34px card the title is one line and clamps at whatever the cell is wide; on the 52px card it gets two lines of 13px and most real titles arrive whole. It is the quiet-day card by construction — two of them fill a cell — but a quiet day is most of a month, and the alternative was a truncated title with 50px of nothing under it."
        >
          <Cell caption="34px — one line, truncated">
            <MonthPostCard post={post({ title: TITLES.long })} rung={RUNG.roomy} />
          </Cell>
          <Cell caption="52px — two lines at 13px">
            <MonthPostCard post={post({ title: TITLES.long })} rung={RUNG.generous} />
          </Cell>
          <Cell caption="Two of them — the whole cell">
            {day(2).map((p) => (
              <MonthPostCard key={p.id} post={p} rung={RUNG.generous} />
            ))}
          </Cell>
          <Cell caption="Past two lines — the clamp, and the tooltip has the rest">
            <MonthPostCard post={post({ title: TITLES.overflowing })} rung={RUNG.generous} />
          </Cell>
          <Cell caption="No time — the single line, at the tall rung's height">
            <MonthPostCard
              post={post({ title: TITLES.medium, scheduled_at: null })}
              rung={RUNG.generous}
            />
          </Cell>
        </Specimen>

        <Specimen
          label="What the second line is worth"
          note="The same post at the two card sizes, and then without a time at all. A card with no time has nothing to put on the second line, so it draws as the single-line card at the taller rung's height — the height is the cell's decision and every card in a cell has to match, but what goes in the row is the card's, and a lone glyph over a title is worse than a centred one."
        >
          <Cell caption="One line — the time takes width off the title">
            <MonthPostCard post={post({ title: TITLES.long })} rung={RUNG.regular} />
          </Cell>
          <Cell caption="Two lines — the same title, the whole width">
            <MonthPostCard post={post({ title: TITLES.long })} rung={RUNG.roomy} />
          </Cell>
          <Cell caption="Two-line rung, no time — centred instead">
            <MonthPostCard
              post={post({ title: TITLES.long, scheduled_at: null })}
              rung={RUNG.roomy}
            />
          </Cell>
          <Cell caption="Two lines, locked — the corner, not the end of a line">
            <MonthPostCard
              post={post({ title: TITLES.medium, status: 'scheduled' })}
              rung={RUNG.roomy}
            />
          </Cell>
        </Specimen>

        <Specimen
          label="The time is a width decision, not a rung"
          note="Dropping the time buys horizontal space, not vertical, so it can't be a step on this ladder. The single-line card decides it from its own width, in CSS, at 112px of content — a 126px cell — below which the mark, the time and an ellipsis would be the whole card. The mark goes with the time rather than outliving it: the two are one reading, and a lone icon in front of a title is a third thing to decode in a row with room for one. Note the middle cell: 132px is what the real grid gives a column on a small laptop, and the threshold sits deliberately below it."
        >
          {[96, 132, 180].map((width) => (
            <Cell key={width} width={width} caption={`${width}px cell`}>
              <MonthPostCard post={post({ title: TITLES.medium })} rung={RUNG.regular} />
            </Cell>
          ))}
        </Specimen>
      </Section>

      <Section
        title="13 · Week card · the rung ladder"
        intro={`The week column keeps its scrollbar — the ladder buys back a screenful before it is needed, it doesn't pretend a day of thirty posts fits. Cards step down together, by day, so a Tuesday's posts all match and only Tuesday tightens when Tuesday gets busy. Below is one real ${WEEK_LANE_BOX}px column, filled one post at a time.`}
      >
        <Specimen label="One column, filling up">
          {BUSY.map((posts, i) => {
            const rung = rungFor(posts)
            return (
              <Lane
                key={i}
                height={WEEK_LANE_BOX}
                caption={`${posts.length} post${posts.length === 1 ? '' : 's'} · ${rung.id} — ${rung.titleLines}-line title${rung.time ? '' : ', no time'}`}
              >
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} rung={rung} />
                ))}
              </Lane>
            )
          })}
        </Specimen>

        <Specimen
          label="Every rung, forced"
          note="The same two posts — one with a picture, one without — drawn at each rung in turn, so the steps can be compared without waiting for a column to fill. The title spends its lines first, then the time goes, and there the ladder ends. The gap between the two cards in each lane is the picture's band, and it is the same hundred pixels at every rung: no step on this ladder touches it, which is why the ladder is worth so much less on a day of photographs than on a day of text."
        >
          {WEEK_RUNGS.map((rung) => (
            <Lane
              key={rung.id}
              caption={`${rung.id} · ${weekCardHeight(rung, { hasTime: true })}px plain, ${weekCardHeight(rung, { hasTime: true, hasImage: true })}px backed`}
            >
              <PostCard post={post({ title: TITLES.long, media_urls: [MEDIA.portrait] })} rung={rung} />
              <PostCard post={post({ title: TITLES.medium, status: 'ready_for_publish' })} rung={rung} />
            </Lane>
          ))}
        </Specimen>
      </Section>

      <Section
        title="14 · Status cue · the alternatives"
        intro="The 2px left accent is what ships, and now that no card carries a resting shadow it has the card's edge to itself. The candidates that lost are drawn here as mockups so the choice stays arguable — and so the accent's one real limit stays on the record: it is colour-only, and `scheduled` and `published` share a hue, so a line alone cannot tell “going out Thursday” from “already out”."
      >
        <Specimen
          label="Shipped — a 2px left accent"
          note="One edge, seven hues, no width taken from the content. Both cards read it from the same table, so a draft is the same colour in a week as in a month."
        >
          <Lane width={170}>
            {BY_STATUS.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </Lane>
          <Cell height={CELL_HEIGHT + 60}>
            {MONTH_BY_STATUS.map((p) => (
              <MonthPostCard key={p.id} post={p} rung={RUNG.regular} />
            ))}
          </Cell>
        </Specimen>

        <Specimen
          label="Rejected — a status glyph"
          note="Seven shapes rather than seven hues, so it survives greyscale and separates `scheduled` from `published`. It loses on cost: 14px off the front of every status row in the week and off every line in the month, spent on a distinction the week card already prints in words."
        >
          <MockLane variant="glyph" />
        </Specimen>

        <Specimen
          label="Rejected — a dot before the label"
          note="A defined shape instead of a 2px edge, but the same colour-only signal, and it takes content width to say what the edge says for free."
        >
          <MockLane variant="dot" />
        </Specimen>

        <Specimen
          label="Rejected — no cue at all"
          note="The week card prints the status in words anyway, so this costs nothing there. It costs the month view everything: the month card has no room for the word, so status would vanish from the view that shows the most posts."
        >
          <MockLane variant="none" />
        </Specimen>

        <Specimen
          label="Rejected — tint the whole card"
          note="Strongest at a glance across a full month, and the worst neighbour: seven background colours on one screen, with the warning flag and the hover shadow both having to shout over them."
        >
          <MockLane variant="tint" />
        </Specimen>
      </Section>

      <footer className="max-w-3xl border-t border-border pt-6">
        <Caption>
          Design branch only — never merged. Every card above is the shipped component, and only
          the data is fixture — except section 14&apos;s rejected candidates, which are mockups
          and are the one thing on this page that does not exist in `components/`.
        </Caption>
      </footer>
    </div>
  )
}

/*
 * The status cues that were not chosen, as mockups.
 *
 * Deliberately not built out of `PostCard` with a prop: a rejected candidate
 * that can be switched on is a rejected candidate that will eventually be
 * switched on. These tables are the harness's own, live nowhere else, and end
 * at the bottom of this file.
 */
const MOCK_GLYPH: Record<string, Icon> = {
  draft: PencilSimpleIcon,
  ready_for_publish: CheckCircleIcon,
  scheduled: CalendarCheckIcon,
  scheduled_for_manual_publishing: HandIcon,
  published: PaperPlaneTiltIcon,
  failed: XCircleIcon,
  not_published: ProhibitIcon,
}

const MOCK_TONE: Record<string, string> = {
  draft: 'text-tertiary-foreground',
  ready_for_publish: 'text-info',
  scheduled: 'text-positive',
  scheduled_for_manual_publishing: 'text-attention',
  published: 'text-positive',
  failed: 'text-destructive',
  not_published: 'text-negative',
}

const MOCK_TINT: Record<string, string> = {
  draft: 'bg-secondary',
  ready_for_publish: 'bg-info/10',
  scheduled: 'bg-positive/10',
  scheduled_for_manual_publishing: 'bg-attention/10',
  published: 'bg-positive/10',
  failed: 'bg-destructive/10',
  not_published: 'bg-negative/10',
}

function MockLane({ variant }: { variant: 'glyph' | 'dot' | 'none' | 'tint' }) {
  return (
    <Lane width={170}>
      {STATUSES.map((status) => {
        const Glyph = MOCK_GLYPH[status]
        return (
          <div
            key={status}
            className={cn(
              // Flat at rest, like the shipped card — otherwise the comparison
              // is between two elevations rather than two status cues.
              'flex w-full flex-col gap-1 p-2',
              variant === 'tint' ? MOCK_TINT[status] : 'bg-primary',
            )}
          >
            <div className="flex items-center gap-1.5 text-[12px]/[16px] text-tertiary-foreground">
              {variant === 'glyph' && (
                <Glyph
                  weight="fill"
                  className={cn('size-3.5 shrink-0', MOCK_TONE[status])}
                  aria-hidden
                />
              )}
              {variant === 'dot' && (
                <span
                  className={cn('size-1.5 shrink-0 rounded-full bg-current', MOCK_TONE[status])}
                  aria-hidden
                />
              )}
              <span className="truncate">{POST_STATUS_LABELS[status]}</span>
            </div>
            <div className="text-[13px] leading-[1.2] font-medium line-clamp-2">
              {TITLES.short}
            </div>
            <div className="text-[12px]/[16px] text-tertiary-foreground">09:30</div>
          </div>
        )
      })}
    </Lane>
  )
}
