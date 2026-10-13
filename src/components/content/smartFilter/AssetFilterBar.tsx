import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { FunnelSimpleIcon, XIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ZIndex } from '@/config/zIndex'
import { useAssetCount } from '@/hooks/useContent'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib'
import {
  TEXT_MAX,
  TEXT_MIN,
  isChoiceField,
  nextDay,
  parseFieldPrefix,
  previousDay,
  tokenValues,
  tokensOf,
  withToken,
  withoutToken,
  type AssetFilter,
  type ChoiceField,
  type FilterField,
  type FilterToken,
} from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import type { AssetQueryParams } from '@/types/assetList'
import type { FilterVocabulary, ValueOption } from './useFilterVocabulary'

type Props = {
  filter: AssetFilter
  onChange: (next: AssetFilter) => void
  vocabulary: FilterVocabulary
  /** Assets matching every filter, and every asset in scope: "24 of 41". */
  total: number
  totalUnfiltered: number
  /** The request a filter would make — for the counts beside free text. */
  paramsFor: (filter: AssetFilter) => AssetQueryParams
}

/**
 * The token being built: a field, then an operator (`negated`), then values.
 * `picked` is the values ticked so far — the token's own when it is reopened,
 * so adding a second tag edits "Tag is Gartner" rather than making another.
 */
type Draft = {
  field: FilterField
  /** Null until the operator is chosen. */
  negated: boolean | null
  picked: string[]
  /** Reopened from a token: committing replaces it rather than adding to it. */
  editing: boolean
  /** Updated's date inputs are showing instead of the presets. */
  custom: boolean
}

type Item =
  | { kind: 'field'; field: FilterField }
  | { kind: 'operator'; negated: boolean }
  | { kind: 'value'; field: ChoiceField | 'updated'; option: ValueOption }
  | { kind: 'custom' }
  | { kind: 'text'; field: 'title' | 'text'; negated: boolean }
  | { kind: 'quick'; field: ChoiceField; option: ValueOption }

type Section = { heading: string; items: Item[] }

/**
 * The Assets list's smart filter (CON-371): choose a field, then an operator,
 * then a value, and the choice becomes a token that reads as a sentence —
 * `Type is PDF ×`. Harbor's `ActivityFilterBar`, carried over and taken further
 * in three ways the list needed.
 *
 * - **A token can hold several values.** "Tag is Gartner or Finance" is one
 *   token, because the endpoint reads values of one field as any-of and a
 *   second "Tag is" token could only ever mean the same thing.
 * - **Free text never dead-ends.** Typing without choosing a field offers a
 *   title search and a search inside the documents, then every value whose
 *   name the words match — so "finance" finds the tag and the campaign too,
 *   and picking one commits the whole token in one keystroke.
 * - **The old syntax still works.** `tag:` jumps to the Tag value step, so
 *   anyone who learned the box this replaced loses nothing; it is never the
 *   only way in.
 *
 * Nothing here filters anything. A token changes the filter, the filter is the
 * URL, and the URL is the request (`lib/assetFilter`); every number on the bar
 * is the server's answer to it.
 */
export function AssetFilterBar({
  filter,
  onChange,
  vocabulary: vocab,
  total,
  totalUnfiltered,
  paramsFor,
}: Props) {
  const { t, i18n } = useTranslation()
  const listId = useId()
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  /** A token Backspace has picked out: a second Backspace removes it. */
  const [selected, setSelected] = useState<number | null>(null)
  const [range, setRange] = useState({ from: '', to: '' })
  const [focused, setFocused] = useState(false)
  const [anchor, setAnchor] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const tokens = useMemo(() => tokensOf(filter), [filter])
  const stage: 'field' | 'operator' | 'value' = !draft
    ? 'field'
    : draft.negated === null
      ? 'operator'
      : 'value'
  const typed = text.trim()

  // `/` focuses the bar from anywhere on the page, unless something else is
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
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // The list opens under the caret, which moves as tokens are added — capped
  // so it never hangs off the bar's right edge.
  useLayoutEffect(() => {
    const bar = barRef.current
    const input = inputRef.current
    if (!bar || !input) return
    setAnchor(
      Math.max(0, Math.min(input.offsetLeft - 8, bar.clientWidth - 320)),
    )
  }, [tokens.length, draft, open])

  // Counts for the two searches free text offers, a beat after typing stops.
  const debounced = useDebouncedValue(typed, 250)
  const titleFilter = useMemo(() => {
    if (!debounced) return null
    const negated = draft?.field === 'title' ? !!draft.negated : false
    const values = splitTitle(debounced)
    return withToken(filter, {
      field: 'title',
      negated,
      values:
        draft?.editing || !values.length
          ? values
          : [...filter.title[negated ? 'not' : 'any'], ...values],
    })
  }, [debounced, filter, draft])
  const titleCount = useAssetCount(titleFilter ? paramsFor(titleFilter) : {}, {
    enabled:
      !!titleFilter && open && (stage === 'field' || draft?.field === 'title'),
  })
  const textSearchable =
    debounced.length >= TEXT_MIN && debounced.length <= TEXT_MAX
  const textCount = useAssetCount(
    textSearchable
      ? paramsFor(
          withToken(filter, {
            field: 'text',
            negated: false,
            values: [debounced],
          }),
        )
      : {},
    {
      enabled:
        textSearchable &&
        open &&
        (stage === 'field' || draft?.field === 'text'),
    },
  )
  // Only once the debounced text has caught up — a count for "fin" beside
  // "finance" answers a question nobody is asking any more.
  const settledText = debounced === typed
  const countFor = (field: 'title' | 'text') => {
    if (!settledText) return null
    const q = field === 'title' ? titleCount : textCount
    return q.data ?? null
  }

  const sections = useMemo<Section[]>(() => {
    const q = typed.toLocaleLowerCase()
    const matches = (label: string) => label.toLocaleLowerCase().includes(q)

    if (stage === 'field') {
      if (!q)
        return [
          {
            heading: t('content.filter.heading.fields'),
            items: vocab.fields.map((field) => ({ kind: 'field', field })),
          },
        ]
      const search: Item[] = [
        { kind: 'text', field: 'title', negated: false },
        ...(typed.length >= TEXT_MIN
          ? [{ kind: 'text', field: 'text', negated: false } as const]
          : []),
      ]
      const values: Item[] = []
      for (const field of vocab.fields) {
        if (!isChoiceField(field)) continue
        for (const option of vocab.options(field, false)) {
          if (option.value === 'none') continue
          if (matches(option.label))
            values.push({ kind: 'quick', field, option })
        }
      }
      const fields: Item[] = vocab.fields
        .filter((field) => matches(vocab.fieldLabel(field)))
        .map((field) => ({ kind: 'field', field }))
      return [
        { heading: t('content.filter.heading.search'), items: search },
        {
          heading: t('content.filter.heading.matching'),
          items: values.slice(0, 8),
        },
        { heading: t('content.filter.heading.fieldsMatching'), items: fields },
      ].filter((section) => section.items.length > 0)
    }

    if (!draft) return []
    const heading = t('content.filter.heading.step', {
      field: vocab.fieldLabel(draft.field),
      op:
        draft.negated === null
          ? ''
          : vocab.operatorLabel(draft.field, draft.negated),
    }).trim()

    if (stage === 'operator') {
      return [
        {
          heading: vocab.fieldLabel(draft.field),
          items: [false, true]
            .filter((negated) =>
              matches(vocab.operatorLabel(draft.field, negated)),
            )
            .map((negated) => ({ kind: 'operator', negated })),
        },
      ]
    }

    const negated = !!draft.negated
    if (draft.field === 'title' || draft.field === 'text') {
      return [
        {
          heading,
          items: q ? [{ kind: 'text', field: draft.field, negated }] : [],
        },
      ]
    }
    if (draft.field === 'updated') {
      if (draft.custom) return []
      return [
        {
          heading,
          items: [
            ...vocab
              .options('updated', negated)
              .filter((option) => matches(option.label))
              .map((option): Item => ({
                kind: 'value',
                field: 'updated',
                option,
              })),
            { kind: 'custom' },
          ],
        },
      ]
    }
    const field = draft.field
    return [
      {
        heading,
        items: vocab
          .options(field, negated)
          .filter((option) => matches(option.label))
          .map((option): Item => ({ kind: 'value', field, option })),
      },
    ]
  }, [stage, draft, typed, vocab, t])

  const items = useMemo(() => sections.flatMap((s) => s.items), [sections])

  // A shorter list must not leave the highlight past its end.
  useEffect(() => {
    if (active >= items.length) setActive(Math.max(0, items.length - 1))
  }, [items.length, active])

  // Keyboard travel brings the row with it, or the highlight walks off the
  // bottom of a long tag list and the list appears to stop responding.
  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-index="${active}"]`)
    row?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  // ---- Changing the filter

  const existing = (field: FilterField, negated: boolean) =>
    tokens.find((tok) => tok.field === field && tok.negated === negated)

  const commit = (field: FilterField, negated: boolean, values: string[]) => {
    const current = existing(field, negated)
    if (values.length) onChange(withToken(filter, { field, negated, values }))
    else if (current) onChange(withoutToken(filter, current))
    reset()
  }

  const reset = () => {
    setDraft(null)
    setText('')
    setActive(0)
    setRange({ from: '', to: '' })
    setOpen(true)
    inputRef.current?.focus()
  }

  const startField = (
    field: FilterField,
    negated: boolean | null = null,
    editing = false,
  ) => {
    const op = vocab.hasOperatorStep(field) ? negated : false
    setDraft({
      field,
      negated: op,
      picked: op === null ? [] : tokenValues(filter, field, op),
      editing,
      custom: false,
    })
    setText('')
    setActive(0)
    setOpen(true)
    setSelected(null)
    inputRef.current?.focus()
  }

  const editToken = (token: FilterToken) => {
    if (token.field === 'title' || token.field === 'text') {
      setDraft({
        field: token.field,
        negated: token.negated,
        picked: [],
        editing: true,
        custom: false,
      })
      setText(token.values.join(', '))
      setOpen(true)
      setSelected(null)
      inputRef.current?.focus()
      return
    }
    startField(token.field, token.negated, true)
    if (token.field === 'updated' && token.values.length === 2) {
      setDraft((d) => (d ? { ...d, custom: true } : d))
      setRange({
        from: token.values[0],
        to: previousDay(token.values[1]),
      })
    }
  }

  const removeToken = (token: FilterToken) => {
    onChange(withoutToken(filter, token))
    setSelected(null)
    inputRef.current?.focus()
  }

  const togglePicked = (value: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            picked: d.picked.includes(value)
              ? d.picked.filter((v) => v !== value)
              : [...d.picked, value],
          }
        : d,
    )

  const pick = (item: Item | undefined) => {
    if (!item) return
    switch (item.kind) {
      case 'field':
        startField(item.field)
        return
      case 'operator':
        if (!draft) return
        startField(draft.field, item.negated, draft.editing)
        return
      case 'value': {
        if (!draft) return
        const negated = !!draft.negated
        if (item.field === 'updated') {
          commit('updated', negated, [item.option.value])
          return
        }
        const values = draft.picked.includes(item.option.value)
          ? draft.picked
          : [...draft.picked, item.option.value]
        commit(item.field, negated, values)
        return
      }
      case 'custom':
        setDraft((d) => (d ? { ...d, custom: true } : d))
        return
      case 'quick': {
        const values = filter[item.field].any
        commit(
          item.field,
          false,
          values.includes(item.option.value)
            ? values
            : [...values, item.option.value],
        )
        return
      }
      case 'text': {
        if (item.field === 'text') {
          if (typed.length < TEXT_MIN) return
          commit('text', false, [typed.slice(0, TEXT_MAX)])
          return
        }
        const values = splitTitle(typed)
        const keep =
          draft?.field === 'title' && draft.editing
            ? []
            : filter.title[item.negated ? 'not' : 'any']
        commit('title', item.negated, dedupe([...keep, ...values]))
      }
    }
  }

  const applyRange = () => {
    if (!draft) return
    if (draft.negated) {
      if (range.from) commit('updated', true, [range.from])
      return
    }
    if (range.from && range.to && range.from <= range.to)
      commit('updated', false, [range.from, nextDay(range.to)])
  }

  const type = (next: string) => {
    setSelected(null)
    setOpen(true)
    setActive(0)
    if (!draft) {
      const prefix = parseFieldPrefix(next)
      if (prefix) {
        startField(prefix.field, prefix.negated)
        setText(prefix.rest)
        return
      }
    }
    setText(next)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (selected !== null && tokens[selected]) {
        editToken(tokens[selected])
        return
      }
      pick(items[active])
    } else if (
      event.key === ' ' &&
      text === '' &&
      draft &&
      stage === 'value' &&
      isChoiceField(draft.field)
    ) {
      // Space ticks without committing, so a set can be built from the
      // keyboard; Enter then commits it.
      event.preventDefault()
      const item = items[active]
      if (item?.kind === 'value') togglePicked(item.option.value)
    } else if (event.key === 'Escape') {
      if (selected !== null) setSelected(null)
      else if (draft) {
        setDraft(null)
        setText('')
      } else setOpen(false)
    } else if (event.key === 'Backspace' && text === '') {
      if (draft) {
        // value → operator → field
        event.preventDefault()
        if (draft.custom) setDraft({ ...draft, custom: false })
        else if (stage === 'value' && vocab.hasOperatorStep(draft.field))
          setDraft({ ...draft, negated: null, picked: [] })
        else setDraft(null)
        setActive(0)
        return
      }
      if (tokens.length === 0) return
      event.preventDefault()
      if (selected === null) setSelected(tokens.length - 1)
      else if (tokens[selected]) removeToken(tokens[selected])
    }
  }

  const clearAll = () => {
    onChange(tokens.reduce((f, tok) => withoutToken(f, tok), filter))
    setDraft(null)
    setText('')
    setSelected(null)
    inputRef.current?.focus()
  }

  const placeholder =
    stage === 'field'
      ? tokens.length
        ? t('content.filter.addFilter')
        : t('content.filter.placeholder')
      : stage === 'operator'
        ? t('content.filter.operatorPlaceholder')
        : draft?.field === 'title'
          ? t('content.filter.titlePlaceholder')
          : draft?.field === 'text'
            ? t('content.filter.textPlaceholder')
            : t('content.filter.valuePlaceholder')

  const showCustom = !!draft?.custom && stage === 'value'
  const showList =
    open && focused && (items.length > 0 || showCustom || !!draft)
  let index = -1

  return (
    <div
      className="relative w-full shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false)
          setOpen(false)
          setSelected(null)
        }
      }}
      onFocus={() => setFocused(true)}
    >
      {/* The whole strip is the field — clicking the gap between tokens puts
          the cursor where it would have gone anyway. */}
      <div
        ref={barRef}
        className="flex min-h-11 w-full flex-wrap items-center gap-1.5 border-b-2 border-quaternary bg-input-secondary px-3 py-1.5 transition-colors focus-within:border-foreground"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        <FunnelSimpleIcon
          className="size-4 shrink-0 text-tertiary-foreground"
          aria-hidden
        />

        {tokens.map((token, i) => (
          <TokenChip
            key={`${token.field}:${token.negated}`}
            token={token}
            vocab={vocab}
            selected={selected === i}
            onEdit={() => editToken(token)}
            onRemove={() => removeToken(token)}
          />
        ))}

        {draft && (
          <span className="shrink-0 text-[13px]/4 font-medium text-foreground">
            {draft.negated === null
              ? vocab.fieldLabel(draft.field)
              : t('content.filter.draft', {
                  field: vocab.fieldLabel(draft.field),
                  op: vocab.operatorLabel(draft.field, draft.negated),
                })}
          </span>
        )}

        <input
          ref={inputRef}
          value={text}
          onChange={(event) => type(event.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={t('content.filter.label')}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={
            showList && items[active] ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          maxLength={TEXT_MAX}
          className="h-7 min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-tertiary-foreground"
        />

        {selected !== null && (
          <span
            className="shrink-0 text-xs text-accent"
            role="status"
            aria-live="polite"
          >
            {t('content.filter.tokenSelected')}
          </span>
        )}

        {tokens.length > 0 ? (
          <span className="ml-auto flex shrink-0 items-center gap-3">
            <span className="text-xs tabular-nums text-secondary-foreground">
              {t('content.filter.count', {
                count: total,
                shown: formatNumber(total, {}, i18n.language),
                total: formatNumber(totalUnfiltered, {}, i18n.language),
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-secondary-foreground"
              onClick={clearAll}
            >
              {t('content.filter.clearAll')}
            </Button>
          </span>
        ) : (
          !focused && (
            <kbd className="pointer-events-none ml-auto shrink-0 border border-quaternary px-1.5 py-0.5 text-[11px] leading-none text-tertiary-foreground select-none">
              /
            </kbd>
          )
        )}
      </div>

      {showList && (
        <div
          ref={listRef}
          className="absolute top-full mt-1 flex max-h-96 w-80 flex-col overflow-hidden rounded-sm bg-popover text-popover-foreground shadow-lg"
          style={{ zIndex: ZIndex.popover, left: anchor }}
          // Taking the mousedown would blur the field and close the list
          // before the click landed — except on the date inputs, which need
          // their own focus.
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).tagName !== 'INPUT')
              event.preventDefault()
          }}
        >
          <div id={listId} role="listbox" className="overflow-y-auto p-1">
            {showCustom && draft ? (
              <CustomDates
                before={!!draft.negated}
                range={range}
                onChange={setRange}
                onApply={applyRange}
              />
            ) : items.length === 0 ? (
              <p className="px-2 py-2 text-sm text-tertiary-foreground">
                {draft?.field === 'text' || draft?.field === 'title'
                  ? draft.field === 'text' && typed.length > 0
                    ? t('content.filter.textTooShort', { count: TEXT_MIN })
                    : placeholder
                  : t('content.filter.nothingMatches')}
              </p>
            ) : (
              sections.map((section) => (
                <div
                  key={section.heading}
                  role="group"
                  aria-label={section.heading}
                >
                  <div className="px-2 pt-1.5 pb-1 text-[11px] tracking-wide text-tertiary-foreground uppercase">
                    {section.heading}
                  </div>
                  {section.items.map((item) => {
                    index += 1
                    const i = index
                    const prev = section.items[section.items.indexOf(item) - 1]
                    const ruled =
                      (item.kind === 'value' &&
                        item.option.pinned &&
                        !(prev?.kind === 'value' && prev.option.pinned)) ||
                      item.kind === 'custom'
                    return (
                      <Row
                        key={rowKey(item)}
                        id={`${listId}-${i}`}
                        index={i}
                        active={i === active}
                        ruled={ruled}
                        onHover={() => setActive(i)}
                        onPick={() => pick(item)}
                      >
                        <RowContent
                          item={item}
                          vocab={vocab}
                          draft={draft}
                          typed={typed}
                          count={
                            item.kind === 'text' ? countFor(item.field) : null
                          }
                          onToggle={togglePicked}
                        />
                      </Row>
                    )
                  })}
                </div>
              ))
            )}
          </div>
          <KeyHints />
        </div>
      )}
    </div>
  )
}

function rowKey(item: Item): string {
  switch (item.kind) {
    case 'field':
      return `field:${item.field}`
    case 'operator':
      return `op:${item.negated}`
    case 'value':
    case 'quick':
      return `${item.kind}:${item.field}:${item.option.value}`
    case 'custom':
      return 'custom'
    case 'text':
      return `text:${item.field}`
  }
}

function Row({
  id,
  index,
  active,
  ruled,
  onHover,
  onPick,
  children,
}: {
  id: string
  index: number
  active: boolean
  ruled: boolean
  onHover: () => void
  onPick: () => void
  children: ReactNode
}) {
  return (
    <div
      id={id}
      data-index={index}
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onPick}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none',
        active && 'bg-popover-hover',
        ruled && 'mt-1 border-t border-quaternary pt-2',
      )}
    >
      {children}
    </div>
  )
}

function RowContent({
  item,
  vocab,
  draft,
  typed,
  count,
  onToggle,
}: {
  item: Item
  vocab: FilterVocabulary
  draft: Draft | null
  typed: string
  count: number | null
  onToggle: (value: string) => void
}) {
  const { t, i18n } = useTranslation()
  switch (item.kind) {
    case 'field':
      return (
        <>
          <span className="flex-1">{vocab.fieldLabel(item.field)}</span>
          <span className="truncate text-xs text-tertiary-foreground">
            {vocab.fieldHint(item.field)}
          </span>
        </>
      )
    case 'operator':
      return (
        <span>{vocab.operatorLabel(draft?.field ?? 'kind', item.negated)}</span>
      )
    case 'custom':
      return (
        <span>
          {draft?.negated
            ? t('content.filter.updated.date')
            : t('content.filter.updated.custom')}
        </span>
      )
    case 'text':
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            <TokenSentence
              field={vocab.fieldLabel(item.field)}
              op={vocab.operatorLabel(item.field, item.negated)}
              values={t('content.filter.quoted', { text: typed })}
            />
          </span>
          <Count count={count} locale={i18n.language} />
        </>
      )
    case 'quick':
      return (
        <>
          <span className="min-w-0 flex-1 truncate">
            <TokenSentence
              field={vocab.fieldLabel(item.field)}
              op={vocab.operatorLabel(item.field, false)}
              values={item.option.label}
            />
          </span>
          <Count count={item.option.count} locale={i18n.language} />
        </>
      )
    case 'value': {
      const { option } = item
      const choice = item.field !== 'updated'
      const ticked = !!draft?.picked.includes(option.value)
      const dim = option.count === 0 && !ticked
      return (
        <>
          {choice && (
            <Checkbox
              checked={ticked}
              tabIndex={-1}
              aria-label={option.label}
              // The box ticks and leaves the list open; the row commits.
              onClick={(event) => event.stopPropagation()}
              onCheckedChange={() => onToggle(option.value)}
            />
          )}
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
          <Count count={option.count} locale={i18n.language} dim={dim} />
        </>
      )
    }
  }
}

function Count({
  count,
  locale,
  dim,
}: {
  count: number | null
  locale: string
  dim?: boolean
}) {
  if (count === null) return null
  return (
    <span
      className={cn(
        'shrink-0 text-xs tabular-nums',
        dim ? 'text-quaternary-foreground' : 'text-tertiary-foreground',
      )}
    >
      {formatNumber(count, {}, locale)}
    </span>
  )
}

/**
 * "Type is **PDF**": the field and operator quiet, the value in full ink —
 * what varies down a row of tokens is the value, so that is what reads first.
 * One catalogue sentence, so a language can put the parts in its own order.
 */
function TokenSentence({
  field,
  op,
  values,
}: {
  field: string
  op: string
  values: string
}) {
  return (
    <Trans
      i18nKey="content.filter.token"
      values={{ field, op, values }}
      components={{
        f: <span className="text-secondary-foreground" />,
        o: <span className="text-tertiary-foreground" />,
        v: <b className="font-medium text-foreground" />,
      }}
    />
  )
}

/**
 * One token in the bar. The words reopen its value step, so changing a token
 * is an edit rather than a delete and a rebuild; the ✕ removes it.
 */
function TokenChip({
  token,
  vocab,
  selected,
  onEdit,
  onRemove,
}: {
  token: FilterToken
  vocab: FilterVocabulary
  selected: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const sentence = vocab.tokenText(token)
  return (
    <span
      className={cn(
        'inline-flex h-7 max-w-full shrink-0 items-center border border-tertiary bg-secondary text-[13px]/4',
        selected && 'border-accent bg-accent/10',
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={t('content.filter.edit', { filter: sentence })}
        className="flex h-full min-w-0 items-center truncate pl-2 hover:bg-tertiary"
      >
        <TokenSentence
          field={vocab.fieldLabel(token.field)}
          op={vocab.operatorLabel(token.field, token.negated)}
          values={vocab.tokenValueText(token)}
        />
      </button>
      <button
        type="button"
        aria-label={t('content.filter.remove', { filter: sentence })}
        onClick={onRemove}
        className="flex h-full shrink-0 items-center px-1.5 text-tertiary-foreground hover:text-primary-foreground"
      >
        <XIcon weight="bold" className="size-3" />
      </button>
    </span>
  )
}

/** Updated's custom step: a range for "in", one day for "before". */
function CustomDates({
  before,
  range,
  onChange,
  onApply,
}: {
  before: boolean
  range: { from: string; to: string }
  onChange: (range: { from: string; to: string }) => void
  onApply: () => void
}) {
  const { t } = useTranslation()
  const ready = before
    ? !!range.from
    : !!range.from && !!range.to && range.from <= range.to
  const field =
    'h-8 w-full border-b-2 border-quaternary bg-input-secondary px-2 text-sm outline-none focus:border-foreground'
  return (
    <form
      className="flex flex-col gap-3 p-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready) onApply()
      }}
    >
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-tertiary-foreground">
          {before
            ? t('content.filter.updated.on')
            : t('content.filter.updated.from')}
          <input
            type="date"
            className={field}
            value={range.from}
            onChange={(e) => onChange({ ...range, from: e.target.value })}
          />
        </label>
        {!before && (
          <label className="flex flex-1 flex-col gap-1 text-xs text-tertiary-foreground">
            {t('content.filter.updated.to')}
            <input
              type="date"
              className={field}
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => onChange({ ...range, to: e.target.value })}
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
}

/** The keys that work here, at the foot of every step. */
function KeyHints() {
  const { t } = useTranslation()
  const hints: [string, string][] = [
    ['↑↓', t('content.filter.keys.move')],
    ['↵', t('content.filter.keys.pick')],
    [t('content.filter.keys.backspace'), t('content.filter.keys.back')],
    [t('content.filter.keys.escape'), t('content.filter.keys.close')],
  ]
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t border-quaternary px-2 py-1.5 text-[11px] text-tertiary-foreground"
      aria-hidden
    >
      {hints.map(([key, label]) => (
        <span key={label} className="flex items-center gap-1">
          <kbd className="border border-quaternary px-1 leading-4">{key}</kbd>
          {label}
        </span>
      ))}
    </div>
  )
}

/** Title takes several substrings, comma-separated — as the endpoint reads it. */
function splitTitle(text: string): string[] {
  return dedupe(
    text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
  )
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)]
}
