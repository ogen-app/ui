import { useTranslation } from 'react-i18next'
import { Card, NewCard } from '@/components/ui/card'
import { brandSection } from '@/lib/brandSections'
import { usageLine } from './format'
import { audienceRun } from './entryMarks'
import { BrandLibrary, LibraryEntry, OriginLine, StarterCard } from './shell'
import { AUDIENCE_STARTERS, audienceStarterCopy } from './starters'
import type { BrandAudience } from './types'

/**
 * Who the content is for — kept separate from voices because the two cross: the
 * same corporate voice addresses two audiences, and merging them multiplies the
 * list instead of shortening it.
 *
 * **This section is a corrective, and is built as one.** Left to a blank box
 * people describe a fantasy — "reach and generous successful people" is the
 * predictable answer to a question nobody has a good way of answering. Three
 * things follow, and all three are in the card below:
 *
 * - **Concrete and narrowing.** Not "professionals" but the version with an
 *   age, a habit and a suspicion in it.
 * - **Show the consequence, not the label.** Every audience says what follows
 *   from it — where they read, what makes them scroll past, what they need
 *   before they believe a number. Then choosing is informative, and the fantasy
 *   answer is visibly useless because it has nothing to put in those lines.
 * - **Never block the fantasy.** Nothing here validates or refuses. The good
 *   path is one click; the fantasy path requires typing.
 *
 * The layout is Voices': one entry per full-width card, the way to add one as
 * the last card, and an empty section that offers three of ours rather than a
 * blank list. Same primitives, so the two screens cannot drift apart.
 */
export function AudiencesSection({
  audiences,
  onAdd,
  onOpen,
  onStart,
  usedBy,
}: {
  audiences: BrandAudience[]
  /** Each audience's "Chosen by …" line (`useUsedBy`), once the campaigns load. */
  usedBy?: Map<string, string>
  /** Describe one from nothing. */
  onAdd?: () => void
  onOpen?: (id: string) => void
  /** Fork one of ours. */
  onStart?: (starterId: string) => void
}) {
  const { t } = useTranslation()
  const empty = audiences.length === 0

  return (
    <BrandLibrary
      add={
        empty ? (
          <NewCard
            capped
            label={t('brand.audiences.describeYourself')}
            hint={t('brand.audiences.describeYourselfHint')}
            onClick={onAdd}
          />
        ) : (
          <NewCard
            capped
            label={t('brand.audiences.add')}
            hint={t('brand.audiences.addHint')}
            onClick={onAdd}
          />
        )
      }
    >
      {empty ? (
        <AudiencesEmpty onStart={onStart} />
      ) : (
        audiences.map((audience) => (
          <AudienceCard
            key={audience.id}
            audience={audience}
            usedBy={usedBy?.get(audience.id)}
            onOpen={onOpen}
          />
        ))
      )}
    </BrandLibrary>
  )
}

/** Two cards, not three — the page's About card states the absence. */
function AudiencesEmpty({
  onStart,
}: {
  onStart?: (starterId: string) => void
}) {
  const { t } = useTranslation()
  const { tone } = brandSection('audiences')
  return (
    <Card title={t('brand.audiences.starterGroupTitle')} capped>
      <p className="text-sm">{t('brand.audiences.starterGroupBody')}</p>
      <div className="grid gap-3">
        {AUDIENCE_STARTERS.map((starter) => {
          const copy = audienceStarterCopy(t, starter)
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
      </div>
    </Card>
  )
}

function AudienceCard({
  audience,
  usedBy,
  onOpen,
}: {
  audience: BrandAudience
  usedBy?: string
  onOpen?: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <LibraryEntry
      section="audiences"
      onOpen={onOpen ? () => onOpen(audience.id) : undefined}
      name={audience.name}
      line={audience.who}
      // The consequences, as one run: where they read, what loses them, what
      // they need before they believe you. Only the ones that are said — an
      // audience with none says so in the run's place.
      run={audienceRun(t, audience)}
      empty={t('brand.entry.notDescribed')}
      facts={[
        usageLine(t, audience.usage),
        usedBy,
        <OriginLine key="origin" origin={audience.origin} />,
      ]}
    />
  )
}
