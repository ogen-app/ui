import {
  ChatCircleDotsIcon,
  FrameCornersIcon,
  ShieldIcon,
  SwatchesIcon,
  UsersThreeIcon,
  type Icon,
} from '@phosphor-icons/react'
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
 */
export type BrandSectionId =
  | 'voices'
  | 'audiences'
  | 'guardrails'
  | 'look'
  | 'templates'

export type BrandSectionInfo = {
  id: BrandSectionId
  /**
   * Sentence case. It heads the Overview's card *and* the intro card of the
   * page that card opens — one word for one place, so arriving somewhere
   * confirms you clicked the right thing rather than making you check.
   */
  label: string
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
   * What the section is and what it is for, in the two sentences its own page
   * leads with.
   *
   * It is on the table rather than in the component because the page has no
   * heading of its own any more: the intro card at the top of a section *is*
   * its title, so the label and the sentences under it are one entry. Written
   * as what the material has to be, not as what the screen does — "a voice is
   * three to eight real posts" is the sentence somebody arriving on an empty
   * section needs, and "here you can manage your voices" is not a sentence at
   * all.
   */
  description: string
  /**
   * What this section's absence costs, in one line.
   *
   * Two places read it: the Overview card that has no rows to show, and the
   * section's own intro card, which adds it under the description while the
   * section is empty. Deliberately the same string in both — the section used
   * to state its own absence in a longer paragraph of its own writing, and two
   * sentences making one claim differently is how a screen starts to read as
   * though two people wrote it.
   *
   * Worded as a consequence, never as a scold: an empty section is a to-do,
   * and a workspace on day one has five of them.
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
    icon: ChatCircleDotsIcon,
    tone: 'var(--brand-voices)',
    description:
      'A voice is three to eight real posts you would be happy to have written, and the app writes from those rather than from an adjective. Several is normal: sarcastic commentary and the company page are not two tones of one personality.',
    whenEmpty: 'No voice of its own — everything generated here sounds generated.',
    readBy: ['plan', 'post'],
  },
  {
    id: 'audiences',
    label: 'Audiences',
    icon: UsersThreeIcon,
    tone: 'var(--brand-audiences)',
    description:
      'Who the posts are written to, described by what follows from it: where they read, what makes them scroll past, and what they need before they believe a number. Every campaign asks who this is for, and this is where the answer comes from.',
    whenEmpty: 'Nobody in particular is being written to.',
    readBy: ['plan', 'post'],
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    icon: ShieldIcon,
    tone: 'var(--brand-guardrails)',
    description:
      'What is true, what may be claimed, and what may never be. These are the rules nobody opts out of — they hold for every generated post whichever voice wrote it, and the more convincing the voice, the more convincing the invention they exist to stop.',
    whenEmpty: 'Nothing is off limits. Any voice here may promise anything.',
    readBy: [],
  },
  {
    id: 'look',
    label: 'Look',
    icon: SwatchesIcon,
    tone: 'var(--brand-look)',
    description:
      'Logos with a declared job, colours with roles, type, and imagery to work from. Enough for the app to make a picture that looks like yours without stopping to ask which of four files goes in the corner.',
    whenEmpty:
      'No logo, no colours, no type — generated images land wherever the model puts them.',
    readBy: [],
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: FrameCornersIcon,
    tone: 'var(--brand-templates)',
    description:
      'A full-canvas frame per platform and per ratio — not a layout engine, which is why nothing here reflows. A set that misses a ratio its platform posts in is unusable there, so the screen leads with platforms rather than with sets.',
    whenEmpty: 'Pictures go out bare. Nothing marks one as yours once it has left the app.',
    readBy: [],
  },
]

export function brandSection(id: BrandSectionId): BrandSectionInfo {
  return BRAND_SECTIONS.find((s) => s.id === id)!
}
