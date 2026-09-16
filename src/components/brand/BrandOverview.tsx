import { useState, type ReactNode } from 'react'
import {
  CaretRightIcon,
  ChatTeardropTextIcon,
  ClockCountdownIcon,
  PaletteIcon,
  ProhibitIcon,
  SealCheckIcon,
  ShieldCheckIcon,
  TextAaIcon,
  WarningIcon,
  type Icon,
} from '@phosphor-icons/react'
import { LineItem, type LineItemIndicator } from '@/components/ui/line-item'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { AssetKindTally } from '@/components/content/AssetKindTally'
import { formatDate } from '@/lib/intl'
import { cn } from '@/lib'
import type { Asset } from '@/types/content'
import type { GuardrailsStance } from '@/services/api/brandLocal'
import {
  SHOWN_BRAND_SECTIONS,
  type BrandSectionId,
  type BrandSectionInfo,
} from '@/lib/brandSections'
import { FirstRun } from './FirstRun'
import {
  FACT_SUBJECTS,
  countBySubject,
  factTally,
  todayISO,
  type BrandFact,
} from './facts'
import { sampleCount, usageLine } from './format'
import { BrandIntro, DefaultStar, WholeBrandOffer } from './shell'
import { defaultVoiceLabel } from './VoicesSection'
import { EXPECTED_RATIOS } from './TemplatesSection'
import { isBrandEmpty, MIN_VOICE_SAMPLES, type BrandData } from './types'

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
 * 1. **It is built from the app's own furniture** — `SettingsCard` for the
 *    block, `LineItem` for the rows, the same components Workspace Settings and
 *    the Campaign Overview are made of. The first version invented a card, and
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
 * **Sources is the exception to rule 2, and it is the rule's own limit.** The
 * five library sections hold things somebody wrote one at a time, so naming
 * them is naming all of them. Documents arrive by the hundred, and a card that
 * listed the five most recently changed was answering a question nobody asked
 * — it counts instead (`AssetKindTally`). The list is one click below, which is
 * where a name is worth reading.
 */
export function BrandOverview({
  state,
  sources = [],
  facts = [],
  stance,
  showWhenEmpty = false,
  onOpen,
}: {
  state: BrandOverviewState
  /**
   * The workspace's documents (CON-211), which are Brand's sixth section and
   * the one whose contents do not come from `useBrand`.
   *
   * Passed in rather than fetched here for the reason the rest of this screen
   * takes `state`: it is a rendering of what is in the brand, and a component
   * that fetches half of what it draws cannot be put in a harness or shown a
   * fixture. The route owns both queries.
   */
  sources?: Asset[]
  /**
   * The ledger, already assembled — `useFacts`. Passed in for the same reason
   * `sources` is: the statements are on `BrandData`, the dates around them are
   * not, and a card that reached for them itself could not be shown a fixture.
   */
  facts?: BrandFact[]
  /**
   * Whether the workspace has decided it needs no guardrails — the answer
   * `guardrails: null` cannot give on its own. See `readStance`; like `sources`
   * it is passed in rather than read here, so this screen stays a rendering of
   * what it is given.
   */
  stance?: GuardrailsStance
  /** Skips the first-run takeover — the escape hatch, and the harness. */
  showWhenEmpty?: boolean
  onOpen?: (id: BrandSectionId) => void
}) {
  const [skippedFirstRun, setSkippedFirstRun] = useState(false)

  if (state.isPending) return <OverviewSkeleton />

  const { data } = state
  const firstRun = isBrandEmpty(data) && !showWhenEmpty && !skippedFirstRun

  if (firstRun) {
    return (
      <Wrapper>
        <FirstRun onManual={() => setSkippedFirstRun(true)} />
      </Wrapper>
    )
  }

  const card = (section: BrandSectionInfo) => (
    <SectionCard
      key={section.id}
      section={section}
      rows={
        section.id === 'sources'
          ? []
          : sectionRows(section.id, data, facts, stance)
      }
      // Sources is the one section a list of rows is the wrong shape for
      // — see `AssetKindTally`. Empty, it falls through to the section's
      // `whenEmpty` line like every other card.
      body={
        section.id === 'sources' && sources.length > 0 ? (
          <AssetKindTally assets={sources} />
        ) : undefined
      }
      onOpen={onOpen}
    />
  )

  return (
    <Wrapper>
      <FoundationIntro />
      {/* Sources leads, immediately under the sentence explaining the screen,
          because it is the one section whose contents somebody already has.
          The other four are written — a voice is composed, an audience is
          described, a rule is decided — and a workspace on day one has none of
          them; documents exist before the app does. It also sets up the card
          under it: the offer is to read the rest of the brand out of exactly
          this material. */}
      {SOURCES_FIRST.lead.map(card)}
      <WholeBrandOffer fills={missingSectionNames(data)} />
      {SOURCES_FIRST.rest.map(card)}
    </Wrapper>
  )
}

/**
 * The cards, split around the offer that sits between them. By id rather than
 * by index, so the screen's one exception to the section table's order is
 * stated rather than counted.
 */
const SOURCES_FIRST = {
  lead: SHOWN_BRAND_SECTIONS.filter((section) => section.id === 'sources'),
  rest: SHOWN_BRAND_SECTIONS.filter((section) => section.id !== 'sources'),
}

/**
 * The card the screen opens with, and the only one on it that goes nowhere.
 *
 * Every other card here is a door, and a screen made entirely of doors never
 * says what the building is. Somebody arriving at Foundation for the first time
 * is looking at six things they have not heard the app use before — a voice, an
 * audience, guardrails, facts, sources — and the six cards under this one can
 * each say what *they* are while none of them can say why they are together.
 *
 * So: the same card a section opens with (`BrandIntro`), at the top of the hub.
 * **It cannot be closed and it carries nothing to click.** Both are deliberate.
 * A dismissible explanation is one the next person to join the workspace never
 * sees, and this is the screen where the next person is exactly who needs it; a
 * button on it would make it the seventh door and put the offer that *is* a
 * door (`WholeBrandOffer`, directly below) in competition with the sentence
 * explaining the screen.
 */
function FoundationIntro() {
  return (
    <BrandIntro
      icon={PaletteIcon}
      // Not "Foundation": the page header two lines above says that, and the
      // hub keeps its header title where the section screens gave theirs up —
      // it is a top-level destination and the only one that would be untitled.
      // So the card's heading does the other half of the job and says what the
      // word means.
      title="What the app writes from"
      body="The voices it writes in, who it is written to, what may never be claimed, what is true, and the documents it draws on — one place for all five. It is written once for the workspace, and every campaign and every post inherits it."
      heading="h2"
    />
  )
}

export type BrandOverviewState =
  { isPending: true; data?: undefined } | { isPending: false; data: BrandData }

/**
 * One thing a section holds, as one row — **and every row on this screen is
 * built the same way**, which is the point of the shape rather than a
 * coincidence of it.
 *
 * The cards had drifted into four grammars. A voice row was a name, a
 * description, a counts line and a star with the word "default" beside it in
 * the right margin; an audience row was three of those four; a guardrail row
 * was a label with a bare number opposite it, set in a different size and a
 * different colour from either. Five type treatments down one column, and the
 * eye has to work out for each card which of them it is reading.
 *
 * So there is one row now and it has four slots, in one order:
 *
 * 1. **A mark**, always — see `mark`.
 * 2. **A label**: what this thing is called.
 * 3. **Details**: one line saying what it actually is, or what its absence
 *    costs. Same size and colour on every card.
 * 4. **Meta**: the counts, on the third line and never in the right margin. A
 *    margin number has to be short enough to fit, which is what produced a bare
 *    `3` in a column where every other row ended in a word.
 *
 * Nothing carries a right margin any more. `LineItem`'s `trailing` slot is
 * where the last two type styles were living, and the one thing it held that
 * was worth keeping — the default star — belongs at the front of the row
 * instead, where the tick it replaces was.
 */
type BrandRow = {
  key: string
  /**
   * The 16px slot at the head of the row, and never empty.
   *
   * A tick for a slot that is either filled or not, the section's own glyph for
   * a row that is a *kind* of thing rather than a task (the guardrail lists,
   * the fact kinds — where an empty circle would have meant "unticked" about
   * something nobody ticks), and the default star where an entry is the one the
   * app falls back to.
   */
  mark: LineItemIndicator
  label: string
  /** One line under the label: what this thing actually is. */
  details?: string
  /** The counts, on a third line — samples, usage, coverage, dates. */
  meta?: string
}

/**
 * One section, and the way into it.
 *
 * **The whole card opens the section.** It was a card with an `OPEN VOICES`
 * button in the corner while the tab bar existed, which was fine when the bar
 * was the real way in and the button a shortcut. With the bar gone the card is
 * the only door, and a door the size of a card should not have a handle the
 * size of a word — the target is now the card, which is also the thing the eye
 * is already on when it finishes reading the rows.
 *
 * It is deliberately the same gesture as a `LibraryCard` one level down: a
 * white block that lifts on hover, with a caret where the row of content ends.
 * Two levels of this screen open things the same way, so learning it once is
 * enough. Hover lifts rather than tints, for the reason `LibraryCard` gives.
 */
function SectionCard({
  section,
  rows,
  body,
  onOpen,
}: {
  section: BrandSectionInfo
  rows: BrandRow[]
  /**
   * Drawn instead of the rows, for a section a list is the wrong shape for.
   * Only Sources has one: a library of four voices is listed, a library of
   * four hundred documents is counted, and the five titles that happened to
   * change last were a sample nobody asked it for.
   */
  body?: ReactNode
  onOpen?: (id: BrandSectionId) => void
}) {
  const Icon = section.icon
  const open = onOpen ? () => onOpen(section.id) : undefined

  return (
    <Opens onOpen={open}>
      <SettingsCard
        title={
          <>
            {/* The section's permanent hue, and the only colour on the card.
                Five grey line glyphs down one page are five identical marks;
                the hue is what makes the card you are looking for findable
                without reading the headings. Same device as the campaign rail,
                and the same glyph that titles the screen this card opens. */}
            <Icon
              className="size-5 shrink-0"
              style={{ color: section.tone }}
              aria-hidden
            />
            <span className="truncate">{section.label}</span>
            {/* The honesty rule (CON-226 §9) at index length. The section's own
                screen still says it in a sentence; here it is three words,
                because five sentences down one page is the noise that made this
                screen read as an essay. */}
            {section.readBy.length === 0 && (
              <StatusBadge tone="neutral" label="Nothing reads this yet" />
            )}
          </>
        }
        actions={
          open && (
            <CaretRightIcon
              className="size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
              weight="bold"
              aria-hidden
            />
          )
        }
      >
        {body ? (
          body
        ) : rows.length === 0 ? (
          <p className="text-sm text-secondary-foreground">
            {section.whenEmpty}
          </p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((row) => (
              <li key={row.key}>
                {/* `entry` on every row, including the ones that name a slot
                    rather than a library entry. The variant used to be chosen
                    per row from whether it happened to carry counts, which
                    made the type on a card depend on how much the card had to
                    say. */}
                <LineItem
                  variant="entry"
                  indicator={row.mark}
                  label={row.label}
                  details={row.details}
                  meta={row.meta}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </Opens>
  )
}

/**
 * The card's clickability, wrapped around it rather than built into
 * `SettingsCard`.
 *
 * `SettingsCard` is the app's form furniture — it is what Workspace Settings
 * and Campaign Settings are made of — and a settings card that can be clicked
 * as a whole is not a thing this app has. Adding an `onClick` there would make
 * every one of those cards one prop away from becoming a link. So the gesture
 * lives here, in the one place that needs it.
 *
 * Renders the card unwrapped when there is nowhere to go: the harness draws
 * this screen with no navigation, and a `role="button"` that does nothing is a
 * lie told to a screen reader.
 */
function Opens({
  onOpen,
  children,
}: {
  onOpen?: () => void
  children: ReactNode
}) {
  if (!onOpen) return <>{children}</>

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group mx-auto w-full max-w-content cursor-pointer transition-shadow duration-150 hover:shadow-lg"
    >
      {children}
    </div>
  )
}

/**
 * What each section holds, as rows.
 *
 * An empty list is the empty state — the card falls back to the section's
 * `whenEmpty` line rather than drawing an empty `<ul>`. That is why the
 * singletons return `[]` when absent instead of four unticked rows: "guardrails
 * exist and none of them are written" and "there are no guardrails" are
 * different findings, and four empty rows would say the first when the second
 * is true.
 */
function sectionRows(
  id: BrandSectionId,
  data: BrandData,
  facts: BrandFact[],
  stance?: GuardrailsStance,
): BrandRow[] {
  switch (id) {
    // The documents are not in `BrandData`, and they are not rows either —
    // the caller draws the card's body from its own query and never reaches
    // this arm. Present so the switch stays exhaustive, which is what makes a
    // seventh section a compile error here rather than a blank card.
    case 'sources':
      return []

    case 'voices':
      return data.voices.map((voice) => {
        // The samples are the voice, so they are what the tick is about. A
        // named voice with nothing behind it generates exactly what no voice
        // would, and it is the failure this row exists to make visible.
        const backed = voice.samples.length >= MIN_VOICE_SAMPLES
        return {
          key: voice.id,
          // The star stands *in place of* the tick rather than beside it in
          // the margin, and it says both things at once: filled and green when
          // the default has what it takes to be one, hollow when it has not.
          // A default voice with nothing behind it is the worst state this
          // library has — everything falls back to an entry that changes
          // nothing — and it is now legible without reading a word.
          mark: voice.isDefault
            ? {
                kind: 'custom',
                node: (
                  <DefaultStar
                    backed={backed}
                    label={defaultVoiceLabel(voice)}
                    word={false}
                  />
                ),
              }
            : { kind: 'task', done: backed },
          label: voice.name,
          // No description when there is nothing to describe it by, rather than
          // a sentence explaining the absence. Three template voices in a row
          // each explaining their own emptiness reads as a rendering bug — the
          // same failure the guardrail rails had — and the row already says it
          // twice over: an empty tick, and `no samples, never used` below.
          details: voice.summary || undefined,
          meta: [
            sampleCount(voice.samples.length),
            usageLine(voice.usage),
          ].join(', '),
        }
      })

    // No star on these rows, and the voices above have one — the workspace
    // default stops at voices. See `resolveAudience` in `binding.ts`.
    case 'audiences':
      return data.audiences.map((audience) => ({
        key: audience.id,
        // Named is not described. The tick is the three consequence lines,
        // because those are what make an audience usable rather than a label.
        mark: {
          kind: 'task',
          done: Boolean(
            audience.readsOn &&
            audience.scrollsPastWhen &&
            audience.believesWhen,
          ),
        },
        label: audience.name,
        details: audience.summary || undefined,
        meta: usageLine(audience.usage),
      }))

    case 'facts': {
      if (facts.length === 0) return []
      const tally = factTally(facts, todayISO())
      // One line per ledger — what this business knows about itself, what it
      // knows is wrong out there, and what it thinks that leaves open. The
      // breakdown used to be by `FACT_KIND`, and that is the wrong axis for
      // this card: how checkable a statement is matters while somebody is
      // writing it, and a card on the hub answers *what has this workspace
      // written down*. The kinds are a column on the table and a picker in the
      // modal, which is where they are read.
      //
      // All three are drawn even at zero, the way the guardrails card draws
      // `Never claim` when it is empty: a ledger with twelve facts about
      // itself and no problems on file is writing about nobody, and that is
      // only visible if the empty line is there to read.
      const rows: BrandRow[] = FACT_SUBJECTS.map((subject) => ({
        key: subject.id,
        // The subject's own glyph, not a tick: these rows are a breakdown of
        // what is in the ledger, and there is nothing about "5 problems" that
        // is either done or not done.
        mark: glyph(subject.icon),
        label: subject.plural,
        // No `details`: the line under a voice or an audience says what *that
        // entry* is, and the equivalent here would be the definition of the
        // axis — three sentences of vocabulary on a card whose job is to say
        // how big the ledger is. They belong beside the picker that sets it,
        // and that is where they are.
        meta: statedCount(countBySubject(facts, subject.id)),
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
          label: tally.expired > 0 ? 'Past its date' : 'Needs re-checking',
          details:
            tally.expired > 0
              ? 'Still being repeated in everything generated here.'
              : 'Expires soon — cheap to confirm now, wrong the moment it lapses.',
          meta: [
            tally.expired > 0 ? `${tally.expired} expired` : null,
            tally.due > 0 ? `${tally.due} within a month` : null,
          ]
            .filter(Boolean)
            .join(', '),
        })
      }
      return rows
    }

    case 'guardrails': {
      const g = data.guardrails
      // The distinction the section could not draw until there was somewhere
      // to record it: a workspace that decided it needs no rules gets a row
      // saying so, and one that has never answered falls through to the card's
      // empty state, which is written as an unfinished to-do. See `readStance`.
      if (!g) {
        return stance?.none
          ? [
              {
                key: 'stance',
                mark: glyph(ShieldCheckIcon),
                label: 'Nothing to restrict, deliberately',
                details:
                  'Somebody looked at this and decided the workspace has no claims worth guarding.',
                meta: decidedLine(stance.decidedAt),
              },
            ]
          : []
      }
      return [
        {
          key: 'may',
          mark: glyph(SealCheckIcon),
          label: 'May claim',
          details:
            g.mayClaim.length === 0
              ? 'Nothing has a form we know is safe to repeat.'
              : undefined,
          meta: statedCount(g.mayClaim.length),
        },
        {
          key: 'never',
          mark: glyph(ProhibitIcon, g.neverClaim.length === 0),
          label: 'Never claim',
          details:
            g.neverClaim.length === 0
              ? 'Nothing is off limits. Every voice here may promise anything, in any words.'
              : undefined,
          meta: statedCount(g.neverClaim.length),
        },
        {
          key: 'banned',
          mark: glyph(TextAaIcon),
          label: 'Banned words',
          meta:
            g.bannedWords.length > 0 ? `${g.bannedWords.length} words` : 'none',
        },
        {
          key: 'disclaimer',
          mark: glyph(ChatTeardropTextIcon),
          label: 'Disclaimer',
          details: g.disclaimer.trim() || undefined,
          meta: g.disclaimer.trim() ? 'carried by every post' : 'none',
        },
      ]
    }

    case 'look': {
      const l = data.look
      if (!l) return []
      return [
        {
          key: 'logos',
          mark: { kind: 'task', done: l.logos.length > 0 },
          label: 'Logo',
          meta: l.logos.length > 0 ? `${l.logos.length} with jobs` : 'none',
        },
        {
          key: 'palette',
          mark: { kind: 'task', done: l.palette.length > 0 },
          label: 'Palette',
          meta:
            l.palette.length > 0 ? `${l.palette.length} with roles` : 'none',
        },
        {
          key: 'type',
          mark: { kind: 'task', done: l.typefaces.length > 0 },
          label: 'Type',
          meta: l.typefaces.length > 0 ? l.typefaces.join(', ') : 'none',
        },
        {
          key: 'imagery',
          mark: { kind: 'task', done: l.referenceImages.length > 0 },
          label: 'Reference imagery',
          meta: countOrNone(l.referenceImages.length),
        },
      ]
    }

    case 'templates':
      return data.templates.map((template) => {
        const have = new Set(template.ratios.map((r) => r.ratio))
        const covered = EXPECTED_RATIOS.filter((r) => have.has(r)).length
        return {
          key: template.id,
          // One PNG per ratio is the price of not reflowing, so a missing ratio
          // is not cosmetic — it is the set being unusable wherever that ratio
          // is what gets posted.
          mark: { kind: 'task', done: covered === EXPECTED_RATIOS.length },
          label: template.name,
          details: template.isDefault
            ? 'Applied by default, wherever nothing else claims the platform.'
            : template.platforms.length > 0
              ? `For ${template.platforms.join(', ')}.`
              : 'Claimed by no platform, and not the default — nothing ever reaches it.',
          meta: `${covered} of ${EXPECTED_RATIOS.length} ratios`,
        }
      })
  }
}

/**
 * A row marked by what it *is* rather than by whether it is done.
 *
 * Ink is the same as an unticked row's, so a card of glyphs and a card of ticks
 * sit at the same weight down the column — except where the finding is the
 * absence itself, which is the one place this screen spends a colour.
 */
function glyph(Glyph: Icon, alarming = false): LineItemIndicator {
  return {
    kind: 'custom',
    node: (
      <Glyph
        className={cn(
          'size-4',
          alarming ? 'text-destructive' : 'text-senary-foreground',
        )}
        aria-hidden
      />
    ),
  }
}

/** When the decision was taken — the whole content of a stance. */
function decidedLine(iso: string | null): string {
  const shown = iso
    ? formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  return shown ? `Decided ${shown}` : 'Decided'
}

function countOrNone(n: number): string {
  return n > 0 ? String(n) : 'none'
}

/**
 * A count with its unit, because a bare "3" is a number nobody can price. Every
 * other line on this screen ends in a word — "4 of 4 ratios", "never used" —
 * and these rows read as a spreadsheet without one.
 */
function statedCount(n: number): string {
  return n > 0 ? `${n} stated` : 'none'
}

/**
 * The sections a single website read would fill, named as the screen names
 * them. Templates stays out: nothing on a website is a per-ratio PNG, and an
 * offer that over-promises is the fastest way to make the one good first-run
 * path look unreliable.
 */
function missingSectionNames(data: BrandData): string[] {
  const missing: string[] = []
  if (data.voices.length === 0) missing.push('voices')
  if (data.audiences.length === 0) missing.push('audiences')
  if (!data.guardrails) missing.push('guardrails')
  // Named separately from the guardrails it is stored with, because a website
  // read fills the two from different halves of a site — the rules off the
  // small print, the facts off the product pages — and a workspace that has
  // written rules and stated nothing true is the common case, not the odd one.
  if ((data.guardrails?.facts.length ?? 0) === 0) missing.push('facts')
  // No `look` here while the section is not offered — the card would promise to
  // fill something the user has no way to see or check afterwards.
  return missing
}

/**
 * The stack, and **not a scroller**. The page owns the scrolling so that the
 * header can sit inside it and the cards can dissolve under its gradient
 * instead of being cut off by it — see `BrandDetail`. A component that scrolls
 * itself cannot be put under a sticky header, which is why this one stopped.
 */
function Wrapper({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>
}

function OverviewSkeleton() {
  return (
    <Wrapper>
      <Skeleton className="mx-auto h-40 w-full max-w-content" />
      <Skeleton className="mx-auto h-40 w-full max-w-content" />
      <Skeleton className="mx-auto h-40 w-full max-w-content" />
    </Wrapper>
  )
}
