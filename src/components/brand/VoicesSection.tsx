import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { brandSection } from '@/lib/brandSections'
import { defaultVoiceLabel, sampleCount, usageLine } from './format'
import {
  AddEntryCard,
  BrandLibrary,
  DefaultStar,
  LibraryCard,
  OriginLine,
  PlainActionCard,
  StarterCard,
  StarterGroup,
} from './shell'
import { VOICE_STARTERS, voiceStarterCopy } from './starters'
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
  const { t } = useTranslation()
  const empty = voices.length === 0

  return (
    <BrandLibrary
      add={
        empty ? (
          // The blank form, and it keeps the same slot the add card has when
          // there are voices: whatever else the screen is offering, the way to
          // write one yourself is the last card on the page.
          <PlainActionCard
            label={t('brand.voices.writeFromScratch')}
            onClick={onAdd}
          />
        ) : (
          <AddEntryCard
            label={t('brand.voices.add')}
            hint={t('brand.voices.addHint')}
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
 * What an empty section offers, which is no longer *three* cards but two: the
 * page's own intro card states the absence above this, so the old "Nothing here
 * sounds like you yet" card would have been the second heading in a row saying
 * roughly one thing.
 */
function VoicesEmpty({ onStart }: { onStart?: (starterId: string) => void }) {
  const { t } = useTranslation()
  const { tone } = brandSection('voices')
  return (
    <StarterGroup
      title={t('brand.voices.starterGroupTitle')}
      body={t('brand.voices.starterGroupBody')}
    >
      {VOICE_STARTERS.map((starter) => {
        const copy = voiceStarterCopy(t, starter)
        return (
          <StarterCard
            key={starter.id}
            icon={starter.icon}
            tone={tone}
            title={copy.title}
            body={copy.body}
            onClick={onStart ? () => onStart(starter.id) : undefined}
          />
        )
      })}
    </StarterGroup>
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
  const { t } = useTranslation()
  const thin =
    voice.samples.length > 0 && voice.samples.length < MIN_VOICE_SAMPLES
  const sample = voice.samples[0]

  const facts = [
    sampleCount(t, voice.samples.length),
    usageLine(t, voice.usage),
  ]
  if (thin) facts.push(t('brand.voices.thin', { count: MIN_VOICE_SAMPLES }))
  // Not a warning, and not in the corner. Nothing is broken — those posts were
  // written and they stand. This is an offer, so it reads with the other facts.
  if (voice.postsBehind)
    facts.push(t('brand.voices.postsBehind', { count: voice.postsBehind }))

  return (
    <LibraryCard onClick={onOpen ? () => onOpen(voice.id) : undefined}>
      <header className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
            {voice.name}
          </h3>
          {voice.isDefault && (
            <DefaultStar
              backed={voice.samples.length >= MIN_VOICE_SAMPLES}
              label={defaultVoiceLabel(t, voice)}
              className="text-sm leading-5 text-secondary-foreground"
            />
          )}
        </div>
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
          {t('brand.voices.noSamples')}
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
          <li>{rulesLine(t, voice.rules)}</li>
          <li>{facts.join(t('brand.facts.separator'))}</li>
          <li>
            <OriginLine origin={voice.origin} />
          </li>
        </ul>
      </footer>
    </LibraryCard>
  )
}

/**
 * The explicit rules, as one line rather than a grid of chips — and as a string
 * rather than a component, so it can only ever be set in the type its own
 * footer block is set in.
 *
 * Six chips under every card turned the section into a spec sheet and pulled
 * the eye off the sample, which is the one thing on the card that actually
 * distinguishes one voice from another.
 *
 * The three `Record<…, string>` maps this used to keep are gone into the
 * catalogue: a module-level table of English is exactly the constant that
 * freezes whichever language loaded first. `formality` and `length` join them —
 * they used to print the stored enum straight out, which is English by accident
 * rather than by decision.
 */
function rulesLine(t: TFunction, rules: VoiceRules): string {
  return [
    t(`brand.voices.rules.formality.${rules.formality}` as const),
    t(`brand.voices.rules.person.${rules.person}` as const),
    t(`brand.voices.rules.emoji.${rules.emoji}` as const),
    t(`brand.voices.rules.hashtags.${rules.hashtags}` as const),
    t(`brand.voices.rules.length.${rules.length}` as const),
  ].join(t('brand.facts.separator'))
}
