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
import { useQuery } from '@tanstack/react-query'
import type { CountQuery } from '@/components/smartFilter/SmartFilterBar'
import { Button } from '@/components/ui/button'
import { ZIndex } from '@/config/zIndex'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib'
import { nextDay, previousDay } from '@/lib/assetFilter'
import {
  IDEA_FILTER_MODEL,
  NONE,
  type IdeaFilter,
  type IdeaFilterField,
  type IdeaToken,
} from '@/lib/ideaFilter'
import { formatListParts, formatNumber } from '@/lib/intl'
import { tokenValuesOf, type ValueOption } from '@/lib/smartFilter'
import type { Clause, IdeaVocabulary } from './useIdeaVocabulary'

const model = IDEA_FILTER_MODEL

/** The order the clauses read in, however the filter was built. */
const SENTENCE_ORDER: readonly IdeaFilterField[] = [
  'origin',
  'source_asset',
  'campaign_id',
  'kind',
  'fit',
  'phase',
  'author',
  'created',
  'text',
]

/** The fields whose panel offers a find field, once the list is long. */
const FINDABLE = ['source_asset', 'campaign_id', 'kind', 'author', 'phase']
const FIND_FROM = 8

/** How wide the panels are, to keep them inside the line. */
const PANEL_WIDTH = 340

type Opened = { field: IdeaFilterField; negated: boolean }

type AddItem =
  | { kind: 'text' }
  | { kind: 'quick'; field: IdeaFilterField; option: ValueOption }
  | { kind: 'starter'; field: IdeaFilterField }

/**
 * The Ideas filter as a sentence you edit (CON-391) — "Showing ideas *from
 * documents*, in *Hotel de Russie*, with a *high or medium* fit" — in place
 * of the token bar, which read like a query being built.
 *
 * The same filter underneath: the same fields and operators
 * (`IDEA_FILTER_MODEL`), the same address, the same counts. Only how it reads
 * and how it is changed are new. Each token is one **clause**, in a fixed
 * order so the sentence reads right however it was built, worded by one
 * catalogue sentence per field and operator (`vocabulary.clause`). A clause's
 * chosen words open its panel — the question, in / not in, the values with
 * the server's counts — and its × removes it. `+ add a detail` is the one way
 * in: sentence starters, or typed words, which become "mentioning …" or a
 * matching name. `/` focuses it from anywhere on the page.
 *
 * Changing a value changes the filter at once, as the bar did; Done only
 * closes the panel. Nothing here filters anything — the filter is the URL,
 * and every number is the server's answer to it.
 */
export function IdeaSentence({
  filter,
  onChange,
  vocabulary: vocab,
  total,
  totalUnfiltered,
  countQuery,
  leading,
  trailing,
  clearable,
}: {
  filter: IdeaFilter
  onChange: (next: IdeaFilter) => void
  vocabulary: IdeaVocabulary
  total: number
  totalUnfiltered: number
  countQuery: CountQuery<IdeaFilter>
  /** The Views dropdown, at the line's start. */
  leading?: ReactNode
  /** At the line's end: Save as group, or an edited group's actions. */
  trailing?: ReactNode
  /** Whether Clear is offered — not while a smart group is open as saved. */
  clearable: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const boxRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const [opened, setOpened] = useState<Opened | null>(null)
  const [adding, setAdding] = useState(false)

  const tokens = useMemo(
    () =>
      model
        .tokensOf(filter)
        .filter((token) => vocab.fields.includes(token.field))
        .sort(
          (a, b) =>
            SENTENCE_ORDER.indexOf(a.field) - SENTENCE_ORDER.indexOf(b.field) ||
            Number(a.negated) - Number(b.negated),
        ),
    [filter, vocab.fields],
  )
  const narrowed = tokens.length > 0

  const startAdding = () => {
    setOpened(null)
    setAdding(true)
    requestAnimationFrame(() => addRef.current?.focus())
  }

  // `/` starts a detail from anywhere on the page, unless something else is
  // being typed into — the bar's key, kept.
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

  const removeToken = (token: IdeaToken) => {
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
        aria-label={t('ideas.sentence.label')}
        // The first line sits level with the button's label: the button is
        // 34px, a line 30px (CON-391 — top-aligned, never centred).
        className={cn(
          'relative min-w-0 flex-1 pt-0.5 text-[15px]/[30px] text-secondary-foreground',
          !leading && 'pl-5',
        )}
      >
        {narrowed ? (
          <Trans
            i18nKey="ideas.sentence.showing"
            components={{ clauses: <Joined parts={joined} /> }}
          />
        ) : (
          <Trans
            i18nKey="ideas.sentence.showingAll"
            components={{
              v: <AllIdeas open={adding} onClick={startAdding} />,
            }}
          />
        )}{' '}
        <AddDetail
          inputRef={addRef}
          adding={adding}
          onStart={startAdding}
          onStop={() => setAdding(false)}
          filter={filter}
          onChange={onChange}
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
          panelRef={panelRef}
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
              {t('ideas.sentence.clear')}
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
function AllIdeas({
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
        aria-label={t('ideas.sentence.change', { clause: plain })}
        className={cn(
          '-mx-0.5 cursor-pointer rounded-xs px-0.5 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-accent',
          open && 'bg-secondary',
        )}
      >
        <Trans
          // One key of the clause family; the union is wider than `Trans`
          // resolves.
          i18nKey={clause.key as 'ideas.sentence.clause.origin'}
          values={clause.values}
          components={{ v: <Chosen open={open} /> }}
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('ideas.sentence.remove', { clause: plain })}
        // Zero-wide until hovered, and still reachable by keyboard.
        className="inline-flex w-0 cursor-pointer items-center justify-center overflow-hidden align-middle text-tertiary-foreground outline-none group-hover/cl:w-4 hover:text-foreground focus-visible:w-4 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <XIcon weight="bold" className="size-3" />
      </button>
    </span>
  )
}

/**
 * `+ add a detail`, and what it offers: the sentence starters, or — once
 * something is typed — "mentioning …" with how many ideas do, and any value
 * whose name the words match.
 */
function AddDetail({
  inputRef,
  panelRef,
  adding,
  onStart,
  onStop,
  filter,
  onChange,
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
  filter: IdeaFilter
  onChange: (next: IdeaFilter) => void
  vocab: IdeaVocabulary
  countQuery: CountQuery<IdeaFilter>
  onRemoveLast: () => void
  onStarter: (field: IdeaFilterField) => void
}) {
  const { t, i18n } = useTranslation()
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const typed = text.trim()
  const q = typed.toLocaleLowerCase()

  const debounced = useDebouncedValue(typed, 250)
  const searchable =
    debounced.length >= model.searchMin && debounced.length <= model.textMax
  const counted = useQuery({
    ...(searchable
      ? countQuery(
          model.withToken(filter, {
            field: 'text',
            negated: false,
            values: [debounced],
          }),
        )
      : { queryKey: ['idea-sentence', 'idle'], queryFn: async () => 0 }),
    enabled: adding && searchable,
    staleTime: 30_000,
  })
  const textCount = debounced === typed ? (counted.data ?? null) : null

  const sections = useMemo(() => {
    const out: { heading: string; items: AddItem[] }[] = []
    if (q && typed.length >= model.searchMin)
      out.push({
        heading: t('ideas.sentence.heading.search'),
        items: [{ kind: 'text' }],
      })
    if (q) {
      const quick: AddItem[] = []
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
          heading: t('ideas.sentence.heading.narrow'),
          items: quick.slice(0, 6),
        })
    }
    const starters: AddItem[] = vocab.fields
      .filter((field) => field !== 'text')
      .filter(
        (field) =>
          !q ||
          t(`ideas.sentence.starter.${field as 'origin'}`)
            .toLocaleLowerCase()
            .includes(q),
      )
      .map((field) => ({ kind: 'starter', field }))
    if (starters.length)
      out.push({ heading: t('ideas.sentence.heading.add'), items: starters })
    return out
  }, [q, typed.length, vocab, t])
  const items = sections.flatMap((s) => s.items)
  const current = Math.min(active, Math.max(0, items.length - 1))

  const stop = () => {
    setText('')
    setActive(0)
    onStop()
  }

  const pick = (item: AddItem | undefined) => {
    if (!item) return
    switch (item.kind) {
      case 'text':
        if (typed.length < model.searchMin) return
        onChange(
          model.withToken(filter, {
            field: 'text',
            negated: false,
            values: [typed.slice(0, model.textMax)],
          }),
        )
        stop()
        return
      case 'quick': {
        const values = tokenValuesOf(model, filter, item.field, false)
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
        {t('ideas.sentence.addDetail')}
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
          placeholder={t('ideas.sentence.addPlaceholder')}
          aria-label={t('ideas.sentence.addDetail')}
          role="combobox"
          aria-expanded
          aria-controls="idea-sentence-add"
          aria-activedescendant={
            items[current] ? `idea-sentence-add-${current}` : undefined
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
          id="idea-sentence-add"
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
                    id={`idea-sentence-add-${i}`}
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
                      textCount={textCount}
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
              ['⌫', t('ideas.sentence.removeLast')],
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

function addKey(item: AddItem): string {
  switch (item.kind) {
    case 'text':
      return 'text'
    case 'quick':
      return `quick:${item.field}:${item.option.value}`
    case 'starter':
      return `starter:${item.field}`
  }
}

function AddRow({
  item,
  typed,
  vocab,
  textCount,
  locale,
}: {
  item: AddItem
  typed: string
  vocab: IdeaVocabulary
  textCount: number | null
  locale: string
}) {
  const { t } = useTranslation()
  const bold = <b className="font-medium text-foreground" />
  switch (item.kind) {
    case 'text':
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            <Trans
              i18nKey="ideas.sentence.clause.text"
              values={{ values: typed }}
              components={{ v: bold }}
            />
          </span>
          {textCount !== null && (
            <span className="text-xs text-tertiary-foreground tabular-nums">
              {t('ideas.sentence.ideas', {
                count: textCount,
                formatted: formatNumber(textCount, {}, locale),
              })}
            </span>
          )}
        </>
      )
    case 'quick': {
      const clause = vocab.clause({
        field: item.field,
        negated: false,
        values: [item.option.value],
      })
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            <Trans
              i18nKey={clause.key as 'ideas.sentence.clause.origin'}
              values={clause.values}
              components={{ v: bold }}
            />
          </span>
          {item.option.count !== null && (
            <span className="text-xs text-tertiary-foreground tabular-nums">
              {formatNumber(item.option.count, {}, locale)}
            </span>
          )}
        </>
      )
    }
    case 'starter': {
      const hint =
        item.field === 'kind' || item.field === 'created'
          ? t(`ideas.sentence.starterHint.${item.field}`)
          : null
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            {t(`ideas.sentence.starter.${item.field as 'origin'}`)}
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
 * A clause's panel: the question in words, in / not in as a two-word switch,
 * the values with their counts — several at once, none dimmed — and Remove
 * this detail / Done. A tick changes the filter at once.
 */
function ClausePanel({
  panelRef,
  field,
  negated,
  filter,
  onChange,
  vocab,
  onNegate,
  onClose,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>
  field: IdeaFilterField
  negated: boolean
  filter: IdeaFilter
  onChange: (next: IdeaFilter) => void
  vocab: IdeaVocabulary
  onNegate: (negated: boolean) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [find, setFind] = useState('')
  const values = tokenValuesOf(model, filter, field, negated)
  const token: IdeaToken | null = values.length
    ? { field, negated, values }
    : null
  const kind = model.kindOf(field)
  const switchable = field !== 'origin' && field !== 'text'

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

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t(`ideas.sentence.question.${field}`)}
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
        {t(`ideas.sentence.question.${field}`)}
      </p>

      {switchable && (
        <div
          role="radiogroup"
          aria-label={t(`ideas.sentence.question.${field}`)}
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
              {n
                ? t(`ideas.sentence.exclude.${field as 'kind'}`)
                : t(`ideas.sentence.include.${field as 'kind'}`)}
            </button>
          ))}
        </div>
      )}

      {kind === 'search' ? (
        <TextStep
          initial={values[0] ?? ''}
          onApply={(text) => {
            set([text])
            onClose()
          }}
        />
      ) : kind === 'date' ? (
        <DateStep
          field={field}
          negated={negated}
          values={values}
          vocab={vocab}
          onPick={(next) => {
            set(next)
            onClose()
          }}
          locale={i18n.language}
        />
      ) : (
        <ChoiceStep
          field={field}
          options={vocab.options(field, negated)}
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
            {t('ideas.sentence.removeDetail')}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer font-medium text-foreground outline-none focus-visible:underline"
        >
          {t('ideas.sentence.done')}
        </button>
      </div>
    </div>
  )
}

function ChoiceStep({
  field,
  options,
  picked,
  find,
  onFind,
  onToggle,
  locale,
}: {
  field: IdeaFilterField
  options: ValueOption[]
  picked: string[]
  find: string
  onFind: (find: string) => void
  onToggle: (value: string) => void
  locale: string
}) {
  const { t } = useTranslation()
  const findable = FINDABLE.includes(field) && options.length >= FIND_FROM
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
          placeholder={t(`ideas.sentence.find.${field as 'kind'}`)}
          aria-label={t(`ideas.sentence.find.${field as 'kind'}`)}
          autoFocus
          className="mx-3.5 mb-1.5 h-[34px] border-b border-quaternary bg-input-secondary px-2.5 text-[13px] outline-none focus:border-foreground"
        />
      )}
      <div className="max-h-72 overflow-y-auto pb-1">
        {shown.length === 0 ? (
          <p className="px-3.5 py-2 text-[13px] text-tertiary-foreground">
            {options.length
              ? t('content.filter.nothingMatches')
              : t('ideas.sentence.noValues')}
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
                      option.tone && option.tone.startsWith('text-')
                        ? option.tone
                        : 'text-secondary-foreground',
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

/** Added: the presets, or a range — a single day when it is "before". */
function DateStep({
  field,
  negated,
  values,
  vocab,
  onPick,
  locale,
}: {
  field: IdeaFilterField
  negated: boolean
  values: string[]
  vocab: IdeaVocabulary
  onPick: (values: string[]) => void
  locale: string
}) {
  const { t } = useTranslation()
  const ranged = values.length === 2 || (negated && values.length === 1)
  // A custom day, never a preset: `7d` starts with a digit too.
  const [custom, setCustom] = useState(
    ranged && /^\d{4}-\d{2}-\d{2}$/.test(values[0] ?? ''),
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

  const options = vocab.options(field, negated)
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

/** Text: the words to look for, kept on Return or Done. */
function TextStep({
  initial,
  onApply,
}: {
  initial: string
  onApply: (text: string) => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState(initial)
  const trimmed = text.trim()
  const ready = trimmed.length >= model.searchMin
  return (
    <form
      className="flex flex-col gap-1.5 px-3.5 pb-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onApply(trimmed.slice(0, model.textMax))
      }}
    >
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t('ideas.sentence.textPlaceholder')}
        aria-label={t('ideas.sentence.textPlaceholder')}
        maxLength={model.textMax}
        autoFocus
        className="h-[34px] border-b border-quaternary bg-input-secondary px-2.5 text-[13px] outline-none focus:border-foreground"
      />
      {!ready && trimmed.length > 0 && (
        <p className="text-xs text-tertiary-foreground">
          {t('content.filter.textTooShort', { count: model.searchMin })}
        </p>
      )}
    </form>
  )
}
