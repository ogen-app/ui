import {
  ChatCircleDotsIcon,
  FrameCornersIcon,
  ShieldIcon,
  SwatchesIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import type { BrandConsumer } from '@/components/brand/types'

/**
 * Brand's sections, as the app names and marks them.
 *
 * One table, for the same reason `campaignSections` is one table: the Overview's
 * cards and the screens they open are two views of the same five things, and a
 * card headed "Templates" over a page reading "Overlays" makes the user work
 * out that they are the same place. Renaming one renames both.
 *
 * **Why this exists at all.** The first cut put all five on a single page as
 * cards, which was wrong in a way that only shows up when you ask what editing
 * one actually needs. These are not five equal card-sized objects: an audience
 * is a short form, a voice is a form plus a samples list you add to and promote
 * into, and a picture template is platform × ratio × customisation — a screen
 * with its own state, for platforms the workspace has not even connected yet. A
 * card can *summarise* any of those. It cannot be where the work happens.
 *
 * So Brand is a **hub and five drilldowns**, not a page and not five tabs. The
 * Overview is the screen `/brand` opens on and the only thing the sidebar
 * points at; each section is a page you go *into*, with one way back. It was
 * tabs for a while — first a bar under the header, then pills on the header
 * line — and both versions had the same fault, which is that a tab bar is
 * lateral navigation for peers you switch between all day. Nobody switches
 * between Guardrails and Look; you go and write one, and come back. Tabs also
 * spent chrome on all five at once on the screen that has the most to say
 * (the Overview), and put the other four one click from an editor you were
 * halfway through.
 *
 * A voice goes one level deeper again (`brand_/voices/$voiceId`), on the
 * trailing-underscore escape the asset editor uses.
 *
 * **Three of the five are offered today** — see `shown`, and read the rest of
 * this file as describing the module rather than the current menu.
 */
export type BrandSectionId =
  'voices' | 'audiences' | 'guardrails' | 'look' | 'templates'

/**
 * **This table carries behaviour only — the words are in the catalogue.**
 *
 * The label, the description and the empty line used to sit here as English
 * literals, which made this a module-level `const` holding copy: it is
 * evaluated once at import, so it would have frozen whichever language loaded
 * first and gone on serving it after a switch. They are now
 * `brand.sections.<id>.*`, read through `brandSectionCopy` at the point of use.
 *
 * What is left is the part that genuinely is not language: which glyph, which
 * hue, who reads the section, and whether it is offered at all.
 */
export type BrandSectionInfo = {
  id: BrandSectionId
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
   * Which parts of the app read it — the honesty rule from CON-226 §9, kept on
   * the table so a section cannot quietly claim a reader it does not have.
   * `[]` is a real and current answer for three of these five.
   */
  readBy: BrandConsumer[]
  /**
   * Whether the section is offered at all yet.
   *
   * **Look and Templates are off**, and the same rule that keeps `readBy`
   * honest is why. Their storage exists (CON-228 ships `PUT /api/brand/look`
   * and the template routes) and their read screens are built, but nothing
   * writes to them from the UI and nothing reads them out: the image flows that
   * would consume a logo, a palette and a frame are CON-105/CON-132, both
   * unstarted. A section that can be opened, cannot be filled in, and would
   * change nothing if it were is worse than one that is not there — it spends
   * two of the Overview's five cards teaching the user that this screen is a
   * mock-up.
   *
   * Hidden rather than deleted, because the argument for them is unchanged and
   * every screen behind this flag still compiles and still renders; turning
   * them back on is this one word. The `false` rows are what mark them as
   * pending rather than abandoned.
   */
  shown: boolean
}

export const BRAND_SECTIONS: BrandSectionInfo[] = [
  {
    id: 'voices',
    icon: ChatCircleDotsIcon,
    tone: 'var(--brand-voices)',
    readBy: ['plan', 'post'],
    shown: true,
  },
  {
    id: 'audiences',
    icon: UsersThreeIcon,
    tone: 'var(--brand-audiences)',
    readBy: ['plan', 'post'],
    shown: true,
  },
  {
    id: 'guardrails',
    icon: ShieldIcon,
    tone: 'var(--brand-guardrails)',
    readBy: [],
    shown: true,
  },
  {
    id: 'look',
    icon: SwatchesIcon,
    tone: 'var(--brand-look)',
    readBy: [],
    shown: false,
  },
  {
    id: 'templates',
    icon: FrameCornersIcon,
    tone: 'var(--brand-templates)',
    readBy: [],
    shown: false,
  },
]

export function brandSection(id: BrandSectionId): BrandSectionInfo {
  return BRAND_SECTIONS.find((s) => s.id === id)!
}

/**
 * What a section is called and what it is for, in the active language.
 *
 * Three strings rather than three call sites, because the places that want one
 * of them want all three: the Overview's card and the section's own intro card
 * are two renderings of the same entry, and splitting them into
 * `brandSectionLabel` / `brandSectionDescription` would be three chances to
 * read a different section's copy into one card.
 *
 * - `label` — sentence case. It heads the Overview's card *and* the intro card
 *   of the page that card opens, so arriving somewhere confirms you clicked the
 *   right thing rather than making you check.
 * - `description` — what the material has to be, not what the screen does. "A
 *   voice is three to eight real posts" is the sentence somebody arriving on an
 *   empty section needs; "here you can manage your voices" is not a sentence at
 *   all.
 * - `whenEmpty` — what the section's absence costs, in one line, worded as a
 *   consequence and never as a scold. Two places read it and both get the same
 *   string: the Overview card with no rows to show, and the intro card while
 *   the section is empty.
 */
export function brandSectionCopy(
  t: TFunction,
  id: BrandSectionId,
): { label: string; description: string; whenEmpty: string } {
  return {
    label: t(`brand.sections.${id}.label` as const),
    description: t(`brand.sections.${id}.description` as const),
    whenEmpty: t(`brand.sections.${id}.whenEmpty` as const),
  }
}

/**
 * The sections a user can actually reach — what the Overview lists and what
 * "all of Brand" means to anything counting it.
 *
 * `BRAND_SECTIONS` stays whole so `brandSection` can still answer for a hidden
 * one: the screens behind Look and Templates are built and still ask their
 * table for a label. It is the *offer* that is withdrawn, not the entry.
 */
export const SHOWN_BRAND_SECTIONS: BrandSectionInfo[] = BRAND_SECTIONS.filter(
  (s) => s.shown,
)
