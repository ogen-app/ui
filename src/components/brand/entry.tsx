import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { CheckCircleIcon, CircleIcon } from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import { DoorCaret } from '@/components/ui/card'
import { cn } from '@/lib'
import { audienceRun, capital, voiceRun } from './entryMarks'
import type { BrandAudience, BrandVoice } from './types'

/**
 * What every voice, audience and series is drawn from, wherever it is drawn —
 * the hub's rows, the library's cards one level down, a campaign's picks.
 *
 * Four parts, in one order and one set of type:
 *
 * 1. **The name**, the card's or the row's, led by its mark (`voiceMark`,
 *    `audienceMark`, the series' tick).
 * 2. **One line**: what somebody picks this one for.
 * 3. **One ruled run of text** (`Ruled`), opening on a few words in weight that
 *    the content carries on from — "Sounds like we cut onboarding…", "Reads on
 *    phone, between meetings." No label column and no separator between the
 *    words and what follows. Empty says so in the same place, in tertiary.
 * 4. **The facts, as bullets** (`Facts`). A list inside a bullet joins with
 *    commas, a detail goes in brackets — never " · ".
 */

/** A few words in weight, then the content running on from them. */
export function Lead({
  lead,
  children,
}: {
  lead: string
  children: ReactNode
}) {
  return (
    <>
      <span className="font-medium">{lead}</span> {children}
    </>
  )
}

/**
 * The one ruled block. Clamped, because a card is a preview and the entry is
 * one click away; empty says so in the same place, in tertiary, so an empty
 * entry is the same card with different words rather than a shorter one.
 */
export function Ruled({
  children,
  empty,
}: {
  children?: ReactNode
  empty?: string
}) {
  return (
    <div className="border-l-2 border-quaternary pl-3 text-sm leading-5">
      {children ? (
        <p className="line-clamp-3">{children}</p>
      ) : (
        <p className="text-tertiary-foreground">{empty}</p>
      )}
    </div>
  )
}

/**
 * The facts at an entry's foot, a bullet each — a list rather than stacked
 * lines, because a fact wraps on a narrow column and without markers the
 * wrapped half reads as another fact. A string starts with a capital however
 * its parts were written ("3 samples, never used"); empty ones drop out.
 */
export function Facts({ items }: { items: ReactNode[] }) {
  const shown = items.filter(
    (item) =>
      item !== null && item !== undefined && item !== '' && item !== false,
  )
  if (shown.length === 0) return null
  return (
    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm leading-5">
      {shown.map((fact, i) => (
        <li key={i}>{typeof fact === 'string' ? capital(fact) : fact}</li>
      ))}
    </ul>
  )
}

/** The row's tick: filled once the entry has what makes it work. */
export function Tick({ done }: { done: boolean }) {
  return done ? (
    <CheckCircleIcon
      weight="fill"
      className="size-4 text-positive"
      aria-hidden
    />
  ) : (
    <CircleIcon className="size-4 text-senary-foreground" aria-hidden />
  )
}

/**
 * One entry in a card that lists things, and the door to it: its mark, the
 * name, then either one short line (`meta`) or the entry's own content
 * (`children`), and a caret of its own — the card's (`DoorCaret`), so the row's
 * and the card's are the same. The card's heading opens the section; the row
 * opens this one thing.
 *
 * A link when it knows where it goes (`href`), so it opens in a new tab; a
 * plain click still calls `onOpen`, which navigates client-side. Without either
 * it is not a door at all — an empty pick has nothing to open — and draws no
 * caret and no hover.
 */
export function EntryRow({
  mark,
  name,
  meta,
  onOpen,
  href,
  label,
  children,
}: {
  mark: ReactNode
  name: string
  meta?: string
  onOpen?: () => void
  href?: string
  /** The door's accessible name, when the name alone does not say where it goes. */
  label?: string
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">
        {mark}
      </span>
      <span
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          children ? 'gap-2' : 'gap-0.5',
        )}
      >
        <span className="truncate text-sm leading-5 font-semibold">{name}</span>
        {meta && (
          <span className="text-[13px] leading-5 text-secondary-foreground">
            {capital(meta)}
          </span>
        )}
        {children}
      </span>
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">
        {onOpen && (
          <DoorCaret className="text-tertiary-foreground group-hover/row:text-primary-foreground" />
        )}
      </span>
    </>
  )
  const row = 'group/row -mx-2 flex items-start gap-3 rounded-md px-2 py-2'
  const door = cn(
    row,
    'cursor-pointer text-left hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
  )
  const follow = (e: MouseEvent) => {
    if (
      href &&
      (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
    )
      return
    e.preventDefault()
    onOpen?.()
  }
  const press = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen?.()
    }
  }
  return (
    <li className="group-data-[divided=true]/rows:border-t group-data-[divided=true]/rows:border-border group-data-[divided=true]/rows:pt-2 first:border-t-0 first:pt-0">
      {onOpen && href ? (
        <a href={href} onClick={follow} aria-label={label} className={door}>
          {body}
        </a>
      ) : onOpen ? (
        // Not a <button>: the row holds paragraphs and a list, which a button
        // may not contain.
        <div
          role="link"
          tabIndex={0}
          aria-label={label}
          onClick={follow}
          onKeyDown={press}
          className={door}
        >
          {body}
        </div>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  )
}

/** Rows of whole entries are ruled apart; one-line rows are not. */
export function EntryRows({
  divided = true,
  children,
}: {
  divided?: boolean
  children: ReactNode
}) {
  return (
    <ul
      data-divided={divided}
      className={cn('group/rows flex flex-col', divided && 'gap-2')}
    >
      {children}
    </ul>
  )
}

/* ── Entries ────────────────────────────────────────────────────────────── */

/** A voice's line, its sample and the facts the caller gives it. */
export function VoiceContent({
  t,
  voice,
  facts,
}: {
  t: TFunction
  voice: BrandVoice
  facts: ReactNode[]
}) {
  return (
    <>
      {voice.whenToUse && (
        <p className="text-sm leading-5">{voice.whenToUse}</p>
      )}
      <Ruled empty={t('brand.entry.noSamples')}>{voiceRun(t, voice)}</Ruled>
      <Facts items={facts} />
    </>
  )
}

/** An audience's line, its run and the facts the caller gives it. */
export function AudienceContent({
  t,
  audience,
  facts,
}: {
  t: TFunction
  audience: BrandAudience
  facts: ReactNode[]
}) {
  return (
    <>
      {audience.who && <p className="text-sm leading-5">{audience.who}</p>}
      <Ruled empty={t('brand.entry.notDescribed')}>
        {audienceRun(t, audience)}
      </Ruled>
      <Facts items={facts} />
    </>
  )
}
