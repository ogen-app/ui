import { useTranslation } from 'react-i18next'
import { brandSection } from '@/lib/brandSections'
import { usageLine } from './format'
import {
  AddEntryCard,
  BrandLibrary,
  LibraryCard,
  OriginLine,
  PlainActionCard,
  StarterCard,
  StarterGroup,
} from './shell'
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
}: {
  audiences: BrandAudience[]
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
          <PlainActionCard
            label={t('brand.audiences.describeYourself')}
            onClick={onAdd}
          />
        ) : (
          <AddEntryCard
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
          <AudienceCard key={audience.id} audience={audience} onOpen={onOpen} />
        ))
      )}
    </BrandLibrary>
  )
}

/** Two cards, not three — the page's intro card states the absence. */
function AudiencesEmpty({
  onStart,
}: {
  onStart?: (starterId: string) => void
}) {
  const { t } = useTranslation()
  const { tone } = brandSection('audiences')
  return (
    <StarterGroup
      title={t('brand.audiences.starterGroupTitle')}
      body={t('brand.audiences.starterGroupBody')}
    >
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
    </StarterGroup>
  )
}

function AudienceCard({
  audience,
  onOpen,
}: {
  audience: BrandAudience
  onOpen?: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <LibraryCard onClick={onOpen ? () => onOpen(audience.id) : undefined}>
      <header className="flex min-w-0 flex-col gap-1">
        <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
          {audience.name}
        </h3>
        <p className="text-sm leading-5 text-secondary-foreground">
          {audience.who}
        </p>
      </header>

      {/* The consequences, as a definition list rather than prose. The labels
          are what force the concrete answer: a fantasy audience can be
          described at length and still leave all three of these blank, and on a
          full-width card that emptiness is three visible gaps rather than a
          shorter paragraph. */}
      <dl className="flex flex-col gap-1.5 text-sm leading-5">
        <Consequence
          label={t('brand.audiences.readsOn')}
          value={audience.readsOn}
        />
        <Consequence
          label={t('brand.audiences.scrollsPast')}
          value={audience.scrollsPastWhen}
        />
        <Consequence
          label={t('brand.audiences.believesWhen')}
          value={audience.believesWhen}
        />
      </dl>

      {/* Same block as the voice card's: what it has done, then where it came
          from, bulleted, and set in the same size and colour as the line under
          the name. Kept identical on purpose — two library cards whose feet are
          set differently read as two screens built by two people. */}
      <footer>
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5 text-secondary-foreground">
          <li>{usageLine(t, audience.usage)}</li>
          <li>
            <OriginLine origin={audience.origin} />
          </li>
        </ul>
      </footer>
    </LibraryCard>
  )
}

function Consequence({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-3">
      <dt className="w-36 shrink-0 text-tertiary-foreground">{label}</dt>
      <dd className="min-w-0">
        {value || (
          <span className="text-tertiary-foreground">
            {t('brand.audiences.notSaid')}
          </span>
        )}
      </dd>
    </div>
  )
}
