import {
  ArrowUUpLeftIcon,
  HandshakeIcon,
  LightningIcon,
  MegaphoneIcon,
  ScalesIcon,
  SealCheckIcon,
  SmileyIcon,
  StorefrontIcon,
  TextAlignLeftIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import type {
  BrandAudience,
  BrandGuardrails,
  BrandVoice,
  VoiceRules,
} from './types'

/**
 * What we offer for a cold start, in all three sections that have one.
 *
 * ## Why these are one module rather than three, and why they left the sections
 *
 * They lived beside the screens that render them, which was right while a
 * starter was a table of English: it sat next to the card it filled. The i18n
 * conversion took the words out and left three tables of *behaviour* with a
 * pair of catalogue accessors each — at which point they had stopped being part
 * of any one screen and started being the same object described three times.
 *
 * Keeping them in the section files also cost every one of those files its fast
 * refresh: `react-refresh/only-export-components` fires on a module that
 * exports both a component and a constant, and its advice is exactly this move.
 * That was already true of `VOICE_STARTERS`; the conversion doubled it by
 * adding the two accessors per section.
 *
 * ## The shape they share
 *
 * A starter is an **id, a glyph, and whatever cannot be a sentence** — for a
 * voice, the five stored rule enums. Everything else is a catalogue key
 * derived from the id, which is what makes these tables safe to keep at module
 * scope: a table of English here would be evaluated once at import and would
 * serve the first language loaded forever after.
 *
 * Two accessors per section, and the split matters:
 *
 * - **`…Copy`** is the card — the title and the line under it. Display only.
 * - **`…Draft`** is what picking one *writes into the workspace's library*, and
 *   it is the reason the drafts are translated rather than left in English. A
 *   fork is not a preview: the name, the use and the prose habits become the
 *   customer's own material, so an English draft handed to a Spanish workspace
 *   is something they must rewrite before they can use it.
 *
 * **Every starter is forked, never linked.** Improving ours must never rewrite
 * anybody's, which is why a draft is a fresh object each call and why the entry
 * keeps a `BrandOrigin` naming what it started as. Their job is to be replaced;
 * a workspace still sounding like the preset it picked six months on is the
 * failure, not the success.
 */

/* ------------------------------------------------------------------ voices */

export type VoiceStarterId = 'plain' | 'warm' | 'sharp'

/**
 * Behaviour only — every word is in the catalogue.
 *
 * `rules` is the five stored enums and nothing else: `opening` and `closing`
 * are prose and come from `voiceStarterDraft`.
 */
export type VoiceStarter = {
  id: VoiceStarterId
  icon: Icon
  rules: Omit<VoiceRules, 'opening' | 'closing'>
}

/**
 * Three, not thirty. A library that needs a search box has failed — picking
 * between twelve near-identical descriptions is the same paralysis as the blank
 * box, one step later. These are far enough apart that the choice is obvious in
 * one read.
 */
export const VOICE_STARTERS: VoiceStarter[] = [
  {
    id: 'plain',
    icon: TextAlignLeftIcon,
    rules: {
      formality: 'neutral',
      person: 'we',
      emoji: 'never',
      hashtags: 'never',
      length: 'short',
    },
  },
  {
    id: 'warm',
    icon: SmileyIcon,
    rules: {
      formality: 'casual',
      person: 'i',
      emoji: 'sparingly',
      hashtags: 'few',
      length: 'medium',
    },
  },
  {
    id: 'sharp',
    icon: LightningIcon,
    rules: {
      formality: 'neutral',
      person: 'i',
      emoji: 'never',
      hashtags: 'few',
      length: 'medium',
    },
  },
]

/** The starter a `?from=` on the editor route names, if it names one at all. */
export function voiceStarter(id: string | undefined): VoiceStarter | null {
  return VOICE_STARTERS.find((s) => s.id === id) ?? null
}

/** The card: what this starter is, in one line each. */
export function voiceStarterCopy(
  t: TFunction,
  starter: VoiceStarter,
): { title: string; body: string } {
  return {
    title: t(`brand.voices.starters.${starter.id}.title` as const),
    body: t(`brand.voices.starters.${starter.id}.body` as const),
  }
}

/**
 * What picking it actually puts in the editor — a name, a use, and a set of
 * rules, and **no samples**.
 *
 * That last part is the honest half of forking a template and the reason the
 * editor says so out loud: a starter is a set of habits, and habits are not a
 * voice. Prefilling samples would hand somebody three posts written for a
 * business that is not theirs, which is the one thing worse here than an empty
 * box.
 */
export function voiceStarterDraft(
  t: TFunction,
  starter: VoiceStarter,
): Pick<BrandVoice, 'name' | 'whenToUse' | 'rules'> {
  return {
    name: t(`brand.voices.starters.${starter.id}.name` as const),
    whenToUse: t(`brand.voices.starters.${starter.id}.whenToUse` as const),
    rules: {
      ...starter.rules,
      opening: t(`brand.voices.starters.${starter.id}.opening` as const),
      closing: t(`brand.voices.starters.${starter.id}.closing` as const),
    },
  }
}

/* --------------------------------------------------------------- audiences */

export type AudienceStarterId = 'customers' | 'nearly' | 'advisers'

/** Behaviour only — the glyph. Every word is in the catalogue. */
export type AudienceStarter = {
  id: AudienceStarterId
  icon: Icon
}

/**
 * Deliberately not three demographics.
 *
 * A starter audience with an age and a country in it would be a guess about
 * somebody else's business, and a wrong guess is worse here than a blank —
 * people accept a plausible-looking description and stop thinking. So each
 * starter is a *relationship* instead: everyone has these three, they are
 * answerable without inventing anything, and each one narrows on its own.
 */
export const AUDIENCE_STARTERS: AudienceStarter[] = [
  { id: 'customers', icon: HandshakeIcon },
  { id: 'nearly', icon: ArrowUUpLeftIcon },
  { id: 'advisers', icon: MegaphoneIcon },
]

/** The starter a `?from=` on the editor route names, if it names one at all. */
export function audienceStarter(
  id: string | undefined,
): AudienceStarter | null {
  return AUDIENCE_STARTERS.find((s) => s.id === id) ?? null
}

/** The card: what this relationship is, in one line each. */
export function audienceStarterCopy(
  t: TFunction,
  starter: AudienceStarter,
): { title: string; body: string } {
  return {
    title: t(`brand.audiences.starters.${starter.id}.title` as const),
    body: t(`brand.audiences.starters.${starter.id}.body` as const),
  }
}

/**
 * What picking it puts in the editor, which is **a name and nothing else**.
 *
 * Voices' starters hand over a set of rules as well, because a register can be
 * described without knowing whose it is. Nothing equivalent exists here: where
 * somebody reads and what loses them are facts about actual people, and a
 * prefilled guess at them is the fantasy that section was built to prevent,
 * arriving with our name on it. The editor says so out loud when it opens.
 */
export function audienceStarterDraft(
  t: TFunction,
  starter: AudienceStarter,
): Pick<BrandAudience, 'name'> {
  return { name: t(`brand.audiences.starters.${starter.id}.name` as const) }
}

/* -------------------------------------------------------------- guardrails */

export type GuardrailStarterId = 'regulated' | 'product' | 'plain'

/** Behaviour only — the glyph. Every word is in the catalogue. */
export type GuardrailStarter = {
  id: GuardrailStarterId
  icon: Icon
}

/**
 * The three shapes the rules take, rather than thirty industries in a dropdown
 * — what you may not promise, what you may not claim exists, and what you may
 * not overstate. Every business is mostly one of them.
 */
export const GUARDRAIL_STARTERS: GuardrailStarter[] = [
  { id: 'regulated', icon: ScalesIcon },
  { id: 'product', icon: StorefrontIcon },
  { id: 'plain', icon: SealCheckIcon },
]

/** The card: which shape the rules take, in one line each. */
export function guardrailStarterCopy(
  t: TFunction,
  starter: GuardrailStarter,
): { title: string; body: string } {
  return {
    title: t(`brand.guardrails.starters.${starter.id}.title` as const),
    body: t(`brand.guardrails.starters.${starter.id}.body` as const),
  }
}

/**
 * What it hands over. Never `facts`, and never the disclaimer.
 *
 * **A template can say what you may never claim. It cannot say what is true.**
 * "No result may be promised" is a rule about a *kind* of business and holds
 * for every firm in it; the fee, the licence number and the settlement time are
 * facts about one company that nobody outside it can guess. The alternative —
 * plausible placeholder facts — is the worst thing this module could ship, an
 * invented rule reading exactly like a checked one in the section people trust
 * without re-reading.
 *
 * Two lists, read with `returnObjects` rather than numbered into
 * `neverClaim1…4`: these are lists of whole sentences, and numbering them would
 * fix their length in the schema for every language that follows. Spread into
 * fresh arrays rather than handed over by reference, because what comes back is
 * the workspace's own draft from here on and a screen editing it must not be
 * editing the catalogue.
 */
export function guardrailStarterDraft(
  t: TFunction,
  starter: GuardrailStarter,
): Pick<BrandGuardrails, 'neverClaim' | 'bannedWords'> {
  return {
    neverClaim: [
      ...t(`brand.guardrails.starters.${starter.id}.neverClaim` as const, {
        returnObjects: true,
      }),
    ],
    bannedWords: [
      ...t(`brand.guardrails.starters.${starter.id}.bannedWords` as const, {
        returnObjects: true,
      }),
    ],
  }
}
