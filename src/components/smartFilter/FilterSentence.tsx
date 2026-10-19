import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckIcon, PlusIcon, XIcon } from '@phosphor-icons/react'
import { useQueries } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ZIndex } from '@/config/zIndex'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib'
import { nextDay, previousDay } from '@/lib/assetFilter'
import { formatListParts, formatNumber } from '@/lib/intl'
import type {
  Clause,
  CountQuery,
  FilterModel,
  SentenceVocabulary,
  SmartToken,
  ValueOption,
} from '@/lib/smartFilter'

/** The value every list uses for "none" — no campaign, no tags, no document. */
const NONE = 'none'

/** A long list offers a find field from this many values. */
const FIND_FROM = 8

/** How wide the panels are, to keep them inside the line. */
const PANEL_WIDTH = 340

type Opened<Field> = { field: Field; negated: boolean }

type AddItem<Field> =
  | { kind: 'text'; field: Field }
  | { kind: 'quick'; field: Field; option: ValueOption }
  | { kind: 'starter'; field: Field }

type Props<F, Field extends string> = {
  filter: F
  onChange: (next: F) => void
  model: FilterModel<F, Field>
  vocabulary: SentenceVocabulary<Field>
  total: number
  totalUnfiltered: number
  countQuery: CountQuery<F>
  /** The Views dropdown, at the line's start. */
  leading?: ReactNode
  /** At the line's end: Save as group, or an edited group's actions. */
  trailing?: ReactNode
  /** Whether Clear is offered — not while a smart group is open. */
  clearable: boolean
}

/** The values a field's token holds for this operator. */
function valuesOf<F, Field extends string>(
  model: FilterModel<F, Field>,
  filter: F,
  field: Field,
  negated: boolean,
): string[] {
  return (
    model
      .tokensOf(filter)
      .find(
        (t) => t.field === field && t.negated === negated && t.values.length,
      )?.values ?? []
  )
}

/** Typed text as values: comma-separated, trimmed, each once. */
function splitText(text: string): string[] {
  return [
    ...new Set(
      text
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ]
}

/**
 * A list's filter as a sentence you edit (CON-391, carried to Assets by
 * CON-392) — "Showing ideas *from documents*, in *Hotel de Russie*, with a
 * *high or medium* fit" — in place of the token bar, which read like a query
 * being built.
 *
 * The same filter underneath: the list's fields and operators (`model`), the
 * same address, the same counts. Only how it reads and how it is changed are
 * the sentence's. Each token is one **clause**, in a fixed order so the
 * sentence reads right however it was built, worded by one catalogue sentence
 * per field and operator (`vocabulary.clause`). A list may name a **subject**
 * — Assets' type — which, when chosen, reads first and names what is listed:
 * "Showing *PDFs*, in …". A clause's chosen words open its panel — the
 * question, the two-word switch, the values with the server's counts — and
 * its × removes it. `+ add a detail` is the one way in: sentence starters, or
 * typed words, which become a search ("mentioning …", "with … in the title")
 * or a matching name. `/` focuses it from anywhere on the page.
 *
 * Changing a value changes the filter at once; Done only closes the panel.
 * Nothing here filters anything — the filter is the URL, and every number is
 * the server's answer to it.
 */
export function FilterSentence<F, Field extends string>({
  filter,
  onChange,
  model,
  vocabulary: vocab,
  total,
  totalUnfiltered,
  countQuery,
  leading,
  trailing,
  clearable,
}: Props<F, Field>) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const boxRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const [opened, setOpened] = useState<Opened<Field> | null>(null)
  const [adding, setAdding] = useState(false)

  const tokens = useMemo(() => {
    const { order, subject } = vocab
    const rank = (token: SmartToken<Field>) =>
      token.field === subject && !token.negated
        ? -1
        : order.indexOf(token.field)
    return model
      .tokensOf(filter)
      .filter((token) => vocab.fields.includes(token.field))
      .sort(
        (a, b) => rank(a) - rank(b) || Number(a.negated) - Number(b.negated),
      )
  }, [model, filter, vocab])
  const narrowed = tokens.length > 0
  const led =
    !!vocab.subject && tokens[0]?.field === vocab.subject && !tokens[0].negated

  const startAdding = () => {
    setOpened(null)
    setAdding(true)
    requestAnimationFrame(() => addRef.current?.focus())
  }

  // `/` starts a detail from anywhere on the page, unless something else is
  // being typed into.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey)
        return
      const el = document.activeElement as HTMLElement | null
      if (
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.tagName === 'SELECT' ||
        el?.isContentEditable
      )
        return
      event.preventDefault()
      setOpened(null)
      setAdding(true)
      requestAnimationFrame(() => addRef.current?.focus())
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // A press outside the open panel closes it. A press on a clause or on the
  // add button is the clause's own click to answer, so it is left alone.
  useEffect(() => {
    if (!opened) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (panelRef.current?.contains(target)) return
      if (target.closest('[data-clause],[data-add]')) return
      setOpened(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [opened])

  // The panel opens under what it is about — the clause, or the add button
  // for a clause not yet made — and never hangs off the line's right edge.
  // Placed on the DOM, not in state: it follows the sentence as it rewraps.
  useLayoutEffect(() => {
    const box = boxRef.current
    const panel = panelRef.current
    if (!box || !panel) return
    const anchor =
      (opened &&
        box.querySelector<HTMLElement>(
          `[data-clause="${opened.field}:${opened.negated}"]`,
        )) ||
      box.querySelector<HTMLElement>('[data-add]')
    if (!anchor) return
    const outer = box.getBoundingClientRect()
    const rect = anchor.getBoundingClientRect()
    const left = Math.max(
      0,
      Math.min(rect.left - outer.left, outer.width - panel.offsetWidth),
    )
    panel.style.left = `${left}px`
    panel.style.top = `${rect.bottom - outer.top + 6}px`
  })

  const removeToken = (token: SmartToken<Field>) => {
    onChange(model.withoutToken(filter, token))
    if (opened?.field === token.field && opened.negated === token.negated)
      setOpened(null)
  }
  const clearAll = () => {
    onChange(tokens.reduce((f, token) => model.withoutToken(f, token), filter))
    setOpened(null)
  }

  const ids = tokens.map((token) => `${token.field}:${token.negated}`)
  const clauses = tokens.map((token, i) => (
    <ClauseButton
      key={ids[i]}
      id={ids[i]}
      clause={vocab.clause(token)}
      plain={vocab.tokenText(token)}
      open={opened?.field === token.field && opened.negated === token.negated}
      onOpen={() => {
        setAdding(false)
        setOpened((o) =>
          o?.field === token.field && o.negated === token.negated
            ? null
            : { field: token.field, negated: token.negated },
        )
      }}
      onRemove={() => removeToken(token)}
    />
  ))
  // The language's own commas between the clauses: `Intl.ListFormat`, with
  // the clauses standing in as their ids.
  const joined = formatListParts(ids, 'unit', locale).map((part, i) =>
    part.type === 'element' ? (
      clauses[ids.indexOf(part.value)]
    ) : (
      <span key={`sep-${i}`}>{part.value}</span>
    ),
  )

  const count = narrowed
    ? t('content.filter.count', {
        count: total,
        shown: formatNumber(total, {}, locale),
        total: formatNumber(totalUnfiltered, {}, locale),
      })
    : formatNumber(totalUnfiltered, {}, locale)

  return (
    <div className="flex items-start gap-2">
      {leading}
      <div
        ref={boxRef}
        role="group"
        aria-label={t('sentence.label')}
        // The first line sits level with the button's label: the button is
        // 34px, a line 30px (CON-391 — top-aligned, never centred).
        className={cn(
          'relative min-w-0 flex-1 pt-0.5 text-[15px]/[30px] text-secondary-foreground',
          !leading && 'pl-5',
        )}
      >
        {narrowed ? (
          <Trans
            // One key of the list's own; the union is wider than `Trans`
            // resolves.
            i18nKey={
              (led && vocab.showingSubjectKey
                ? vocab.showingSubjectKey
                : vocab.showingKey) as 'ideas.sentence.showing'
            }
            components={{ clauses: <Joined parts={joined} /> }}
          />
        ) : (
          <Trans
            i18nKey={vocab.showingAllKey as 'ideas.sentence.showingAll'}
            components={{
              v: <AllRows open={adding} onClick={startAdding} />,
            }}
          />
        )}{' '}
        <AddDetail
          inputRef={addRef}
          panelRef={panelRef}
          adding={adding}
          onStart={startAdding}
          onStop={() => setAdding(false)}
          filter={filter}
          onChange={onChange}
          model={model}
          vocab={vocab}
          countQuery={countQuery}
          onRemoveLast={() => {
            const last = tokens[tokens.length - 1]
            if (last) removeToken(last)
          }}
          onStarter={(field) => {
            setAdding(false)
            setOpened({ field, negated: false })
          }}
        />
        <span className="ml-2.5 inline-flex items-baseline gap-2.5 text-[13px] whitespace-nowrap text-tertiary-foreground">
          <span
            aria-live="polite"
            className="text-secondary-foreground tabular-nums"
          >
            {count}
          </span>
          {clearable && narrowed && (
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer text-secondary-foreground underline decoration-quaternary underline-offset-3 hover:text-foreground"
            >
              {t('sentence.clear')}
            </button>
          )}
        </span>
        {trailing && (
          <span className="ml-3 inline-flex items-center gap-1 align-middle">
            {trailing}
          </span>
        )}
        {opened && (
          <ClausePanel
            key={`${opened.field}:${opened.negated}`}
            panelRef={panelRef}
            field={opened.field}
            negated={opened.negated}
            filter={filter}
            onChange={onChange}
            model={model}
            vocab={vocab}
            onNegate={(negated) => setOpened({ field: opened.field, negated })}
            onClose={() => setOpened(null)}
          />
        )}
      </div>
    </div>
  )
}

/** The clauses, joined — drawn from its props, whatever `Trans` passes in. */
function Joined({ parts }: { parts: ReactNode[]; children?: ReactNode }) {
  return <>{parts}</>
}

/** "all ideas", with nothing chosen: a way into adding the first detail. */
function AllRows({
  open,
  onClick,
  children,
}: {
  open: boolean
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/cl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Chosen open={open}>{children}</Chosen>
    </button>
  )
}

/**
 * The chosen words of a clause: underlined, dotted at rest, solid on hover,
 * in the accent while their panel is open.
 */
function Chosen({ open, children }: { open: boolean; children?: ReactNode }) {
  return (
    <span
      className={cn(
        'font-medium text-foreground underline decoration-[1.5px] underline-offset-[5px]',
        open
          ? 'decoration-accent decoration-solid'
          : 'decoration-quaternary-foreground decoration-dotted group-hover/cl:decoration-foreground group-hover/cl:decoration-solid',
      )}
    >
      {children}
    </span>
  )
}

/** One clause: its words open its panel, its × (on hover) removes it. */
function ClauseButton({
  id,
  clause,
  plain,
  open,
  onOpen,
  onRemove,
}: {
  id: string
  clause: Clause
  plain: string
  open: boolean
  onOpen: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  return (
    <span data-clause={id} className="group/cl">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-label={t('sentence.change', { clause: plain })}
        className={cn(
          '-mx-0.5 cursor-pointer rounded-xs px-0.5 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-accent',
          open && 'bg-secondary',
        )}
      >
        <ClauseWords clause={clause} open={open} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('sentence.remove', { clause: plain })}
        // Zero-wide until hovered, and still reachable by keyboard.
        className="inline-flex w-0 cursor-pointer items-center justify-center overflow-hidden align-middle text-tertiary-foreground outline-none group-hover/cl:w-4 hover:text-foreground focus-visible:w-4 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <XIcon weight="bold" className="size-3" />
      </button>
    </span>
  )
}

/** A clause's catalogue sentence, its chosen words marked. */
function ClauseWords({
  clause,
  open,
  bold,
}: {
  clause: Clause
  open?: boolean
  /** In a list row: the chosen words in full ink, no underline. */
  bold?: boolean
}) {
  return (
    <Trans
      // One key of the list's clause family; the union is wider than
      // `Trans` resolves.
      i18nKey={clause.key as 'ideas.sentence.clause.origin'}
      values={clause.values}
      components={{
        v: bold ? (
          <b className="font-medium text-foreground" />
        ) : (
          <Chosen open={!!open} />
        ),
      }}
    />
  )
}

/**
 * `+ add a detail`, and what it offers: the sentence starters, or — once
 * something is typed — each search the list has ("mentioning …", "with … in
 * the title") with how many rows it would leave, and any value whose name
 * the words match.
 */
function AddDetail<F, Field extends string>({
  inputRef,
  panelRef,
  adding,
  onStart,
  onStop,
  filter,
  onChange,
  model,
  vocab,
  countQuery,
  onRemoveLast,
  onStarter,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  panelRef: React.RefObject<HTMLDivElement | null>
  adding: boolean
  onStart: () => void
  onStop: () => void
  filter: F
  onChange: (next: F) => void
  model: FilterModel<F, Field>
  vocab: SentenceVocabulary<Field>
  countQuery: CountQuery<F>
  onRemoveLast: () => void
  onStarter: (field: Field) => void
}) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const typed = text.trim()
  const q = typed.toLocaleLowerCase()

  /** The filter a typed search would make. */
  const searched = (field: Field, words: string): F | null => {
    if (model.kindOf(field) === 'search') {
      if (words.length < model.searchMin || words.length > model.textMax)
        return null
      return model.withToken(filter, { field, negated: false, values: [words] })
    }
    const values = splitText(words)
    if (!values.length) return null
    const kept = valuesOf(model, filter, field, false)
    return model.withToken(filter, {
      field,
      negated: false,
      values: [...new Set([...kept, ...values])],
    })
  }

  const debounced = useDebouncedValue(typed, 250)
  const counts = useQueries({
    queries: model.freeText.map((field) => {
      const next = adding ? searched(field, debounced) : null
      return {
        ...(next
          ? countQuery(next)
          : {
              queryKey: ['filter-sentence', 'idle', field],
              queryFn: async () => 0,
            }),
        enabled: !!next,
        staleTime: 30_000,
      }
    }),
  })
  const countFor = (field: Field) =>
    debounced === typed
      ? (counts[model.freeText.indexOf(field)]?.data ?? null)
      : null

  const sections = useMemo(() => {
    const out: { heading: string; items: AddItem<Field>[] }[] = []
    if (q) {
      const searches: AddItem<Field>[] = model.freeText
        .filter((field) => vocab.fields.includes(field))
        .filter(
          (field) =>
            model.kindOf(field) !== 'search' || typed.length >= model.searchMin,
        )
        .map((field) => ({ kind: 'text', field }))
      if (searches.length)
        out.push({ heading: t('sentence.heading.search'), items: searches })
      const quick: AddItem<Field>[] = []
      for (const field of vocab.fields) {
        if (model.kindOf(field) !== 'choice') continue
        for (const option of vocab.options(field, false)) {
          if (option.value === NONE || option.disabled) continue
          if (option.label.toLocaleLowerCase().includes(q))
            quick.push({ kind: 'quick', field, option })
        }
      }
      if (quick.length)
        out.push({
          heading: t('sentence.heading.narrow'),
          items: quick.slice(0, 6),
        })
    }
    const starters: AddItem<Field>[] = vocab.fields
      .filter((field) => model.kindOf(field) !== 'search')
      .filter(
        (field) => !q || vocab.starter(field).toLocaleLowerCase().includes(q),
      )
      .map((field) => ({ kind: 'starter', field }))
    if (starters.length)
      out.push({ heading: t('sentence.heading.add'), items: starters })
    return out
  }, [q, typed.length, model, vocab, t])
  const items = sections.flatMap((s) => s.items)
  const current = Math.min(active, Math.max(0, items.length - 1))

  const stop = () => {
    setText('')
    setActive(0)
    onStop()
  }

  const pick = (item: AddItem<Field> | undefined) => {
    if (!item) return
    switch (item.kind) {
      case 'text': {
        const next = searched(item.field, typed.slice(0, model.textMax))
        if (!next) return
        onChange(next)
        stop()
        return
      }
      case 'quick': {
        const values = valuesOf(model, filter, item.field, false)
        onChange(
          model.withToken(filter, {
            field: item.field,
            negated: false,
            values: values.includes(item.option.value)
              ? values
              : [...values, item.option.value],
          }),
        )
        stop()
        return
      }
      case 'starter':
        setText('')
        setActive(0)
        onStarter(item.field)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(Math.min(current + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pick(items[current])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      stop()
    } else if (event.key === 'Backspace' && text === '') {
      event.preventDefault()
      onRemoveLast()
    }
  }

  if (!adding)
    return (
      <button
        type="button"
        data-add
        onClick={onStart}
        className="ml-1 inline-flex cursor-pointer items-baseline gap-0.5 font-medium whitespace-nowrap text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
      >
        <PlusIcon weight="bold" className="size-3 self-center" aria-hidden />
        {t('sentence.addDetail')}
      </button>
    )

  let index = -1
  return (
    <>
      <span
        data-add
        className="ml-1 inline-flex items-baseline gap-0.5 rounded-xs bg-secondary px-1.5 font-medium text-accent"
      >
        <PlusIcon weight="bold" className="size-3 self-center" aria-hidden />
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          onBlur={stop}
          placeholder={t('sentence.addPlaceholder')}
          aria-label={t('sentence.addDetail')}
          role="combobox"
          aria-expanded
          aria-controls="filter-sentence-add"
          aria-activedescendant={
            items[current] ? `filter-sentence-add-${current}` : undefined
          }
          autoComplete="off"
          maxLength={model.textMax}
          size={Math.max(8, text.length + 1)}
          className="border-b-[1.5px] border-accent bg-transparent px-0.5 text-foreground outline-none placeholder:font-normal placeholder:text-tertiary-foreground"
        />
      </span>
      <div
        ref={panelRef}
        className="absolute flex w-[380px] flex-col bg-popover text-sm/5 text-popover-foreground shadow-lg ring-1 ring-quaternary"
        style={{ zIndex: ZIndex.popover }}
        // Taking the press would blur the field and close the list first.
        onMouseDown={(event) => event.preventDefault()}
      >
        <div
          id="filter-sentence-add"
          role="listbox"
          className="max-h-96 overflow-y-auto py-1"
        >
          {sections.map((section) => (
            <div
              key={section.heading}
              role="group"
              aria-label={section.heading}
            >
              <div className="px-3.5 pt-2.5 pb-1 text-[11px] tracking-wide text-tertiary-foreground uppercase">
                {section.heading}
              </div>
              {section.items.map((item) => {
                index += 1
                const i = index
                return (
                  <div
                    key={addKey(item)}
                    id={`filter-sentence-add-${i}`}
                    role="option"
                    aria-selected={i === current}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(item)}
                    className={cn(
                      'flex h-9 cursor-pointer items-center gap-2.5 px-3.5 text-secondary-foreground select-none',
                      i === current && 'bg-input-secondary',
                    )}
                  >
                    <AddRow
                      item={item}
                      typed={typed}
                      vocab={vocab}
                      count={item.kind === 'text' ? countFor(item.field) : null}
                      locale={i18n.language}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div
          aria-hidden
          className="flex items-center gap-3 border-t border-quaternary px-3.5 py-1.5 text-[11px] text-tertiary-foreground"
        >
          {(
            [
              ['↑↓', t('content.filter.keys.move')],
              ['↵', t('content.filter.keys.pick')],
              ['⌫', t('sentence.removeLast')],
              [t('content.filter.keys.escape'), t('content.filter.keys.close')],
            ] as const
          ).map(([key, label]) => (
            <span key={label} className="flex items-center gap-1">
              <kbd className="border border-quaternary px-1 leading-4">
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

function addKey<Field extends string>(item: AddItem<Field>): string {
  switch (item.kind) {
    case 'text':
      return `text:${item.field}`
    case 'quick':
      return `quick:${item.field}:${item.option.value}`
    case 'starter':
      return `starter:${item.field}`
  }
}

function AddRow<Field extends string>({
  item,
  typed,
  vocab,
  count,
  locale,
}: {
  item: AddItem<Field>
  typed: string
  vocab: SentenceVocabulary<Field>
  count: number | null
  locale: string
}) {
  switch (item.kind) {
    case 'text':
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            <ClauseWords
              clause={vocab.clause({
                field: item.field,
                negated: false,
                values: [typed],
              })}
              bold
            />
          </span>
          {count !== null && (
            <span className="text-xs text-tertiary-foreground tabular-nums">
              {vocab.matches(count)}
            </span>
          )}
        </>
      )
    case 'quick':
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            <ClauseWords
              clause={vocab.clause({
                field: item.field,
                negated: false,
                values: [item.option.value],
              })}
              bold
            />
          </span>
          {item.option.count !== null && (
            <span className="text-xs text-tertiary-foreground tabular-nums">
              {formatNumber(item.option.count, {}, locale)}
            </span>
          )}
        </>
      )
    case 'starter': {
      const hint = vocab.starterHint(item.field)
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            {vocab.starter(item.field)}
          </span>
          {hint && (
            <span className="text-xs text-tertiary-foreground">{hint}</span>
          )}
        </>
      )
    }
  }
}

/**
 * A clause's panel: the question in words, the two-word switch, the values
 * with their counts — several at once, none dimmed — and Remove this detail /
 * Done. A tick changes the filter at once.
 */
function ClausePanel<F, Field extends string>({
  panelRef,
  field,
  negated,
  filter,
  onChange,
  model,
  vocab,
  onNegate,
  onClose,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>
  field: Field
  negated: boolean
  filter: F
  onChange: (next: F) => void
  model: FilterModel<F, Field>
  vocab: SentenceVocabulary<Field>
  onNegate: (negated: boolean) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [find, setFind] = useState('')
  const values = valuesOf(model, filter, field, negated)
  const token: SmartToken<Field> | null = values.length
    ? { field, negated, values }
    : null
  const kind = model.kindOf(field)
  const labels = vocab.switchLabels(field)

  const set = (next: string[]) =>
    onChange(
      next.length
        ? model.withToken(filter, { field, negated, values: next })
        : token
          ? model.withoutToken(filter, token)
          : filter,
    )

  const negate = (next: boolean) => {
    if (next === negated) return
    let f = token ? model.withoutToken(filter, token) : filter
    // A date range and a day before are different shapes; the rest carry over.
    if (token && kind !== 'date')
      f = model.withToken(f, { field, negated: next, values })
    onChange(f)
    onNegate(next)
  }

  const remove = () => {
    if (token) onChange(model.withoutToken(filter, token))
    onClose()
  }

  const question = vocab.question(field)
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={question}
      className="absolute flex flex-col bg-popover text-sm/5 text-popover-foreground shadow-lg ring-1 ring-quaternary"
      style={{ zIndex: ZIndex.popover, width: PANEL_WIDTH }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
    >
      <p className="px-3.5 pt-3 pb-2 text-xs text-tertiary-foreground">
        {question}
      </p>

      {labels && (
        <div
          role="radiogroup"
          aria-label={question}
          className="mx-3.5 mb-2 flex border border-quaternary"
        >
          {[false, true].map((n) => (
            <button
              key={String(n)}
              type="button"
              role="radio"
              aria-checked={n === negated}
              onClick={() => negate(n)}
              className={cn(
                'flex-1 cursor-pointer py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent',
                n === negated
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-secondary-foreground hover:text-foreground',
              )}
            >
              {n ? labels[1] : labels[0]}
            </button>
          ))}
        </div>
      )}

      {kind === 'search' || kind === 'substrings' ? (
        <TextStep
          initial={kind === 'search' ? (values[0] ?? '') : values.join(', ')}
          min={kind === 'search' ? model.searchMin : 1}
          max={model.textMax}
          placeholder={vocab.textPlaceholder(field)}
          onApply={(text) => {
            set(kind === 'search' ? [text] : splitText(text))
            onClose()
          }}
        />
      ) : kind === 'date' ? (
        <DateStep
          options={vocab.options(field, negated)}
          negated={negated}
          values={values}
          onPick={(next) => {
            set(next)
            onClose()
          }}
          locale={i18n.language}
        />
      ) : (
        <ChoiceStep
          options={vocab.options(field, negated)}
          findLabel={vocab.findLabel(field)}
          picked={values}
          find={find}
          onFind={setFind}
          onToggle={(value) =>
            set(
              values.includes(value)
                ? values.filter((v) => v !== value)
                : [...values, value],
            )
          }
          locale={i18n.language}
        />
      )}

      <div className="flex items-center justify-between border-t border-quaternary px-3.5 py-2 text-[13px]">
        {token ? (
          <button
            type="button"
            onClick={remove}
            className="cursor-pointer text-secondary-foreground outline-none hover:text-foreground focus-visible:underline"
          >
            {t('sentence.removeDetail')}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer font-medium text-foreground outline-none focus-visible:underline"
        >
          {t('sentence.done')}
        </button>
      </div>
    </div>
  )
}

function ChoiceStep({
  options,
  findLabel,
  picked,
  find,
  onFind,
  onToggle,
  locale,
}: {
  options: ValueOption[]
  findLabel: string | null
  picked: string[]
  find: string
  onFind: (find: string) => void
  onToggle: (value: string) => void
  locale: string
}) {
  const { t } = useTranslation()
  const findable = !!findLabel && options.length >= FIND_FROM
  const q = find.trim().toLocaleLowerCase()
  const shown = q
    ? options.filter((o) => o.label.toLocaleLowerCase().includes(q))
    : options
  return (
    <>
      {findable && (
        <input
          value={find}
          onChange={(event) => onFind(event.target.value)}
          placeholder={findLabel}
          aria-label={findLabel}
          autoFocus
          className="mx-3.5 mb-1.5 h-[34px] border-b border-quaternary bg-input-secondary px-2.5 text-[13px] outline-none focus:border-foreground"
        />
      )}
      <div className="max-h-72 overflow-y-auto pb-1">
        {shown.length === 0 ? (
          <p className="px-3.5 py-2 text-[13px] text-tertiary-foreground">
            {options.length
              ? t('content.filter.nothingMatches')
              : t('sentence.noValues')}
          </p>
        ) : (
          shown.map((option, i) => {
            const ticked = picked.includes(option.value)
            const dim = (option.count === 0 || !!option.disabled) && !ticked
            const ruled = option.pinned && !shown[i - 1]?.pinned && i > 0
            return (
              <button
                key={option.value}
                type="button"
                role="checkbox"
                aria-checked={ticked}
                disabled={option.disabled}
                onClick={() => onToggle(option.value)}
                // The first value takes focus when there is no find field.
                autoFocus={!findable && i === 0}
                className={cn(
                  'flex h-9 w-full cursor-pointer items-center gap-2.5 px-3.5 text-left outline-none hover:bg-input-secondary focus-visible:bg-input-secondary disabled:cursor-default',
                  ruled && 'mt-1 border-t border-quaternary',
                )}
              >
                {/* Drawn, not a control: the row is the checkbox. */}
                <span
                  aria-hidden
                  className={cn(
                    'flex size-3 shrink-0 items-center justify-center border-[1.5px]',
                    ticked
                      ? 'border-foreground bg-foreground text-primary'
                      : 'border-tertiary-foreground',
                  )}
                >
                  {ticked && <CheckIcon weight="bold" className="size-2.5" />}
                </span>
                {option.icon && (
                  <HugeiconsIcon
                    icon={option.icon}
                    size={16}
                    strokeWidth={1.6}
                    aria-hidden
                    className={cn(
                      'shrink-0',
                      option.tone === 'accent' && 'text-accent',
                      option.tone === 'positive' && 'text-positive',
                      (!option.tone || option.tone === 'muted') &&
                        'text-secondary-foreground',
                      option.tone?.startsWith('text-') && option.tone,
                    )}
                  />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    dim && 'text-tertiary-foreground',
                  )}
                >
                  {option.label}
                </span>
                {option.count !== null && (
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      dim
                        ? 'text-quaternary-foreground'
                        : 'text-tertiary-foreground',
                    )}
                  >
                    {formatNumber(option.count, {}, locale)}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

/**
 * A date: the presets, or a range — a single day when it is "before". A
 * field that offers no presets for an operator opens on the days.
 */
function DateStep({
  options,
  negated,
  values,
  onPick,
  locale,
}: {
  options: ValueOption[]
  negated: boolean
  values: string[]
  onPick: (values: string[]) => void
  locale: string
}) {
  const { t } = useTranslation()
  const ranged = values.length === 2 || (negated && values.length === 1)
  // A custom day, never a preset: `7d` starts with a digit too.
  const [custom, setCustom] = useState(
    options.length === 0 ||
      (ranged && /^\d{4}-\d{2}-\d{2}$/.test(values[0] ?? '')),
  )
  const [range, setRange] = useState({
    from: ranged ? values[0] : '',
    to: values.length === 2 ? previousDay(values[1]) : '',
  })
  const ready = negated
    ? !!range.from
    : !!range.from && !!range.to && range.from <= range.to
  const input =
    'h-8 w-full border-b-2 border-quaternary bg-input-secondary px-2 text-sm outline-none focus:border-foreground'

  if (custom)
    return (
      <form
        className="flex flex-col gap-3 px-3.5 pb-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (!ready) return
          onPick(negated ? [range.from] : [range.from, nextDay(range.to)])
        }}
      >
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-tertiary-foreground">
            {negated
              ? t('content.filter.updated.on')
              : t('content.filter.updated.from')}
            <input
              type="date"
              autoFocus
              className={input}
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
          </label>
          {!negated && (
            <label className="flex flex-1 flex-col gap-1 text-xs text-tertiary-foreground">
              {t('content.filter.updated.to')}
              <input
                type="date"
                className={input}
                value={range.to}
                min={range.from || undefined}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </label>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          variant="defaultInverted"
          disabled={!ready}
        >
          {t('content.filter.updated.apply')}
        </Button>
      </form>
    )

  return (
    <div role="radiogroup" className="pb-1">
      {options.map((option, i) => {
        const chosen = values.length === 1 && values[0] === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            autoFocus={i === 0}
            onClick={() => onPick([option.value])}
            className={cn(
              'flex h-9 w-full cursor-pointer items-center gap-2.5 px-3.5 text-left outline-none hover:bg-input-secondary focus-visible:bg-input-secondary',
              chosen && 'font-medium text-foreground',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.count !== null && (
              <span className="text-xs text-tertiary-foreground tabular-nums">
                {formatNumber(option.count, {}, locale)}
              </span>
            )}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => setCustom(true)}
        className="mt-1 flex h-9 w-full cursor-pointer items-center border-t border-quaternary px-3.5 text-left outline-none hover:bg-input-secondary focus-visible:bg-input-secondary"
      >
        {negated
          ? t('content.filter.updated.date')
          : t('content.filter.updated.custom')}
      </button>
    </div>
  )
}

/** Text: the words to look for, kept on Return. */
function TextStep({
  initial,
  min,
  max,
  placeholder,
  onApply,
}: {
  initial: string
  min: number
  max: number
  placeholder: string
  onApply: (text: string) => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(initial)
  const trimmed = text.trim()
  const ready = trimmed.length >= min
  return (
    <form
      className="flex flex-col gap-1.5 px-3.5 pb-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onApply(trimmed.slice(0, max))
      }}
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={max}
        autoFocus
        className="h-[34px] border-b border-quaternary bg-input-secondary px-2.5 text-[13px] outline-none focus:border-foreground"
      />
      {!ready && trimmed.length > 0 && (
        <p className="text-xs text-tertiary-foreground">
          {t('content.filter.textTooShort', { count: min })}
        </p>
      )}
    </form>
  )
}
