import {
  ScalesIcon,
  SealCheckIcon,
  StorefrontIcon,
  type Icon,
} from '@phosphor-icons/react'
import { brandSection } from '@/lib/brandSections'
import {
  BrandLibrary,
  ChipList,
  LibraryCard,
  PlainActionCard,
  StarterCard,
  StarterGroup,
} from './shell'
import type { BrandGuardrails } from './types'

/**
 * The part with real weight rather than decoration.
 *
 * Guardrails apply to **every** generation regardless of which voice is chosen
 * — never selected, never overridden. That is the point: a sarcastic post and a
 * corporate post about the same regulated product must be factually identical
 * and must both avoid the same promises. A brand module without this layer is
 * styling.
 *
 * Which is why it is a singleton and why it has no picker. Everything else on
 * this screen is a cast you choose from; this is the one thing that is simply
 * true, and giving it a selector would imply a campaign could opt out of the
 * facts.
 *
 * **A singleton on the library layout, with one part left out.** It takes the
 * same furniture as Voices and Audiences — the reader line at the top, one
 * full-width card, an empty state that offers three of ours — because a screen
 * that looks like its neighbours is a screen nobody has to learn twice. What it
 * does not take is the add card: there is exactly one set of guardrails, and an
 * `ADD GUARDRAILS` at the foot of a filled page would offer a second one that
 * cannot exist.
 *
 * `NEVER CLAIM` keeps its literal capitals. Same rule as the destructive-action
 * labels: the emphasis is part of the copy, so it survives copy/paste, screen
 * readers and any restyle — and this is the row where getting it wrong is a
 * regulator's problem rather than a design one.
 */
export function GuardrailsSection({
  guardrails,
  onEdit,
  onStart,
}: {
  guardrails: BrandGuardrails | null
  onEdit?: () => void
  /** Fork one of ours. */
  onStart?: (starterId: string) => void
}) {
  const empty = !guardrails

  return (
    <BrandLibrary
      add={
        empty ? (
          <PlainActionCard label="WRITE THE RULES YOURSELF" onClick={onEdit} />
        ) : undefined
      }
    >
      {guardrails ? (
        <GuardrailsCard guardrails={guardrails} onEdit={onEdit} />
      ) : (
        <GuardrailsEmpty onStart={onStart} />
      )}
    </BrandLibrary>
  )
}

/**
 * The three we offer for a cold start.
 *
 * Not thirty industries in a dropdown. These are the three shapes the rules
 * take — what you may not promise, what you may not claim exists, and what you
 * may not overstate — and every business is mostly one of them. Each is forked
 * on pick and every sentence in it is meant to be edited: a guardrail nobody
 * has read is the one kind of entry here that is worse than an empty section,
 * because it is the one people will trust.
 */
const STARTERS: { id: string; icon: Icon; title: string; body: string }[] = [
  {
    id: 'regulated',
    icon: ScalesIcon,
    title: 'Regulated, and outcomes are the risk',
    body: 'Finance, health, law. No result may be promised or implied, every figure names its source, and nothing is described as advice.',
  },
  {
    id: 'product',
    icon: StorefrontIcon,
    title: 'A product, and features are the risk',
    body: 'Software, hardware, retail. Only what ships today: the roadmap is not a feature, and no integration exists until it is live.',
  },
  {
    id: 'plain',
    icon: SealCheckIcon,
    title: 'Everyone else, and overstating is the risk',
    body: 'No superlatives, no invented statistics, no customer named without permission and no authority borrowed from a logo.',
  },
]

/** Two cards, not three — the page's intro card states the absence. */
function GuardrailsEmpty({ onStart }: { onStart?: (starterId: string) => void }) {
  const { tone } = brandSection('guardrails')
  return (
    <StarterGroup
      title="Start from a template"
      body="Three shapes the rules take, rather than thirty industries. Pick the closest — every sentence in it is meant to be read and edited, because this is the one section people will trust."
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
  )
}

function GuardrailsCard({
  guardrails,
  onEdit,
}: {
  guardrails: BrandGuardrails
  onEdit?: () => void
}) {
  return (
    <LibraryCard onClick={onEdit}>
      <Rail
        label="Facts"
        hint="What is true, so it stops being guessed"
        items={guardrails.facts}
        whenEmpty="Nothing stated, so every number and every product detail is invented fresh."
      />
      <Rail
        label="May claim"
        items={guardrails.mayClaim}
        whenEmpty="Nothing sanctioned, so nothing has a form we know is safe to repeat."
      />
      <Rail
        // Literal capitals — copy, not CSS. See the note above.
        label="NEVER CLAIM"
        items={guardrails.neverClaim}
        tone="hard"
        whenEmpty="Nothing is off limits. Every voice here may promise anything, in any words."
      />

      {guardrails.bannedWords.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
            Banned words
          </p>
          <ChipList items={guardrails.bannedWords} max={8} />
        </div>
      )}

      {guardrails.boilerplate && (
        <div className="flex flex-col gap-2">
          <p className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
            Boilerplate
          </p>
          <p className="border-l-2 border-quaternary pl-3 text-sm leading-5 text-secondary-foreground">
            {guardrails.boilerplate}
          </p>
        </div>
      )}
    </LibraryCard>
  )
}

/**
 * One list of rules. Statements are shown in full rather than counted: "4
 * claims" is a number about the guardrails, and the whole reason this section
 * exists is that somebody has to be able to read the actual sentence and
 * disagree with it.
 */
function Rail({
  label,
  hint,
  items,
  tone = 'normal',
  whenEmpty,
}: {
  label: string
  hint?: string
  items: string[]
  tone?: 'normal' | 'hard'
  /**
   * What this rail's absence costs, in its own terms.
   *
   * Written per rail because one shared sentence repeated three times is what
   * the first draft did, and three identical lines under three different
   * headings read as a rendering bug rather than as three findings. They are
   * also not equally serious: an empty *may claim* is a missed convenience and
   * an empty **NEVER CLAIM** is the whole section failing open.
   */
  whenEmpty: string
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-1">
        <p className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
          {label}
        </p>
        <p className="text-xs text-tertiary-foreground">{whenEmpty}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <p className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
          {label}
        </p>
        {hint && <p className="text-xs text-tertiary-foreground">{hint}</p>}
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li
            key={item}
            // The one tone step on this screen, and it is spent here. Colour
            // means "this is a claim about what may not happen" — the same
            // reason an insight carries a tone on the analytics cards and a
            // footnote never does.
            className={
              tone === 'hard'
                ? 'border-l-2 border-destructive pl-3 text-sm leading-5 text-secondary-foreground'
                : 'border-l-2 border-quaternary pl-3 text-sm leading-5 text-secondary-foreground'
            }
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
