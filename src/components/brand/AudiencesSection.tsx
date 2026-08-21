import {
  ArrowUUpLeftIcon,
  HandshakeIcon,
  MegaphoneIcon,
  type Icon,
} from '@phosphor-icons/react'
import { brandSection } from '@/lib/brandSections'
import { usageLine } from './format'
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
  const empty = audiences.length === 0

  return (
    <BrandLibrary
      readBy={brandSection('audiences').readBy}
      add={
        empty ? (
          <PlainActionCard label="DESCRIBE ONE YOURSELF" onClick={onAdd} />
        ) : (
          <AddEntryCard
            label="ADD AUDIENCE"
            hint="Another one, for the posts the others are not written to."
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

/**
 * The three we offer for a cold start, and they are deliberately not three
 * demographics.
 *
 * A starter audience with an age and a country in it would be a guess about
 * somebody else's business, and a wrong guess is worse here than a blank —
 * people accept a plausible-looking description and stop thinking. So each
 * starter is a *relationship* instead: everyone has these three, they are
 * answerable without inventing anything, and each one narrows on its own.
 */
const STARTERS: { id: string; icon: Icon; title: string; body: string }[] = [
  {
    id: 'customers',
    icon: HandshakeIcon,
    title: 'The people who already buy from you',
    body: 'Described as they actually are, not as the deck describes them. The easiest one to get right and the one most often skipped.',
  },
  {
    id: 'nearly',
    icon: ArrowUUpLeftIcon,
    title: 'The people who nearly bought',
    body: 'They know the category, they looked at you, and they chose somebody else. What they needed and did not get is the whole brief.',
  },
  {
    id: 'advisers',
    icon: MegaphoneIcon,
    title: 'The people who recommend you',
    body: 'They never buy anything. They pass your name on, and they need something quotable to pass on with it.',
  },
]

function AudiencesEmpty({ onStart }: { onStart?: (starterId: string) => void }) {
  const { icon, tone } = brandSection('audiences')
  return (
    <>
      <LibraryIntro
        icon={icon}
        tone={tone}
        title="Nobody in particular is being written to"
        body="Every campaign will keep asking who this is for, and keep getting the answer typed in a hurry — which is how posts end up addressed to everyone and read by nobody. An audience earns its place here by saying what follows from it: where they read, what makes them scroll past, and what they need before they believe a number."
      />
      <StarterGroup
        title="Start from a template"
        body="Three every business has, so none of them needs inventing. Pick one and fill in what follows from it."
      >
        {STARTERS.map((starter) => (
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

function AudienceCard({
  audience,
  onOpen,
}: {
  audience: BrandAudience
  onOpen?: (id: string) => void
}) {
  return (
    <LibraryCard onClick={onOpen ? () => onOpen(audience.id) : undefined}>
      <header className="flex min-w-0 flex-col gap-1">
        <h3 className="font-display text-xl font-medium leading-7 tracking-tight">
          {audience.name}
        </h3>
        <p className="text-sm leading-5 text-secondary-foreground">{audience.who}</p>
      </header>

      {/* The consequences, as a definition list rather than prose. The labels
          are what force the concrete answer: a fantasy audience can be
          described at length and still leave all three of these blank, and on a
          full-width card that emptiness is three visible gaps rather than a
          shorter paragraph. */}
      <dl className="flex flex-col gap-1.5 text-sm leading-5">
        <Consequence label="Reads on" value={audience.readsOn} />
        <Consequence label="Scrolls past" value={audience.scrollsPastWhen} />
        <Consequence label="Believes you when" value={audience.believesWhen} />
      </dl>

      {/* Same block as the voice card's: what it has done, then where it came
          from, bulleted, and set in the same size and colour as the line under
          the name. Kept identical on purpose — two library cards whose feet are
          set differently read as two screens built by two people. */}
      <footer>
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5 text-secondary-foreground">
          <li>{usageLine(audience.usage)}</li>
          <li>
            <OriginLine origin={audience.origin} />
          </li>
        </ul>
      </footer>
    </LibraryCard>
  )
}

function Consequence({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-36 shrink-0 text-tertiary-foreground">{label}</dt>
      <dd className="min-w-0">
        {value || <span className="text-tertiary-foreground">— not said</span>}
      </dd>
    </div>
  )
}
