import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckIcon, PlusIcon } from '@phosphor-icons/react'
import { useQueries } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ZIndex } from '@/config/zIndex'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib'
import { nextDay, previousDay } from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import type {
  Clause,
  CountQuery,
  FilterModel,
  SentenceVocabulary,
  SmartToken,
  ValueOption,
} from '@/lib/smartFilter'
import { SmallHeading } from '@/components/page-primitives/SmallHeading'

/**
 * The parts of a list's filter that `FilterPills` is built from: a pill's
 * words (`ClauseWords`), `+ Add` and what it offers (`AddDetail`), and a
 * clause's panel (`ClausePanel`) — the question, the two-word switch, the
 * values with the server's counts. Nothing here filters anything: the filter
 * is the URL, and every number is the server's answer to it.
 */

/** The value every list uses for "none" — no campaign, no tags, no document. */
const NONE = 'none'

/** A long list offers a find field from this many values. */
const FIND_FROM = 8

/** How wide the panels are, to keep them inside the line. */
const PANEL_WIDTH = 340

type AddItem<Field> =
  | { kind: 'text'; field: Field }
  | { kind: 'quick'; field: Field; option: ValueOption }
  | { kind: 'starter'; field: Field }

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

/** A clause's catalogue sentence, its chosen words in full ink. */
export function ClauseWords({ clause }: { clause: Clause }) {
  return (
    <Trans
      // One key of the list's clause family; the union is wider than
      // `Trans` resolves.
      i18nKey={clause.key as 'ideas.sentence.clause.origin'}
      values={clause.values}
      count={clause.count}
      components={{ v: <b className="font-medium text-foreground" /> }}
    />
  )
}

/**
 * `+ add a detail`, and what it offers: the sentence starters, or — once
 * something is typed — each search the list has ("mentioning …", "with … in
 * the title") with how many rows it would leave, and any value whose name
 * the words match.
 */
export function AddDetail<F, Field extends string>({
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
      .filter((field) => {
        const kind = model.kindOf(field)
        return kind !== 'search' && kind !== 'fixed'
      })
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
        className="flex h-6 cursor-pointer items-center gap-1 px-1 whitespace-nowrap text-secondary-foreground outline-none hover:text-foreground focus-visible:underline"
      >
        <PlusIcon className="size-3 self-center" aria-hidden />
        {t('sentence.add')}
      </button>
    )

  let index = -1
  return (
    <>
      <span
        data-add
        className="inline-flex h-6 items-center gap-0.5 rounded-xs bg-secondary px-1.5 font-medium text-accent"
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
              <SmallHeading as="div" className="px-3.5 pt-2.5 pb-1">
                {section.heading}
              </SmallHeading>
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
export function ClausePanel<F, Field extends string>({
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
