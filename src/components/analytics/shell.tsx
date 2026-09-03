import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'

/**
 * The furniture the analytics sections sit in — and the contract every card on
 * these surfaces keeps.
 *
 * A card is a fixed run of beats, in the order the question arrives. Each one
 * owns something, and owns it alone; the moment two beats can both carry a
 * fact, the card starts saying it twice in different clothes.
 *
 * | Beat | Component | Owns | Never |
 * |---|---|---|---|
 * | Header | `SectionCard` | the name, the window it covers, and at most one control | a figure, a finding |
 * | Figures | `FigureGrid` / `FigureTile` | the numbers, their deltas, and which side of usual they fall on | anything the reader can't select or compare |
 * | Detail | the section's own chart or list | the shape behind the selected figure — drawn, not narrated | a restatement of the figure above it |
 * | Insight | `InsightLine` | what the picture can't say: where it came from, what moved it. **The only beat with a tone mark** | method, sample size, caveats |
 * | Actions | `Todos`, the next-action list | what to do about it, and how urgently | a finding restated as a chore |
 * | Notes | `Basis` | provenance, method, coverage, what was excluded | a status mark, a colour, an emphasis |
 *
 * The actions beat is kept deliberately apart from the insight beat: an insight
 * is a finding, an action is an unfinished step the reader owns. Mixing them
 * makes the findings look like chores and the chores look optional.
 *
 * The line the beats are policed on is **status**. A coloured mark means "this
 * is a claim, and here is which way it cuts" — so it lives where a claim lives:
 * an insight's tone, a figure's delta, an action's urgency. Nowhere else. A note
 * carrying one is claiming to be a finding while looking like a footnote, which
 * is how the foot of a card ends up out-weighing the list it was qualifying.
 *
 * `SectionCard` also carries one thing the campaign Overview's card does not: a
 * **scope note** saying whether the section obeys the date lens at the top of
 * the page. That distinction is the whole reason these surfaces aren't called
 * Performance — "your posts land on Tuesday evenings" is not a fact about the
 * last 28 days, and a section that silently sits under a window control claims
 * it is.
 */
export type SectionScope = 'lens' | 'all-time' | 'ahead'

/**
 * What the controls above this card do and do not reach.
 *
 * Composed rather than tabulated because the two dimensions are independent: a
 * card can obey the period and ignore the platform filter, and stacking two
 * separate footnotes to say so puts more type under the heading than the
 * heading. One sentence, whichever combination it is.
 */
function scopeNote(
  t: TFunction,
  scope: SectionScope,
  everyPlatform: boolean,
): string | null {
  if (!everyPlatform) {
    if (scope === 'all-time') return t('analytics.scopeNote.allTime')
    if (scope === 'ahead') return t('analytics.scopeNote.ahead')
    return null
  }
  if (scope === 'all-time') return t('analytics.scopeNote.allTimeEveryPlatform')
  if (scope === 'ahead') return t('analytics.scopeNote.aheadEveryPlatform')
  return t('analytics.scopeNote.everyPlatform')
}

export function SectionCard({
  title,
  qualifier,
  scope = 'lens',
  everyPlatform = false,
  status,
  children,
  className,
}: {
  title: string
  /**
   * The rest of the title, set back a shade — usually the window the card is
   * describing.
   *
   * Part of the heading rather than a note beside it: "What happened" and "over
   * last 28 days" are one phrase, and splitting them across the header put the
   * window in the far corner where it read as a control someone could change.
   * Faded because the reader needs it once, on the way in.
   */
  qualifier?: ReactNode
  scope?: SectionScope
  /**
   * Whether this card is counted over every platform whatever the filter above
   * says. True for the two reads the server will not narrow — saying so is what
   * keeps a filtered screenshot from being read as the whole picture.
   */
  everyPlatform?: boolean
  status?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const note = scopeNote(t, scope, everyPlatform)
  return (
    <section
      className={cn(
        'flex w-full max-w-content mx-auto flex-col gap-3 rounded-lg bg-primary p-5',
        className,
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-lg font-medium leading-6">
            {title}
            {qualifier && (
              <span className="font-normal text-tertiary-foreground">
                {' '}
                {qualifier}
              </span>
            )}
          </h2>
          {note && <p className="text-xs text-tertiary-foreground">{note}</p>}
        </div>
        {status}
      </header>
      {children}
    </section>
  )
}

/**
 * The figures beat: the numbers the rest of the card is about.
 *
 * Selection is what lets one card carry five figures without becoming five
 * cards: the figures stay comparable at a glance, and the expensive space
 * underneath belongs to whichever one is being asked about.
 *
 * The beat is figures only when figures are the answer. A row of tiles that
 * tallies the list beneath it — three posts ahead, five behind — spends the top
 * of the card restating something the list says by existing; there the beat is
 * the control that decides what the list means instead.
 */
export function FigureGrid({
  children,
  min = '8rem',
  columns,
}: {
  children: ReactNode
  /** Narrowest a tile may get before the row wraps. */
  min?: string
  /**
   * A fixed number of columns, for a row that has to break in a particular
   * place.
   *
   * Auto-fit is the right default — the number of figures differs by scope, and
   * a fixed count leaves a hole beside the odd one out. It is the wrong answer
   * when the count is known and large: seven tiles auto-fitted onto one line are
   * seven slivers, and what the card wants is four and three. Asking for the
   * columns gives the caller that without a breakpoint ladder, at the cost of
   * the tiles going narrower than `min` on a phone — acceptable here, where
   * these surfaces live in a desktop content column.
   */
  columns?: number
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: columns
          ? `repeat(${columns}, minmax(0, 1fr))`
          : `repeat(auto-fit, minmax(${min}, 1fr))`,
      }}
    >
      {children}
    </div>
  )
}

/**
 * One key figure. A button when the card has something to show for it, a plain
 * tile when it doesn't — nothing on this page should look pressable and then
 * do nothing.
 */
export function FigureTile({
  selected = false,
  onSelect,
  className,
  children,
}: {
  selected?: boolean
  onSelect?: () => void
  className?: string
  children: ReactNode
}) {
  const shared = cn(
    'flex min-w-0 flex-col gap-1.5 rounded-md bg-secondary px-4 py-3 text-left',
    onSelect && 'cursor-pointer transition-colors hover:bg-tertiary',
    selected && 'outline outline-1 outline-foreground',
    className,
  )

  if (!onSelect) return <div className={shared}>{children}</div>

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={shared}
    >
      {children}
    </button>
  )
}

/**
 * The things left to do about what the card just said.
 *
 * Kept distinct from an insight on purpose: an insight is a finding, a to-do is
 * an unfinished setup step the reader owns. Mixing them makes the findings look
 * like chores and the chores look optional.
 */
export function Todos({
  items,
}: {
  items: { id: string; text: string; action: string }[]
}) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0"
        >
          <span className="text-sm">{item.text}</span>
          <button
            type="button"
            className="shrink-0 text-xs font-medium underline underline-offset-2"
          >
            {item.action}
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * The last beat: where the numbers above came from, and what they exclude.
 *
 * **A note is never a finding.** Anything the card is willing to say out loud
 * goes in an insight, in a box, with the tone mark that says which way it cuts;
 * a note is the method behind it — sample, window, what was left out — and it
 * carries no status of its own. That is the whole distinction between the two
 * beats, and it only survives if notes look uniformly like notes: one size, one
 * colour, no marks, no emphasis, however important the sentence feels.
 *
 * A confidence dot used to sit here. It read as a verdict on the note, when
 * every note it appeared on already named the sample it was derived from — the
 * dot was a colour restating the number two words to its right, and it made the
 * foot of the card compete with the insight boxes above it.
 *
 * Tertiary, not quaternary: this is supporting text, but it is text people are
 * expected to read before they act. Quaternary is for the parts nobody has to
 * read at all — axis ends, legends, the units under a bar.
 */
export function Basis({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('text-xs text-tertiary-foreground', className)}>
      {children}
    </p>
  )
}

/**
 * What a section says when the data can't carry it yet.
 *
 * Deliberately not an empty chart, and never zeroes: a best-time grid drawn
 * from nine posts looks identical to one drawn from nine hundred, and someone
 * will act on it.
 */
export function NotYet({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-secondary px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-secondary-foreground">{children}</p>
    </div>
  )
}
