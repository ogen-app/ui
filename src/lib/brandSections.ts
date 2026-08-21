import {
  ChatCircleDotsIcon,
  FrameCornersIcon,
  ShieldIcon,
  SwatchesIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { BrandConsumer, BrandData } from '@/components/brand/types'

/**
 * Brand's sections, as the app names and marks them.
 *
 * One table, for the same reason `campaignSections` is one table: the tab bar
 * and the Overview's cards are two views of the same five things, and a card
 * headed "Templates" over a tab reading "Overlays" makes the user work out that
 * they are the same place. Renaming one renames both.
 *
 * **Why this exists at all.** The first cut put all five on a single page as
 * cards, which was wrong in a way that only shows up when you ask what editing
 * one actually needs. These are not five equal card-sized objects: an audience
 * is a short form, a voice is a form plus a samples list you add to and promote
 * into, and a picture template is platform × ratio × customisation — a screen
 * with its own state, for platforms the workspace has not even connected yet. A
 * card can *summarise* any of those. It cannot be where the work happens.
 *
 * So Brand is a section rather than a page, on the shape Content Bank already
 * uses: a layout route owning the tab bar, one child route per tab, and the
 * heavy editors escaping to fullscreen below (`brand_/...`, the same
 * trailing-underscore escape the asset editor uses).
 */
export type BrandSectionId =
  | 'voices'
  | 'audiences'
  | 'guardrails'
  | 'look'
  | 'templates'

export type BrandSectionInfo = {
  id: BrandSectionId
  /** Sentence case, for headings and cards. */
  label: string
  /** The tab bar's own voice — capitals, matching Content Bank's tabs. */
  tabLabel: string
  /** The Overview card's open button — same rule as `campaignSections`. */
  openLabel: string
  icon: Icon
  /**
   * The glyph's permanent colour (see `--brand-*` in index.css), the same
   * device `campaignSections` uses in the rail: five otherwise-identical line
   * glyphs are hard to tell apart at 20px, and the hue is what you actually aim
   * at once you have used the screen for a day.
   *
   * It stays on the icon and nowhere else. Headings, rows and buttons are all
   * the same ink, so colour here means "which section" and never "this one
   * needs attention" — the moment a section's colour could also mean a state,
   * both readings stop working.
   */
  tone: string
  /**
   * What this section's absence costs, in one line, for the Overview card that
   * has no rows to show.
   *
   * On the table rather than in the card because the section's own empty state
   * makes the same claim, and two sentences saying the same thing differently
   * is how a screen starts to read as though two people wrote it. Worded as a
   * consequence, never as a scold: an empty section is a to-do, and a workspace
   * on day one has five of them.
   */
  whenEmpty: string
  /**
   * Which parts of the app read it — the honesty rule from CON-226 §9, kept on
   * the table so a section cannot quietly claim a reader it does not have.
   * `[]` is a real and current answer for three of these five.
   */
  readBy: BrandConsumer[]
}

export const BRAND_SECTIONS: BrandSectionInfo[] = [
  {
    id: 'voices',
    label: 'Voices',
    tabLabel: 'VOICES',
    openLabel: 'OPEN VOICES',
    icon: ChatCircleDotsIcon,
    tone: 'var(--brand-voices)',
    whenEmpty: 'No voice of its own — everything generated here sounds generated.',
    readBy: ['plan', 'post'],
  },
  {
    id: 'audiences',
    label: 'Audiences',
    tabLabel: 'AUDIENCES',
    openLabel: 'OPEN AUDIENCES',
    icon: UsersThreeIcon,
    tone: 'var(--brand-audiences)',
    whenEmpty: 'Nobody in particular is being written to.',
    readBy: ['plan', 'post'],
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    tabLabel: 'GUARDRAILS',
    openLabel: 'OPEN GUARDRAILS',
    icon: ShieldIcon,
    tone: 'var(--brand-guardrails)',
    whenEmpty: 'Nothing is off limits. Any voice here may promise anything.',
    readBy: [],
  },
  {
    id: 'look',
    label: 'Look',
    tabLabel: 'LOOK',
    openLabel: 'OPEN LOOK',
    icon: SwatchesIcon,
    tone: 'var(--brand-look)',
    whenEmpty:
      'No logo, no colours, no type — generated images land wherever the model puts them.',
    readBy: [],
  },
  {
    id: 'templates',
    label: 'Templates',
    tabLabel: 'TEMPLATES',
    openLabel: 'OPEN TEMPLATES',
    icon: FrameCornersIcon,
    tone: 'var(--brand-templates)',
    whenEmpty: 'Pictures go out bare. Nothing marks one as yours once it has left the app.',
    readBy: [],
  },
]

/** The tab bar's input — derived, never written out a second time. */
export const BRAND_TABS = [
  { id: 'overview', label: 'OVERVIEW' },
  ...BRAND_SECTIONS.map((s) => ({ id: s.id, label: s.tabLabel })),
]

/**
 * The same tabs, with what is behind them counted.
 *
 * **Only the libraries carry a number, and only when it is not zero.** It is
 * the same split the Overview's rows make: a library (voices, audiences,
 * templates) holds several things and can be counted, a singleton (guardrails,
 * look) holds one and cannot — `GUARDRAILS 1` would be a number invented to
 * fill the slot. Zero is left off for the opposite reason: an empty section
 * says so at length on its own screen, and a row of `0`s across the bar reads
 * as five failures before the workspace has done anything wrong.
 *
 * Worth carrying at all because it is the one thing the bar can say that the
 * label cannot: whether opening the tab will show you anything.
 */
export function brandTabs(data?: BrandData) {
  const counts: Partial<Record<BrandSectionId, number>> = data
    ? {
        voices: data.voices.length,
        audiences: data.audiences.length,
        templates: data.templates.length,
      }
    : {}

  return [
    { id: 'overview', label: 'OVERVIEW' },
    ...BRAND_SECTIONS.map((s) => ({
      id: s.id,
      label: s.tabLabel,
      count: counts[s.id] || undefined,
    })),
  ]
}

export function brandSection(id: BrandSectionId): BrandSectionInfo {
  return BRAND_SECTIONS.find((s) => s.id === id)!
}
