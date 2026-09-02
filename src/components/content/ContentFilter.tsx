import { useEffect, useMemo, useRef, useState } from 'react'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ZIndex } from '@/config/zIndex'
import {
  EMPTY_FILTER,
  draftName,
  filterChips,
  isFilterActive,
  parseModifier,
  suggest,
  vocabulary,
  withClause,
  withoutClause,
  type ContentFilter as Filter,
  type FilterChip,
  type Suggestion,
} from '@/lib/contentFilter'
import { cn } from '@/lib'
import type { Asset } from '@/types/content'

type Props = {
  /** The documents in scope — where the suggestions come from. */
  assets: Asset[]
  value: Filter
  onChange: (next: Filter) => void
  /** Names what is being narrowed, for the box's accessible label. */
  scopeLabel: string
}

/**
 * One box that takes both halves of a filter: words, and modifiers.
 *
 * The shape is Slack's. Type prose and it narrows by name; type `status:` or
 * pick it from the suggestions and the value you choose leaves the box as a
 * chip. Chips sit inside the field, in front of the cursor, so what is being
 * filtered and where to type next are the same object — and each one carries
 * its own ✕, so undoing part of a filter never means reopening the menu it
 * came from.
 *
 * The earlier version of this laid the clauses out as a fixed sentence — name,
 * status, tags, each with a dropdown, always all three, always in that order.
 * It read well and it was rigid: it could hold exactly one of each, every
 * clause cost a row of width whether it was used or not, and adding a fourth
 * would have meant redrafting the sentence. Chips have none of those limits —
 * nothing, or six, in whatever order they were reached — and the operators
 * disappear into the arrangement: two `status` chips are obviously "either",
 * `status` beside `tag` is obviously "both", two `not`s are obviously neither.
 *
 * Suggestions open on focus rather than waiting to be summoned, because the
 * modifiers are the part nobody discovers by staring at a text box — and each
 * one is offered twice, `Tag is Legal` above `Tag is not Legal`, so the same
 * is true of exclusion.
 */
export function ContentFilter({ assets, value, onChange, scopeLabel }: Props) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  // -1 is nothing highlighted, and Enter then does nothing. Prose that happens
  // to name a status shouldn't turn into a chip because someone finished
  // typing — an item is only ever accepted after it has been aimed at.
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const vocab = useMemo(() => vocabulary(assets), [assets])
  const chips = useMemo(() => filterChips(value, vocab), [value, vocab])
  const suggestions = useMemo(
    () => suggest(draft, value, vocab),
    [draft, value, vocab],
  )
  const narrowed = isFilterActive(value) || draft !== ''

  // The filter can also be cleared from outside — the list's empty state offers
  // RESET FILTERS — and the text in the box is ours to clear, not the parent's.
  // A half-typed modifier survives it: it is not part of the filter yet.
  useEffect(() => {
    if (isFilterActive(value)) return
    setDraft((current) => (parseModifier(current) ? current : ''))
  }, [value])

  // Keyboard travel has to bring the row with it, or the highlight walks off
  // the bottom of a long tag list and the list appears to stop responding.
  useEffect(() => {
    if (active < 0) return
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const type = (next: string) => {
    setDraft(next)
    setOpen(true)
    // A begun modifier is already a commitment to pick one of its values, so
    // the first is aimed at from the start; prose is not.
    setActive(parseModifier(next) ? 0 : -1)
    onChange({ ...value, name: draftName(next) })
  }

  const accept = (suggestion: Suggestion) => {
    const { negated } = suggestion
    if (suggestion.kind === 'facet') {
      // Halfway, not all the way: the keyword lands in the box and its values
      // become the suggestions, so choosing the facet and choosing the value
      // are one continuous motion.
      setDraft(`${negated ? '-' : ''}${suggestion.keyword}:`)
      onChange({ ...value, name: '' })
      setActive(0)
    } else {
      setDraft('')
      onChange(
        withClause(
          { ...value, name: '' },
          suggestion.facet,
          suggestion.id,
          negated,
        ),
      )
      setActive(-1)
    }
    setOpen(true)
    inputRef.current?.focus()
  }

  const remove = (chip: FilterChip) => {
    onChange(withoutClause(value, chip.facet, chip.id))
    inputRef.current?.focus()
  }

  // Wanted ⇄ unwanted, in place. The chip is where the value already is, so it
  // is where changing your mind about it belongs — the alternative is deleting
  // it and finding it again in a menu that no longer offers it.
  const flip = (chip: FilterChip) => {
    onChange(withClause(value, chip.facet, chip.id, !chip.negated))
    inputRef.current?.focus()
  }

  const clear = () => {
    setDraft('')
    setActive(-1)
    onChange(EMPTY_FILTER)
    inputRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace eats the last chip, which is the one thing a chip field must
    // do: the alternative is aiming at a 12px ✕ to undo something typed.
    if (event.key === 'Backspace' && draft === '' && chips.length > 0) {
      remove(chips[chips.length - 1])
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setActive(-1)
      return
    }
    if (suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) return setOpen(true)
      setActive((i) => (i + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (event.key === 'Enter' && open && suggestions[active]) {
      event.preventDefault()
      accept(suggestions[active])
    }
  }

  return (
    <div
      className="relative w-full shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
          setActive(-1)
        }
      }}
    >
      {/* The whole strip is the field — clicking the gap between chips puts the
          cursor where it would have gone anyway. */}
      <div
        className="flex w-full flex-wrap items-center gap-1.5 border-b-2 border-quaternary bg-input-secondary px-3 py-1.5 transition-colors focus-within:border-foreground"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        <MagnifyingGlassIcon
          className="size-4 shrink-0 text-tertiary-foreground"
          aria-hidden
        />

        {chips.map((chip) => (
          <ChipToken
            key={`${chip.facet}:${chip.id}`}
            chip={chip}
            onFlip={() => flip(chip)}
            onRemove={() => remove(chip)}
          />
        ))}

        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => type(event.target.value)}
          onFocus={() => setOpen(true)}
          // Click as well as focus: Escape closes the list without moving the
          // caret, and clicking the box you are already in is how anyone asks
          // for it back.
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={
            chips.length > 0
              ? 'Filter by name…'
              : 'Filter by name, or type status: or tag:'
          }
          aria-label={`Filter ${scopeLabel}`}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls="content-filter-suggestions"
          aria-activedescendant={
            active >= 0 ? `content-filter-option-${active}` : undefined
          }
          autoComplete="off"
          className="h-7 min-w-48 flex-1 bg-transparent text-sm font-medium outline-none placeholder:font-normal placeholder:text-tertiary-foreground"
        />

        {/* Kept in the layout even when there is nothing to clear: appearing on
            the first keystroke would take its width out of the input under a
            cursor that is already typing. */}
        <Button
          variant="ghost"
          size="sm"
          className={cn('shrink-0', !narrowed && 'invisible')}
          tabIndex={narrowed ? undefined : -1}
          aria-hidden={!narrowed}
          onClick={clear}
        >
          <XIcon />
          <span>CLEAR</span>
        </Button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="content-filter-suggestions"
          role="listbox"
          // Sized to its rows, not to the field: the box is the width of the
          // page and a five-word option stranded on a 1000px line is two
          // separate things to read — the modifier, then a long walk to the ✕.
          className="bg-popover text-popover-foreground absolute top-full left-0 mt-1 max-h-72 w-max max-w-full min-w-72 overflow-y-auto rounded-sm p-1 shadow-lg"
          style={{ zIndex: ZIndex.popover }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={
                suggestion.kind === 'facet'
                  ? `facet:${suggestion.facet}:${suggestion.negated}`
                  : `${suggestion.facet}:${suggestion.id}:${suggestion.negated}`
              }
              id={`content-filter-option-${index}`}
              role="option"
              aria-selected={index === active}
              // Taking the mousedown would blur the box, close this list and
              // drop the click before it lands.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => accept(suggestion)}
              className={cn(
                'flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm select-none',
                index === active && 'bg-popover-hover',
              )}
            >
              <Modifier
                keyword={suggestion.keyword}
                negated={suggestion.negated}
                className="min-w-0 flex-1"
              >
                {/* The values it holds, not a description of the modifier —
                    the question is "what would that get me", and three
                    examples answer it better than a sentence. */}
                <span className="truncate text-secondary-foreground">
                  {suggestion.kind === 'facet'
                    ? suggestion.hint
                    : suggestion.label}
                </span>
              </Modifier>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * A modifier written out: `Status is Ready`, or `Tag is not Legal`.
 *
 * Neither the `tag:` of the typed grammar nor the `tag (Legal)` that replaced
 * it. The colon belongs where it is being typed — it is the character that
 * turns a word into a keyword — but a settled clause is a sentence about the
 * list, and both the colon and the parentheses read as syntax that escaped
 * from the parser. `is not` also says the thing that a bare `not` in front of
 * a noun only implies.
 *
 * The ink runs the other way from the first draft: the clause is in the
 * page's own colour and the value one step lighter. What varies down a stack
 * of chips is the value, so the fixed half is what a reader can skim past —
 * dimming the words that repeat, rather than the ones that don't, is what
 * lets four chips be read as four different things.
 */
function Modifier({
  keyword,
  negated,
  className,
  children,
}: {
  keyword: string
  negated: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      <span className="shrink-0">
        {/* Capitalised here rather than in the vocabulary: `status` is what
            gets typed, and the grammar should keep exactly one spelling. */}
        <span className="capitalize">{keyword}</span> is
        {negated && <span className="font-medium"> not</span>}
      </span>
      {children}
    </span>
  )
}

/**
 * One clause, sitting in the field.
 *
 * An excluding chip is drawn with a dashed edge — a hole in the set rather
 * than a piece of it — and says `is not` outright. Not in the destructive red:
 * nothing here is dangerous, and that colour already means "this failed" two
 * lines below on every row. Its ✕ doesn't turn red on hover either, for the
 * same reason twice over — removing a chip removes a *restriction*, so the one
 * gesture on this row that can't lose anything was the only one dressed as a
 * warning.
 */
function ChipToken({
  chip,
  onFlip,
  onRemove,
}: {
  chip: FilterChip
  onFlip: () => void
  onRemove: () => void
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full shrink-0 items-center border border-tertiary bg-secondary text-[13px]/4',
        chip.negated && 'border-dashed',
      )}
    >
      <button
        type="button"
        onClick={onFlip}
        aria-label={`${chip.negated ? 'Include' : 'Exclude'} ${chip.keyword} ${chip.label}`}
        title={chip.negated ? 'Include these instead' : 'Exclude these instead'}
        className="flex h-full min-w-0 items-center pl-1.5 hover:bg-tertiary"
      >
        <Modifier keyword={chip.keyword} negated={chip.negated}>
          <span className="truncate text-secondary-foreground">
            {chip.label}
          </span>
        </Modifier>
      </button>
      <button
        type="button"
        aria-label={`Remove ${chip.keyword} ${chip.label}`}
        onClick={onRemove}
        className="flex h-full shrink-0 items-center px-1 text-tertiary-foreground hover:text-primary-foreground"
      >
        <XIcon weight="bold" className="size-3" />
      </button>
    </span>
  )
}
