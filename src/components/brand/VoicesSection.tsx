import {
  LightningIcon,
  SmileyIcon,
  TextAlignLeftIcon,
  type Icon,
} from '@phosphor-icons/react'
import { brandSection } from '@/lib/brandSections'
import { sampleCount, usageLine } from './format'
import {
  AddEntryCard,
  BrandLibrary,
  LibraryCard,
  LibraryIntro,
  OriginLine,
  PlainActionCard,
  StarterCard,
  StarterGroup,
} from './shell'
import { MIN_VOICE_SAMPLES, type BrandVoice, type VoiceRules } from './types'

/**
 * The cast, as its own screen.
 *
 * **A workspace has several voices, and that is normal.** The standard advice
 * is one voice with situational tones, and it does not survive a real case:
 * heavy British sarcasm for news commentary, a finfluencer register for Friday
 * jokes, and mundane corporate for the company page are not three tones of one
 * personality. The section is written for three-to-six entries, not for one
 * with a settings form around it.
 *
 * **One voice, one full-width card.** The first cut laid them out two-across
 * inside a single section card, which is the shape of a summary — and the
 * summary already exists, on the Overview. Half a column is not enough room for
 * the one thing that actually distinguishes two voices, which is a sample
 * written in each of them, so the grid was quietly deciding this screen could
 * only ever show names.
 *
 * The card shows **a sample**, in the voice, before it shows anything else.
 * That is the section's whole design position: a voice named "Witty,
 * professional, bold" is a colour picker where every swatch is grey. Everything
 * else — the rules, the origin, the counts — is set underneath the thing you
 * actually judge it by.
 *
 * This is the layout the other text sections follow once it settles.
 */
export function VoicesSection({
  voices,
  onAdd,
  onOpen,
  onStart,
}: {
  voices: BrandVoice[]
  /** Write one from nothing. */
  onAdd?: () => void
  onOpen?: (id: string) => void
  /** Fork one of ours. */
  onStart?: (starterId: string) => void
}) {
  const empty = voices.length === 0

  return (
    <BrandLibrary
      readBy={brandSection('voices').readBy}
      add={
        empty ? (
          // The blank form, and it keeps the same slot the add card has when
          // there are voices: whatever else the screen is offering, the way to
          // write one yourself is the last card on the page.
          <PlainActionCard label="WRITE ONE FROM SCRATCH" onClick={onAdd} />
        ) : (
          <AddEntryCard
            label="ADD VOICE"
            hint="Another one, for the posts none of the above are right for."
            onClick={onAdd}
          />
        )
      }
    >
      {empty ? (
        <VoicesEmpty onStart={onStart} />
      ) : (
        voices.map((voice) => (
          <VoiceCard key={voice.id} voice={voice} onOpen={onOpen} />
        ))
      )}
    </BrandLibrary>
  )
}

/**
 * The three we offer for a cold start.
 *
 * Three and not thirty. A library that needs a search box has failed — picking
 * between twelve near-identical descriptions is the same paralysis as the blank
 * box, one step later. These are far enough apart that the choice is obvious in
 * one read, and each one is **forked on pick**, so improving ours never rewrites
 * anybody's.
 *
 * Their job is to be replaced. If a workspace still sounds like the preset it
 * picked six months on, that is the failure, not the success — which is why the
 * screen keeps asking for samples afterwards.
 */
export type VoiceStarter = {
  id: string
  icon: Icon
  title: string
  body: string
  /**
   * What picking it actually puts in the editor — a name, a use, and a set of
   * rules, and **no samples**.
   *
   * That last part is the honest half of forking a template and the reason the
   * editor says so out loud: a starter is a set of habits, and habits are not a
   * voice. Prefilling samples would hand somebody three posts written for a
   * business that is not theirs, which is the one thing worse here than an
   * empty box.
   */
  draft: Pick<BrandVoice, 'name' | 'whenToUse' | 'rules'>
}

export const VOICE_STARTERS: VoiceStarter[] = [
  {
    id: 'plain',
    icon: TextAlignLeftIcon,
    title: 'Plain and direct',
    body: 'Short sentences, no jargon, no emoji. Says the thing and stops.',
    draft: {
      name: 'Plain and direct',
      whenToUse: 'Anything that has to be understood on one read',
      rules: {
        formality: 'neutral',
        person: 'we',
        emoji: 'never',
        hashtags: 'never',
        length: 'short',
        opening: 'States the point in the first sentence.',
      },
    },
  },
  {
    id: 'warm',
    icon: SmileyIcon,
    title: 'Warm and conversational',
    body: 'One person talking to another. Contractions, the odd aside, first name terms.',
    draft: {
      name: 'Warm and conversational',
      whenToUse: 'The posts that are meant to sound like a person, not a company',
      rules: {
        formality: 'casual',
        person: 'i',
        emoji: 'sparingly',
        hashtags: 'few',
        length: 'medium',
        opening: 'Opens with something that actually happened.',
      },
    },
  },
  {
    id: 'sharp',
    icon: LightningIcon,
    title: 'Sharp and opinionated',
    body: 'Takes a position in the opening line and defends it. Dry, a little arch, never neutral.',
    draft: {
      name: 'Sharp and opinionated',
      whenToUse: 'Commentary, and anything the industry is already arguing about',
      rules: {
        formality: 'neutral',
        person: 'i',
        emoji: 'never',
        hashtags: 'few',
        length: 'medium',
        opening: 'Opens with the claim, then earns it.',
      },
    },
  },
]

/** The starter a `?from=` on the editor route names, if it names one at all. */
export function voiceStarter(id: string | undefined): VoiceStarter | null {
  return VOICE_STARTERS.find((s) => s.id === id) ?? null
}

function VoicesEmpty({ onStart }: { onStart?: (starterId: string) => void }) {
  const { icon, tone } = brandSection('voices')
  return (
    <>
      <LibraryIntro
        icon={icon}
        tone={tone}
        title="Nothing here sounds like you yet"
        body="Everything generated in this workspace currently reads like everything else generated anywhere. A voice is three to eight real posts you would be happy to have written, and the app writes from those rather than from an adjective."
      />
      <StarterGroup
        title="Start from a template"
        body="Yours the moment you pick it — a copy, not a link, so ours changing never changes yours. The samples you add afterwards are what stop it sounding like a template."
      >
        {VOICE_STARTERS.map((starter) => (
          <StarterCard
            key={starter.id}
            icon={starter.icon}
            tone={tone}
            title={starter.title}
            body={starter.body}
            onClick={onStart ? () => onStart(starter.id) : undefined}
          />
        ))}
      </StarterGroup>
    </>
  )
}

/**
 * One voice, in three type sizes and no more.
 *
 * The first version had eight: a display name, a secondary sub-line, a badge in
 * the top-right corner, the sample, a caption under the sample, a tertiary
 * rules line, a secondary counts line and a tertiary origin. Every one of them
 * was individually defensible and together they read as a form — the eye had no
 * idea which of the eight it was meant to land on, and the answer is always the
 * sample.
 *
 * So the card is now:
 *
 * 1. **The name**, display size.
 * 2. **Everything else**, `text-sm` — when to use it, the sample, and the
 *    bulleted facts at the foot. The sample keeps the left rule; it is the only
 *    ruled thing left on the card, so the rule now means "this is written in
 *    the voice" rather than being one border among several.
 *
 * Two, then, rather than three: the foot was set smaller and greyer for a
 * while, and shrinking it is the reflex that produced the eight-size card in
 * the first place. Type size is a claim about *how* something is read, not
 * about how much it matters — the bullets are already subordinate by being
 * bulleted, at the foot, after the sample, and a second demotion on top of that
 * only bought a line nobody could read at arm's length.
 *
 * Three things were dropped rather than restyled, because restyling them would
 * have kept the density and only flattened the contrast:
 *
 * - **"Reads as: …"**, the machine's reading of the samples. It sat directly
 *   under a sample saying much the same thing in weaker words. It still exists
 *   — on the Overview, where there is no room for a sample and a one-liner is
 *   all there is.
 * - **The corner badge.** `n could be redone` is a fact about this voice like
 *   the counts are, and it now sits with them instead of claiming the one
 *   position on the card reserved for something urgent.
 * - **The dashed warning box** around a missing sample. The empty state now
 *   takes the sample's own shape and slot, so the two states are the same card
 *   with different words in it — which is also what makes the emptiness legible
 *   at a glance down a column of four.
 */
function VoiceCard({
  voice,
  onOpen,
}: {
  voice: BrandVoice
  onOpen?: (id: string) => void
}) {
  const thin = voice.samples.length > 0 && voice.samples.length < MIN_VOICE_SAMPLES
  const sample = voice.samples[0]

  const facts = [sampleCount(voice.samples.length), usageLine(voice.usage)]
  if (thin) facts.push(`${MIN_VOICE_SAMPLES} is where it starts working`)
  // Not a warning, and not in the corner. Nothing is broken — those posts were
  // written and they stand. This is an offer, so it reads with the other facts.
  if (voice.postsBehind) facts.push(`${voice.postsBehind} could be redone`)

  return (
    <LibraryCard onClick={onOpen ? () => onOpen(voice.id) : undefined}>
      <header className="flex min-w-0 flex-col gap-1">
        <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
          {voice.name}
        </h3>
        <p className="text-sm leading-5 text-secondary-foreground">
          {voice.whenToUse}
        </p>
      </header>

      {/* The sample carries the card. A left rule rather than quote marks:
          these are posts, not quotations, and typographic quotes would read as
          us citing the customer back at them. */}
      {sample ? (
        <blockquote className="whitespace-pre-line border-l-2 border-quaternary pl-3 text-sm leading-5">
          {sample}
        </blockquote>
      ) : (
        <p className="border-l-2 border-quaternary pl-3 text-sm leading-5 text-tertiary-foreground">
          No samples. This voice has a name and nothing behind it — it will
          generate exactly what no voice at all would.
        </p>
      )}

      {/* Three bullets: what it is, what it has done, where it came from. A
          list rather than three stacked lines, because the middle one wraps on
          a narrow column and without markers the wrapped half reads as a fourth
          fact. Commas inside a bullet, since the bullet already does the
          separating a middle dot was doing — and the same size and colour as
          the line under the name, because the bullets and the position are
          already saying this is the subordinate part. */}
      <footer>
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5 text-secondary-foreground">
          <li>{rulesLine(voice.rules)}</li>
          <li>{facts.join(', ')}</li>
          <li>
            <OriginLine origin={voice.origin} />
          </li>
        </ul>
      </footer>
    </LibraryCard>
  )
}

const EMOJI_LABEL: Record<VoiceRules['emoji'], string> = {
  never: 'no emoji',
  sparingly: 'some emoji',
  freely: 'emoji freely',
}

const HASHTAG_LABEL: Record<VoiceRules['hashtags'], string> = {
  never: 'no hashtags',
  few: 'few hashtags',
  many: 'hashtag-heavy',
}

const PERSON_LABEL: Record<VoiceRules['person'], string> = {
  i: 'first person',
  we: 'we',
  third: 'third person',
}

/**
 * The explicit rules, as one line rather than a grid of chips — and as a string
 * rather than a component, so it can only ever be set in the type its own
 * footer block is set in.
 *
 * Six chips under every card turned the section into a spec sheet and pulled
 * the eye off the sample, which is the one thing on the card that actually
 * distinguishes one voice from another.
 */
function rulesLine(rules: VoiceRules): string {
  return [
    rules.formality,
    PERSON_LABEL[rules.person],
    EMOJI_LABEL[rules.emoji],
    HASHTAG_LABEL[rules.hashtags],
    `${rules.length} posts`,
  ].join(', ')
}
