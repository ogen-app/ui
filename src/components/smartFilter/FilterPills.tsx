import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import { orderedTokens } from '@/lib/smartFilter'
import type {
  CountQuery,
  FilterModel,
  SentenceVocabulary,
  SmartToken,
} from '@/lib/smartFilter'
import { AddDetail, ClausePanel, ClauseWords } from './FilterParts'
import { TextButton } from '@/components/ui/text-button'
import { Button } from '@/components/ui/button'

type Opened<Field> = { field: Field; negated: boolean }

/**
 * A list's filter as pills (design/ideas-cards), the card lists' strip under
 * the tabs: shown only while there is a filter, a group open, or a detail
 * being added — `Filter` beside the tabs starts one (`adding`).
 *
 * Built from `FilterParts`: each pill is one token's catalogue clause ("in
 * **Hotel de Russie**"), opening the clause's own panel, its × removing it;
 * `+ Add` is the add field, with its starters, searches and counts.
 */
export function FilterPills<F, Field extends string>({
  filter,
  onChange,
  model,
  vocabulary: vocab,
  countQuery,
  adding,
  onAddingChange,
  leading,
  trailing,
  clearable,
  inline = false,
}: {
  filter: F
  onChange: (next: F) => void
  model: FilterModel<F, Field>
  vocabulary: SentenceVocabulary<Field>
  countQuery: CountQuery<F>
  /** Whether the add field is open — `Filter` beside the tabs opens it. */
  adding: boolean
  onAddingChange: (adding: boolean) => void
  /** The open smart group's name, leading the row. */
  leading?: ReactNode
  /** At the row's end: Save as view, or an edited view's actions. */
  trailing?: ReactNode
  /** Whether Clear is offered — not while a smart group is open. */
  clearable: boolean
  /**
   * Inside the list's head line, after Filter (which is how a detail is
   * started there): 14/20 like the line, no row of its own, and no `+ Add`
   * until a detail is being added.
   */
  inline?: boolean
}) {
  const { t, i18n } = useTranslation()
  const boxRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const [opened, setOpened] = useState<Opened<Field> | null>(null)

  const tokens = useMemo(
    () => orderedTokens(model, filter, vocab),
    [model, filter, vocab],
  )
  const narrowed = tokens.length > 0

  // Opened from outside (`Filter`), the field takes the focus once drawn.
  useEffect(() => {
    if (adding) requestAnimationFrame(() => addRef.current?.focus())
  }, [adding])

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
      onAddingChange(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onAddingChange])

  // A press outside the open panel closes it; a press on a pill or on Add is
  // that control's own click.
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

  // The panel opens under what it is about and never hangs off the row's
  // right edge — placed on the DOM.
  useLayoutEffect(() => {
    const box = boxRef.current
    const panel = panelRef.current
    if (!box || !panel) return
    const anchor =
      (opened &&
        box.querySelector<HTMLElement>(
          `[data-clause="${opened.field}:${opened.negated}"]`,
        )) ||
      box.querySelector<HTMLElement>('[data-add]') ||
      // Inline, a detail just begun has neither: under the row's start.
      box
    const outer = box.getBoundingClientRect()
    const rect = anchor.getBoundingClientRect()
    panel.style.left = `${Math.max(0, Math.min(rect.left - outer.left, outer.width - panel.offsetWidth))}px`
    panel.style.top = `${rect.bottom - outer.top + 6}px`
  })

  if (!narrowed && !adding && !opened && !leading) return null
  const pill = inline ? 'h-7' : 'h-6'

  const removeToken = (token: SmartToken<Field>) => {
    onChange(model.withoutToken(filter, token))
    if (opened?.field === token.field && opened.negated === token.negated)
      setOpened(null)
  }
  const clearAll = () => {
    onChange(tokens.reduce((f, token) => model.withoutToken(f, token), filter))
    setOpened(null)
  }

  return (
    <div
      ref={boxRef}
      role="group"
      aria-label={t('sentence.label')}
      className={cn(
        'relative flex flex-wrap items-center gap-2 text-secondary-foreground',
        inline ? 'min-w-0 flex-1 text-sm/5' : 'min-h-12 py-3 text-xs/4',
      )}
    >
      {leading}
      {tokens.map((token) => {
        const id = `${token.field}:${token.negated}`
        const plain = vocab.tokenText(token)
        const open =
          opened?.field === token.field && opened.negated === token.negated
        // A fixed set has nothing to change, only to drop (CON-510).
        const fixed = model.kindOf(token.field) === 'fixed'
        // A long choice reads as its first value and how many more — "that
        // are CSVs +9" — on a pill; its full words stay its accessible name
        // and its tooltip.
        const more =
          inline && model.kindOf(token.field) === 'choice'
            ? token.values.length - 1
            : 0
        const shown =
          more > 1 ? { ...token, values: token.values.slice(0, 1) } : token
        const words = (
          <>
            <ClauseWords clause={vocab.clause(shown)} />
            {more > 1 && (
              <span className="ml-1 font-medium text-foreground tabular-nums">
                {t('sentence.more', {
                  formatted: formatNumber(more, {}, i18n.language),
                })}
              </span>
            )}
          </>
        )
        return (
          <span
            key={id}
            data-clause={id}
            className={cn(
              'flex max-w-full items-center gap-1 rounded-button bg-secondary pr-1 pl-2',
              pill,
              inline && 'border border-border bg-primary',
              open && 'ring-1 ring-accent',
            )}
          >
            {fixed ? (
              <span className="truncate" title={more > 1 ? plain : undefined}>
                {words}
              </span>
            ) : (
              <button
                type="button"
                aria-expanded={open}
                aria-label={t('sentence.change', { clause: plain })}
                onClick={() => {
                  onAddingChange(false)
                  setOpened(
                    open
                      ? null
                      : { field: token.field, negated: token.negated },
                  )
                }}
                title={more > 1 ? plain : undefined}
                className="cursor-pointer truncate outline-none focus-visible:underline"
              >
                {words}
              </button>
            )}
            <Button
              variant="ghost"
              size="xsIcon"
              className="shrink-0"
              onClick={() => removeToken(token)}
              aria-label={t('sentence.remove', { clause: plain })}
            >
              <XIcon className="size-3" />
            </Button>
          </span>
        )
      })}
      {(!inline || adding) && (
        <AddDetail
          inputRef={addRef}
          panelRef={panelRef}
          adding={adding}
          onStart={() => {
            setOpened(null)
            onAddingChange(true)
          }}
          onStop={() => onAddingChange(false)}
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
            onAddingChange(false)
            setOpened({ field, negated: false })
          }}
        />
      )}
      {(trailing || (clearable && narrowed)) && (
        <span className={cn('flex items-center gap-3', !inline && 'ml-auto')}>
          {trailing}
          {clearable && narrowed && (
            <TextButton tone="quiet" onClick={clearAll}>
              {t('sentence.clearAll')}
            </TextButton>
          )}
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
  )
}
