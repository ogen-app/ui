import type { ReactNode } from 'react'
import {
  ChatTeardropTextIcon,
  ClockCountdownIcon,
  ProhibitIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  TextAaIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatList } from '@/lib/intl'
import { cn } from '@/lib'
import type { Fetched } from '@/lib/fetched'
import { isFeatureEnabled } from '@/config/featureFlags'
import { seriesMetaLine } from '@/components/series/format'
import type { ContentSeries } from '@/types/series'
import {
  brandSectionCopy,
  SHOWN_BRAND_SECTIONS,
  type BrandSectionId,
  type BrandSectionInfo,
} from '@/lib/brandSections'
import {
  FACT_SUBJECTS,
  countBySubject,
  factTally,
  todayISO,
  type BrandFact,
} from './facts'
import {
  AudienceContent,
  EntryRow,
  EntryRows,
  Tick,
  VoiceContent,
} from './entry'
import { audienceMark, seriesMark, voiceMark } from './entryMarks'
import { rulesLine, sampleCount, usageLine } from './format'
import type { BrandPlace } from './places'
import { OriginLine, WholeBrandOffer, readByStatus } from './shell'
import { OfferRoutes } from './distill/OfferRoutes'
import { SavedCard } from './distill/SavedCard'
import { EXPECTED_RATIOS, type BrandData, type GuardrailsStance } from './types'

/**
 * Brand's main screen: what is in each section, and the way into it.
 *
 * **This is an index, not the work surface** — the distinction the first cut got
 * wrong. The five sections used to be stacked here in full, which made one page
 * responsible both for showing what your brand is and for being where you
 * change it. It could not be both: a picture template is platform × ratio ×
 * customisation and will never fit in a tile, so the page either grew until it
 * was unusable or the sections stayed too shallow to work in. Each section is
 * now a screen you open from here; this one answers *what is in there, and what
 * is missing*.
 *
 * Being the hub is also what settles the shape of a card. Five cards that only
 * *report* would leave the screen with nothing to do, and the tab bar that used
 * to do the going has gone — so each card opens its section, and the rows exist
 * to tell you which one to open.
 *
 * Three rules, and they came out of being told the first version was off-style:
 *
 * 1. **It is built from the app's own furniture** — `Card` for the block,
 *    `entry.tsx`'s rows inside it, the same parts the library one level down
 *    and a campaign's Strategy are made of. The first version invented a card, and
 *    an invented card is how a new section announces that it was built by
 *    somebody who had not looked at the rest of the app.
 * 2. **It lists what is there, one row each, ticked when there is something
 *    behind it.** Not a paragraph of status per section: a sentence saying "5
 *    of 8 ratios covered" is a summary of a list the user could simply have
 *    been shown, and it goes stale in a way a list cannot.
 * 3. **A row carries what you would otherwise open the section to find out** —
 *    for a voice, how many samples are behind it and how much has actually been
 *    written in it. A library row that shows only a name is a filing cabinet.
 *
 * The tick is the same tick the Campaign Overview's setup checks use, and it
 * means the same thing: there is something behind this, not "this is correct".
 * Deliberately no red anywhere — an empty section is a to-do, and a brand-new
 * workspace would otherwise look broken in five places at once.
 *
 * **The documents are not here**, and they were, as a sixth card counting what
 * was in the bank. They are their own module now (`/assets`) for the reason
 * that card kept running into: every section on this screen is something
 * somebody writes once and revisits rarely, and the documents are a working
 * list that arrives by the hundred. Rule 2 could never be applied to it — a
 * card naming five of four hundred documents answers nothing — and the
 * exception it needed was the tell.
 *
 * **There is no first-run takeover**, and there was: an empty brand used to be
 * met by a full screen of five ways in, four of them COMING SOON, with *fill it
 * in yourself* as the one that worked. It was a screen you read once and then
 * dismissed to reach this one — which is the same screen, with the same ways
 * in, except that its cards can actually be opened. Two screens that differ
 * only in whether the content is reachable is one screen and a doorstep. So the
 * hub is what an empty workspace arrives at, its cards say what is missing the
 * way they always have, and the three routes that read a brand off what the
 * workspace already has are offered once, in a band, by `WholeBrandOffer`.
 */
/** A screen given no series has none to show. */
const READY_NONE: Fetched<ContentSeries[]> = { status: 'ready', data: [] }

/** Which campaigns use each voice and each audience — `useUsedBy`. */
export type HubUsedBy = {
  voices?: Map<string, string>
  audiences?: Map<string, string>
}

export function BrandOverview({
  brand,
  facts = [],
  series = READY_NONE,
  stance,
  usedBy,
  onOpen,
  onOpenPlace,
}: {
  /** Every section, as the one query they come from — `useBrand`. */
  brand: Fetched<BrandData>
  /**
   * The workspace's series (CON-264) — a section whose contents do not come
   * from `useBrand`, so the route owns the query and this screen stays a
   * rendering of what it is given.
   *
   * A `Fetched`, because it is its own request (`GET /api/series`): its card
   * waits or apologises on its own while the rest of the hub draws, rather
   * than passing a list still in flight off as an empty library.
   *
   * **Workspace-scoped entries only.** A series defined inside a campaign is
   * bounded by it and is not the workspace's yet; listing one here would report
   * a library that nobody else can pick from. The route filters.
   */
  series?: Fetched<ContentSeries[]>
  /**
   * The ledger, already assembled — `useFacts`. Passed in rather than fetched
   * here for the reason the rest of this screen takes `brand`: the statements
   * are on `BrandData`, the dates around them are not, and a card that reached
   * for them itself could not be shown a fixture.
   */
  facts?: BrandFact[]
  /**
   * Whether the workspace has decided it needs no guardrails — the answer
   * `guardrails: null` cannot give on its own. See `GuardrailsStance`; like `facts`
   * it is passed in rather than read here, so this screen stays a rendering of
   * what it is given.
   */
  stance?: GuardrailsStance
  usedBy?: HubUsedBy
  /** The card's heading: the section. */
  onOpen?: (id: BrandSectionId) => void
  /** A row: the one thing it names, inside its section. */
  onOpenPlace?: (place: BrandPlace) => void
}) {
  const { t } = useTranslation()

  // The brand query still holds the whole screen while it is in flight: its
  // five sections are one fetch, so there is no card here that could have
  // drawn sooner, and six labelled cards whose every row is a skeleton is a
  // busier way of saying the same nothing.
  if (brand.status === 'pending') return <OverviewSkeleton />

  /**
   * What one card has to draw, which is its own query's state rather than the
   * screen's — the shape `Fetched` is for. Every card but the series' is the
   * same query; it stays per-card because the card is the right size for that
   * failure.
   */
  const contents = (section: BrandSectionInfo): Fetched<ReactNode> => {
    if (brand.status !== 'ready') return brand
    if (section.id === 'series' && series.status !== 'ready') return series
    return {
      status: 'ready',
      data: sectionBody(t, section.id, {
        data: brand.data,
        facts,
        series: series.status === 'ready' ? series.data : [],
        stance,
        usedBy,
        open: onOpenPlace,
      }),
    }
  }

  const card = (section: BrandSectionInfo) => (
    <SectionCard
      key={section.id}
      section={section}
      contents={contents(section)}
      onOpen={onOpen}
    />
  )

  return (
    <Wrapper>
      {/* The offer sits directly under the band's sentence explaining the screen, and
          above every card. It used to follow the documents card, which was the
          material it offers to read the brand out of; with the documents their
          own module the offer is the screen's one action and belongs where the
          reading stops. Nothing to offer to fill when we could not read what is
          already there — `fills` empty is how this card hides itself. */}
      {/* What the last brand read saved, once (CON-400). Above the offer,
          because it is the answer to it. */}
      <SavedCard />
      <WholeBrandOffer
        fills={
          brand.status === 'ready' ? missingSectionNames(t, brand.data) : []
        }
      >
        <OfferRoutes />
      </WholeBrandOffer>
      {SHOWN_BRAND_SECTIONS.map(card)}
    </Wrapper>
  )
}

/**
 * Some of the hub's cards, on their own — what a campaign's Strategy shows of
 * the Foundation it is written under (the guardrails and the facts).
 *
 * The same cards rather than a summary of them, so a rule reads the same
 * wherever it is read. They are read-only where they are shown: opening one
 * goes to the workspace's section, which is where it is edited for every
 * campaign at once.
 */
export function BrandSectionCards({
  sections,
  brand,
  facts = [],
  stance,
  onOpen,
  onOpenPlace,
}: {
  sections: BrandSectionId[]
  brand: Fetched<BrandData>
  facts?: BrandFact[]
  stance?: GuardrailsStance
  onOpen?: (id: BrandSectionId) => void
  onOpenPlace?: (place: BrandPlace) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      {SHOWN_BRAND_SECTIONS.filter((section) =>
        sections.includes(section.id),
      ).map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          contents={
            brand.status !== 'ready'
              ? brand
              : {
                  status: 'ready',
                  data: sectionBody(t, section.id, {
                    data: brand.data,
                    facts,
                    series: [],
                    stance,
                    open: onOpenPlace,
                  }),
                }
          }
          onOpen={onOpen}
        />
      ))}
    </>
  )
}

/**
 * One section, and the way into it.
 *
 * **The heading opens the section; each row opens its own thing** — a voice,
 * one card of the guardrails, the ledger on one tab — with a caret of its own,
 * the card's (`DoorCaret`). A link can't sit inside a link, so while the card
 * holds rows that are doors only its heading is one; an empty card has no rows
 * and the whole of it is the door, the way a library entry one level down is.
 */
function SectionCard({
  section,
  contents,
  onOpen,
}: {
  section: BrandSectionInfo
  /**
   * The card's own material, and whether it has arrived — `null` once it has
   * and there is nothing in it. The frame around it (hue, heading, caret, the
   * door) is drawn from the section table and needs no fetch at all, which is
   * what makes waiting and failing card-sized problems rather than
   * screen-sized ones.
   */
  contents: Fetched<ReactNode>
  onOpen?: (id: BrandSectionId) => void
}) {
  const { t } = useTranslation()
  const copy = brandSectionCopy(t, section.id)

  // The section's permanent hue on its glyph, and the only colour on the card:
  // five grey line glyphs down one page are five identical marks, and the hue
  // is what makes the card you are looking for findable without reading the
  // headings. The honesty rule (CON-226 §9) rides on the title as a status.
  //
  // Unopenable when there is nowhere to go: the harness draws this screen with
  // no navigation, and a `role="button"` that does nothing is a lie told to a
  // screen reader.
  const frame = {
    icon: section.icon,
    tone: section.tone,
    title: copy.label,
    status: readByStatus(t, section.readBy),
    capped: true,
  }
  const rows = contents.status === 'ready' && contents.data !== null
  const body = <CardContents contents={contents} whenEmpty={copy.whenEmpty} />
  return onOpen ? (
    <Card
      {...frame}
      door={{
        kind: rows ? 'header' : 'card',
        onOpen: () => onOpen(section.id),
      }}
    >
      {body}
    </Card>
  ) : (
    <Card {...frame}>{body}</Card>
  )
}

/**
 * Inside the card: the rows, the bars standing in for them, or the one line
 * that says they are not coming.
 *
 * **The card keeps its caret in all three.** A section whose contents this
 * screen could not read is still a section, and the screen behind the door
 * fetches for itself, says more about the failure than a line in a card can,
 * and is the only place anything can be done about it — so the door stays open
 * while this card admits it has nothing to show.
 *
 * The placeholder is two bars rather than a copy of whatever would land there:
 * how many rows a card has is exactly what the fetch is going to tell us, and
 * mocking up three of them would be guessing at the answer in the shape of the
 * answer.
 */
function CardContents({
  contents,
  whenEmpty,
}: {
  contents: Fetched<ReactNode>
  /** The section's own line for "there is nothing in here yet". */
  whenEmpty: string
}) {
  const { t } = useTranslation()

  if (contents.status === 'pending') {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-5 w-2/5" />
      </div>
    )
  }

  if (contents.status === 'error') {
    return <p className="text-sm">{t('brand.overview.unreadable')}</p>
  }

  return contents.data ?? <p className="text-sm">{whenEmpty}</p>
}

type BodyInput = {
  data: BrandData
  facts: BrandFact[]
  series: ContentSeries[]
  stance?: GuardrailsStance
  usedBy?: HubUsedBy
  open?: (place: BrandPlace) => void
}

/**
 * What each section holds, as rows — or `null`, which is the empty state: the
 * card falls back to the section's `whenEmpty` line rather than drawing an
 * empty list. That is why the singletons answer `null` when absent instead of
 * four unticked rows: "guardrails exist and none of them are written" and
 * "there are no guardrails" are different findings.
 *
 * Two kinds of row, and the split is the design:
 *
 * - **Voices and audiences are whole entries** — the mark, the name, the line,
 *   the ruled run and the facts, the library's card one level down drawn as a
 *   row (`VoiceContent`, `AudienceContent`) and ruled apart from the next.
 * - **Everything else is one line** — the mark, the name, and the count or the
 *   rhythm under it. A series' recipe, a guardrail's list and a ledger's
 *   statements are each too long to preview and are what the door is for.
 *
 * The mark is a tick for an entry that is either backed or not, the default
 * star where an entry is the one the app falls back to, and the kind's own
 * glyph for a row that is a *kind* of thing rather than a task (the guardrail
 * lists, the ledgers) — where an empty circle would have meant "unticked"
 * about something nobody ticks. Deliberately no red but where the finding is
 * the absence itself.
 */
function sectionBody(
  t: TFunction,
  id: BrandSectionId,
  { data, facts, series, stance, usedBy, open }: BodyInput,
): ReactNode {
  const door = (place: BrandPlace) => (open ? () => open(place) : undefined)
  const line = (rows: OneLine[]) =>
    rows.length === 0 ? null : (
      <EntryRows divided={false}>
        {rows.map((row) => (
          <EntryRow
            key={row.key}
            mark={row.mark}
            name={row.name}
            meta={row.meta}
            onOpen={row.place ? door(row.place) : undefined}
          />
        ))}
      </EntryRows>
    )

  switch (id) {
    case 'voices':
      if (data.voices.length === 0) return null
      return (
        <EntryRows>
          {data.voices.map((voice) => (
            <EntryRow
              key={voice.id}
              mark={voiceMark(t, voice)}
              name={voice.name}
              onOpen={door({ section: 'voices', id: voice.id })}
            >
              <VoiceContent
                t={t}
                voice={voice}
                facts={[
                  rulesLine(t, voice.rules),
                  [
                    sampleCount(t, voice.samples.length),
                    usageLine(t, voice.usage),
                  ].join(t('brand.facts.separator')),
                  usedBy?.voices?.get(voice.id),
                  <OriginLine key="origin" origin={voice.origin} />,
                ]}
              />
            </EntryRow>
          ))}
        </EntryRows>
      )

    case 'audiences':
      if (data.audiences.length === 0) return null
      return (
        <EntryRows>
          {data.audiences.map((audience) => (
            <EntryRow
              key={audience.id}
              mark={audienceMark(audience)}
              name={audience.name}
              onOpen={door({ section: 'audiences', id: audience.id })}
            >
              <AudienceContent
                t={t}
                audience={audience}
                facts={[
                  usageLine(t, audience.usage),
                  usedBy?.audiences?.get(audience.id),
                  <OriginLine key="origin" origin={audience.origin} />,
                ]}
              />
            </EntryRow>
          ))}
        </EntryRows>
      )

    case 'series':
      return line(
        series.map((entry) => ({
          key: entry.id,
          mark: seriesMark(entry),
          name: entry.name,
          // `isFeatureEnabled` rather than the hook: this is a plain function,
          // which is exactly the case that accessor exists for. Formats are a
          // separate flag, so a series carrying one written while it was on
          // must not print it while it is off.
          meta: seriesMetaLine(t, entry, {
            withFormat: isFeatureEnabled('content-formats'),
          }),
          place: { section: 'series', id: entry.id },
        })),
      )

    case 'facts': {
      if (facts.length === 0) return null
      const tally = factTally(facts, todayISO())
      // One line per ledger — what this business knows about itself, what it
      // knows is wrong out there, and what it thinks that leaves open — each
      // opening the ledger on its own tab. All three are drawn even at zero,
      // the way the guardrails card draws `Never claim` when it is empty: a
      // ledger with twelve facts about itself and no problems on file is
      // writing about nobody, and that is only visible if the empty line is
      // there to read.
      const rows: OneLine[] = FACT_SUBJECTS.map((subject) => ({
        key: subject.id,
        mark: glyph(subject.icon),
        name: subject.plural,
        meta: statedCount(t, countBySubject(facts, subject.id)),
        place: { section: 'facts', tab: subject.id },
      }))
      // The only row here that can be bad, so it is the only one that is not a
      // count of what exists. A ledger's size is not a finding; a statement the
      // app is still repeating past its expiry date is.
      if (tally.expired > 0 || tally.due > 0) {
        rows.push({
          key: 'freshness',
          mark: glyph(
            tally.expired > 0 ? WarningIcon : ClockCountdownIcon,
            true,
          ),
          name: tally.expired > 0 ? 'Past its date' : 'Needs re-checking',
          meta: [
            tally.expired > 0 ? `${tally.expired} expired` : null,
            tally.due > 0 ? `${tally.due} within a month` : null,
          ]
            .filter(Boolean)
            .join(', '),
          place: { section: 'facts' },
        })
      }
      return line(rows)
    }

    case 'guardrails': {
      const g = data.guardrails
      // The distinction the section could not draw until there was somewhere
      // to record it: a workspace that decided it needs no rules gets a row
      // saying so, and one that has never answered falls through to the card's
      // empty state, which is written as an unfinished to-do. See `GuardrailsStance`.
      if (!g) {
        return stance?.none
          ? line([
              {
                key: 'stance',
                mark: glyph(ShieldCheckIcon),
                name: 'Nothing to restrict, deliberately',
                meta: decidedLine(stance.decidedAt),
              },
            ])
          : null
      }
      // Each row lands on its own card of the guardrails page.
      return line([
        {
          key: 'may',
          mark: glyph(SealCheckIcon),
          name: t('brand.overview.guardrails.mayClaim'),
          meta: statedCount(t, g.mayClaim.length),
          place: { section: 'guardrails', part: 'may-claim' },
        },
        {
          key: 'never',
          mark: glyph(ProhibitIcon, g.neverClaim.length === 0),
          name: t('brand.overview.guardrails.neverClaim'),
          meta: statedCount(t, g.neverClaim.length),
          place: { section: 'guardrails', part: 'never-claim' },
        },
        {
          key: 'banned',
          mark: glyph(TextAaIcon),
          name: t('brand.overview.guardrails.bannedWords'),
          meta:
            g.bannedWords.length > 0
              ? t('brand.overview.bannedWordCount', {
                  count: g.bannedWords.length,
                })
              : t('brand.overview.none'),
          place: { section: 'guardrails', part: 'banned-words' },
        },
        {
          key: 'disclaimer',
          mark: glyph(ChatTeardropTextIcon),
          name: t('brand.overview.guardrails.disclaimer'),
          meta: g.disclaimer.trim()
            ? t('brand.overview.written')
            : t('brand.overview.none'),
          place: { section: 'guardrails', part: 'disclaimer' },
        },
      ])
    }

    // Look and templates are not offered (`SHOWN_BRAND_SECTIONS`); their rows
    // open nothing until their screens are.
    case 'look': {
      const l = data.look
      if (!l) return null
      return line([
        {
          key: 'logos',
          mark: <Tick done={l.logos.length > 0} />,
          name: t('brand.look.logoSlot'),
          meta:
            l.logos.length > 0
              ? t('brand.overview.logosWithJobs', { count: l.logos.length })
              : t('brand.overview.none'),
        },
        {
          key: 'palette',
          mark: <Tick done={l.palette.length > 0} />,
          name: t('brand.look.paletteSlot'),
          meta:
            l.palette.length > 0
              ? t('brand.overview.coloursWithRoles', {
                  count: l.palette.length,
                })
              : t('brand.overview.none'),
        },
        {
          key: 'type',
          mark: <Tick done={l.typefaces.length > 0} />,
          name: t('brand.look.typeSlot'),
          // The customer's own typeface names, joined the way the language
          // joins a list rather than by a hard-coded comma.
          meta:
            l.typefaces.length > 0
              ? formatList(l.typefaces)
              : t('brand.overview.none'),
        },
        {
          key: 'imagery',
          mark: <Tick done={l.referenceImages.length > 0} />,
          name: t('brand.look.referenceSlot'),
          meta: countOrNone(t, l.referenceImages.length),
        },
      ])
    }

    case 'templates':
      return line(
        data.templates.map((template) => {
          const have = new Set(template.ratios.map((r) => r.ratio))
          const covered = EXPECTED_RATIOS.filter((r) => have.has(r)).length
          return {
            key: template.id,
            // One PNG per ratio is the price of not reflowing, so a missing
            // ratio is not cosmetic — it is the set being unusable wherever
            // that ratio is what gets posted.
            mark: <Tick done={covered === EXPECTED_RATIOS.length} />,
            name: template.name,
            meta: t('brand.overview.templates.ratios', {
              covered,
              total: EXPECTED_RATIOS.length,
            }),
          }
        }),
      )
  }
}

/** A one-line row: the mark, the name, a count under it, and where it goes. */
type OneLine = {
  key: string
  mark: ReactNode
  name: string
  meta?: string
  place?: BrandPlace
}

/**
 * A row marked by what it *is* rather than by whether it is done.
 *
 * Ink is the same as an unticked row's, so a card of glyphs and a card of ticks
 * sit at the same weight down the column — except where the finding is the
 * absence itself, which is the one place this screen spends a colour.
 */
function glyph(Glyph: Icon, alarming = false): ReactNode {
  return (
    <Glyph
      className={cn(
        'size-4',
        alarming ? 'text-destructive' : 'text-senary-foreground',
      )}
      aria-hidden
    />
  )
}

/** When the decision was taken — the whole content of a stance. */
function decidedLine(iso: string | null): string {
  const shown = iso
    ? formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  return shown ? `Decided ${shown}` : 'Decided'
}

function countOrNone(t: TFunction, n: number): string {
  return n > 0 ? String(n) : t('brand.overview.none')
}

/**
 * A count with its unit, because a bare "3" is a number nobody can price. Every
 * other line on this screen ends in a word — "4 of 4 ratios", "never used" —
 * and these rows read as a spreadsheet without one.
 */
function statedCount(t: TFunction, n: number): string {
  return n > 0
    ? t('brand.overview.stated', { count: n })
    : t('brand.overview.none')
}

/**
 * The sections a single website read would fill, named as the screen names
 * them. Templates stays out: nothing on a website is a per-ratio PNG, and an
 * offer that over-promises is the fastest way to make the one good first-run
 * path look unreliable.
 */
function missingSectionNames(t: TFunction, data: BrandData): string[] {
  const missing: string[] = []
  // The in-sentence forms, not the section headings — see `offer.fills`.
  if (data.voices.length === 0)
    missing.push(t('brand.shell.offer.fills.voices'))
  if (data.audiences.length === 0)
    missing.push(t('brand.shell.offer.fills.audiences'))
  if (!data.guardrails) missing.push(t('brand.shell.offer.fills.guardrails'))
  // Named separately from the guardrails it is stored with, because a website
  // read fills the two from different halves of a site — the rules off the
  // small print, the facts off the product pages — and a workspace that has
  // written rules and stated nothing true is the common case, not the odd one.
  if ((data.guardrails?.facts.length ?? 0) === 0)
    missing.push(t('brand.shell.offer.fills.facts'))
  // No `look` here while the section is not offered — the card would promise to
  // fill something the user has no way to see or check afterwards.
  return missing
}

/**
 * The cards, and nothing around them: the column they are put in spaces them
 * (`PageColumns` — a stack, or masonry), so they reach it as its own children.
 * **Not a scroller** either: the page owns the scrolling so that the header
 * can sit inside it — see `BrandDetail`.
 */
function Wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function OverviewSkeleton() {
  return (
    <Wrapper>
      <Skeleton className="h-40 w-full max-w-content" />
      <Skeleton className="h-40 w-full max-w-content" />
      <Skeleton className="h-40 w-full max-w-content" />
    </Wrapper>
  )
}
