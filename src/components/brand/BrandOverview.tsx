import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { LineItem } from '@/components/ui/line-item'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { BRAND_SECTIONS, type BrandSectionId, type BrandSectionInfo } from '@/lib/brandSections'
import { FirstRun } from './FirstRun'
import { sampleCount, usageLine } from './format'
import { WholeBrandOffer } from './shell'
import { EXPECTED_RATIOS } from './TemplatesSection'
import { isBrandEmpty, MIN_VOICE_SAMPLES, type BrandData } from './types'

/**
 * Brand's landing tab: what is in each section, and a way into it.
 *
 * **This is an index, not the work surface** — the distinction the first cut got
 * wrong. The five sections used to be stacked here in full, which made one page
 * responsible both for showing what your brand is and for being where you
 * change it. It could not be both: a picture template is platform × ratio ×
 * customisation and will never fit in a tile, so the page either grew until it
 * was unusable or the sections stayed too shallow to work in. Each section now
 * owns a tab; this one answers *what is in there, and what is missing*.
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
 */
export function BrandOverview({
  state,
  showWhenEmpty = false,
  onOpen,
}: {
  state: BrandOverviewState
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
        <FirstRun onSkip={() => setSkippedFirstRun(true)} />
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <WholeBrandOffer fills={missingSectionNames(data)} />
      {BRAND_SECTIONS.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          rows={sectionRows(section.id, data)}
          onOpen={onOpen}
        />
      ))}
    </Wrapper>
  )
}

export type BrandOverviewState =
  | { isPending: true; data?: undefined }
  | { isPending: false; data: BrandData }

/**
 * One thing the section holds, as one row.
 *
 * `done` is "there is something behind this", never "this is right" — a voice
 * with three samples is ticked whether or not the samples are any good, because
 * the screen can honestly know the first and cannot know the second.
 */
type BrandRow = {
  key: string
  done: boolean
  label: string
  /** One line under the label: what this thing actually is. */
  details?: string
  /**
   * The counts, on a third line — samples, usage, coverage.
   *
   * Its presence is also what makes the row an *entry* rather than a *task*
   * (see `LineItemVariant`), and the two go together rather than being two
   * settings: a row that names a thing from the library is the row that has
   * counts to report, and a row that names a slot of a singleton is the row
   * that has one number for the margin.
   */
  meta?: string
  /** For slot rows: one number, right-aligned. */
  trailing?: string
}

function SectionCard({
  section,
  rows,
  onOpen,
}: {
  section: BrandSectionInfo
  rows: BrandRow[]
  onOpen?: (id: BrandSectionId) => void
}) {
  const Icon = section.icon

  return (
    <SettingsCard
      title={
        <>
          {/* The section's permanent hue, and the only colour on the card.
              Five grey line glyphs down one page are five identical marks; the
              hue is what makes the card you are looking for findable without
              reading the headings. Same device as the campaign rail. */}
          <Icon className="size-5 shrink-0" style={{ color: section.tone }} aria-hidden />
          <span className="truncate">{section.label}</span>
          {/* The honesty rule (CON-226 §9) at index length. The section's own
              tab still says it in a sentence; here it is three words, because
              five sentences down one page is the noise that made this screen
              read as an essay. */}
          {section.readBy.length === 0 && (
            <StatusBadge tone="neutral" label="Nothing reads this yet" />
          )}
        </>
      }
      actions={
        onOpen && (
          <Button variant="ghost" size="sm" onClick={() => onOpen(section.id)}>
            {section.openLabel}
          </Button>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-secondary-foreground">{section.whenEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row.key}>
              <LineItem
                variant={row.meta ? 'entry' : 'task'}
                indicator={{ kind: 'task', done: row.done }}
                label={row.label}
                details={row.details}
                meta={row.meta}
                trailing={row.trailing}
              />
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
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
function sectionRows(id: BrandSectionId, data: BrandData): BrandRow[] {
  switch (id) {
    case 'voices':
      return data.voices.map((voice) => ({
        key: voice.id,
        // The samples are the voice, so they are what the tick is about. A
        // named voice with nothing behind it generates exactly what no voice
        // would, and it is the failure this row exists to make visible.
        done: voice.samples.length >= MIN_VOICE_SAMPLES,
        label: voice.name,
        // No description when there is nothing to describe it by, rather than a
        // sentence explaining the absence. Three template voices in a row each
        // explaining their own emptiness reads as a rendering bug — the same
        // failure the guardrail rails had — and the row already says it twice
        // over: an empty tick, and `no samples, never used` in the margin.
        details: voice.summary || undefined,
        meta: [sampleCount(voice.samples.length), usageLine(voice.usage)].join(', '),
      }))

    case 'audiences':
      return data.audiences.map((audience) => ({
        key: audience.id,
        // Named is not described. The tick is the three consequence lines,
        // because those are what make an audience usable rather than a label.
        done: Boolean(audience.readsOn && audience.scrollsPastWhen && audience.believesWhen),
        label: audience.name,
        details: audience.summary || undefined,
        meta: usageLine(audience.usage),
      }))

    case 'guardrails': {
      const g = data.guardrails
      if (!g) return []
      return [
        {
          key: 'facts',
          done: g.facts.length > 0,
          label: 'Facts',
          details: g.facts.length === 0 ? 'Every number and product detail is invented fresh.' : undefined,
          trailing: statedCount(g.facts.length),
        },
        {
          key: 'may',
          done: g.mayClaim.length > 0,
          label: 'May claim',
          details:
            g.mayClaim.length === 0 ? 'Nothing has a form we know is safe to repeat.' : undefined,
          trailing: statedCount(g.mayClaim.length),
        },
        {
          // Literal capitals — copy, not CSS, same rule as the
          // destructive-action labels. This is the row where getting it wrong
          // is a regulator's problem rather than a design one.
          key: 'never',
          done: g.neverClaim.length > 0,
          label: 'NEVER CLAIM',
          details:
            g.neverClaim.length === 0
              ? 'Nothing is off limits. Every voice here may promise anything, in any words.'
              : undefined,
          trailing: statedCount(g.neverClaim.length),
        },
        {
          key: 'banned',
          done: g.bannedWords.length > 0,
          label: 'Banned words',
          trailing: g.bannedWords.length > 0 ? `${g.bannedWords.length} words` : 'none',
        },
        {
          key: 'boilerplate',
          done: g.boilerplate.trim().length > 0,
          label: 'Boilerplate',
          details: g.boilerplate.trim() || undefined,
          trailing: g.boilerplate.trim() ? 'written' : 'none',
        },
      ]
    }

    case 'look': {
      const l = data.look
      if (!l) return []
      return [
        {
          key: 'logos',
          done: l.logos.length > 0,
          label: 'Logo',
          trailing: l.logos.length > 0 ? `${l.logos.length} with jobs` : 'none',
        },
        {
          key: 'palette',
          done: l.palette.length > 0,
          label: 'Palette',
          trailing: l.palette.length > 0 ? `${l.palette.length} with roles` : 'none',
        },
        {
          key: 'type',
          done: l.typefaces.length > 0,
          label: 'Type',
          trailing: l.typefaces.length > 0 ? l.typefaces.join(', ') : 'none',
        },
        {
          key: 'imagery',
          done: l.referenceImages.length > 0,
          label: 'Reference imagery',
          trailing: countOrNone(l.referenceImages.length),
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
          done: covered === EXPECTED_RATIOS.length,
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

function countOrNone(n: number): string {
  return n > 0 ? String(n) : 'none'
}

/**
 * A count with its unit, because a bare "3" in the right margin is a number
 * nobody can price. Every other row on this screen ends in a word — "2 with
 * jobs", "4 of 4 ratios", "never used" — and the guardrail rows read as a
 * spreadsheet without one.
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
  if (!data.look) missing.push('your look')
  return missing
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-3 pt-4 pb-10">{children}</div>
    </div>
  )
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
