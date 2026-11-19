import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretRightIcon, XIcon, type Icon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import type { StatusTone } from '@/components/ui/status-badge'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'

/**
 * The app's one card (design harness `/design/cards`, settled 2026-11-19).
 *
 * Bordered `rounded-md` on the white surface, a `text-lg` title and nothing
 * under it, full width of its column unless `capped`. Every card has a title.
 *
 * A card is one of three things, and what it is decides the end of its header:
 * - **summary**: read here, worked on elsewhere. A `door` and the caret. The
 *   whole card is the door and lifts on hover, or only the heading is, when
 *   rows inside open on their own (a link can't sit inside a link).
 * - **input**: fields, and at most one `action`. Saving is automatic, so the
 *   action is the AI or a move, never a submit.
 * - **display**: read-only, with at most one `action` or one `choice` (a
 *   selector that changes what is shown, such as the period).
 * A notice is a display card whose end is a dismiss X.
 *
 * An `action` is a real, filled button, never a text or ghost one.
 * `icon` + `tone` is a prop on every kind, never a kind of its own.
 */
export type CardDoor = {
  kind: 'header' | 'card'
  onOpen: () => void
  /**
   * Where the door goes, when it goes somewhere: the door is then a real link,
   * so it can be opened in a new tab, and a plain click still calls `onOpen`
   * (client-side navigation).
   */
  href?: string
}

/** A plain click is the app's; a modified or middle click is the browser's. */
function follow(door: CardDoor) {
  return (e: MouseEvent<HTMLElement>) => {
    if (
      door.href &&
      (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
    )
      return
    e.preventDefault()
    door.onOpen()
  }
}

export type CardAction = {
  label: string
  icon?: Icon
  onClick: () => void
  disabled?: boolean
  /** The button's own spinner, while what it started is running. */
  loading?: boolean
  /** Copy for a destructive action is written in capitals (CLAUDE.md). */
  destructive?: boolean
}

export type CardChoice = {
  label: string
  value: string
  options: readonly { id: string; displayValue: string }[]
  onChange: (value: string) => void
}

export type CardStatus = { label: string; tone?: StatusTone; icon?: Icon }

const TONE_DOT: Record<StatusTone, string> = {
  neutral: 'bg-tertiary-foreground',
  positive: 'bg-positive',
  negative: 'bg-negative',
  destructive: 'bg-destructive',
  progress: 'bg-info',
  attention: 'bg-attention',
  warn: 'bg-warning',
}

const TONE_INK: Record<StatusTone, string> = {
  neutral: 'text-tertiary-foreground',
  positive: 'text-positive',
  negative: 'text-negative',
  destructive: 'text-destructive',
  progress: 'text-info',
  attention: 'text-attention',
  warn: 'text-warning',
}

/** Inline in the title run, so it shares its baseline rather than its centre. */
function StatusMark({ label, tone = 'neutral', icon: Glyph }: CardStatus) {
  return (
    <span className="ml-4 whitespace-nowrap text-tertiary-foreground">
      {Glyph ? (
        <Glyph
          weight="fill"
          className={cn(
            'mr-1.5 inline size-4 align-[-0.125em]',
            TONE_INK[tone],
          )}
          aria-hidden
        />
      ) : (
        <span
          className={cn(
            'mr-1.5 inline-block size-2 rounded-full align-middle',
            TONE_DOT[tone],
          )}
          aria-hidden
        />
      )}
      {label}
    </span>
  )
}

export type CardProps = {
  id?: string
  /** Always drawn at 20px, so every card's title starts on the same line. */
  icon?: Icon
  /** A CSS colour — a section hue (`var(--brand-voices)`) or a status token. */
  tone?: string
  title: ReactNode
  /** Drawn after a `·` the card draws, so it carries no punctuation of its own. */
  qualifier?: ReactNode
  /**
   * Drawn in the qualifier's type, on the title's baseline: one line, one
   * face. A dot in its tone, or a glyph in its place (the default star).
   */
  status?: CardStatus
  /**
   * `h1` for the card that names a screen whose page header doesn't (a
   * Foundation section or editor, under a header that is only a back link).
   */
  heading?: 'h1' | 'h2'
  /** Caps the card at the content column (740px). Full width otherwise. */
  capped?: boolean
  children?: ReactNode
} & (
  | {
      door: CardDoor
      action?: never
      choice?: never
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: CardAction
      choice?: never
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: never
      choice?: CardChoice
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: never
      choice?: never
      onDismiss: () => void
      /** What the X does, when it does more than close ("Don't offer this again"). */
      dismissLabel?: string
    }
)

const Caret = () => (
  <CaretRightIcon
    className="ml-auto size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
    weight="bold"
    aria-hidden
  />
)

function End({
  action,
  choice,
  onDismiss,
  dismissLabel,
}: {
  action?: CardAction
  choice?: CardChoice
  onDismiss?: () => void
  dismissLabel?: string
}) {
  const { t } = useTranslation()
  if (action) {
    const {
      label,
      icon: Glyph,
      onClick,
      disabled,
      loading,
      destructive,
    } = action
    return (
      <Button
        type="button"
        size="sm"
        variant={destructive ? 'destructive' : 'neutral'}
        onClick={onClick}
        disabled={disabled}
        loading={loading}
      >
        {Glyph && <Glyph />}
        <span>{label}</span>
      </Button>
    )
  }
  if (choice)
    return (
      <TextSelect
        ariaLabel={choice.label}
        value={choice.value}
        onValueChange={choice.onChange}
        elements={choice.options}
        variant="default"
        size="sm"
        className="w-40 shrink-0"
      />
    )
  if (onDismiss)
    return (
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel ?? t('common.close')}
        className="-m-1 cursor-pointer p-1 text-tertiary-foreground hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
    )
  return null
}

export function Card({
  id,
  icon: Glyph,
  tone,
  title,
  qualifier,
  status,
  door,
  action,
  choice,
  onDismiss,
  dismissLabel,
  heading: Heading = 'h2',
  capped = false,
  children,
}: CardProps) {
  const heading = (
    <>
      {Glyph && (
        <Glyph
          className="size-5 shrink-0"
          style={tone ? { color: tone } : undefined}
          aria-hidden
        />
      )}
      <span className="min-w-0 truncate">
        {title}
        {qualifier && (
          <span className="text-tertiary-foreground">
            <span className="mx-2" aria-hidden>
              ·
            </span>
            {qualifier}
          </span>
        )}
        {status && <StatusMark {...status} />}
      </span>
    </>
  )

  const header = (
    <div className="flex min-h-8 min-w-0 items-center gap-3">
      <Heading className="flex min-w-0 flex-1 items-center gap-2 font-display text-lg font-medium tracking-tight">
        {door?.kind === 'header' ? (
          door.href ? (
            <a
              href={door.href}
              onClick={follow(door)}
              className="group -m-1 flex min-w-0 flex-1 items-center gap-2 rounded-sm p-1"
            >
              {heading}
              <Caret />
            </a>
          ) : (
            <button
              type="button"
              onClick={door.onOpen}
              className="group -m-1 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm p-1 text-left"
            >
              {heading}
              <Caret />
            </button>
          )
        ) : (
          <>
            {heading}
            {door?.kind === 'card' && <Caret />}
          </>
        )}
      </Heading>
      {!door && (
        <End
          action={action}
          choice={choice}
          onDismiss={onDismiss}
          dismissLabel={dismissLabel}
        />
      )}
    </div>
  )

  const box = cn(
    'flex w-full min-w-0 flex-col gap-4 rounded-md border border-border bg-primary p-6',
    capped && 'max-w-content',
  )

  const lift =
    'group cursor-pointer transition-shadow duration-150 hover:shadow-lg'

  // A whole-card door holds no other control, so the card itself can be the
  // link (or, with nowhere to link to, the button).
  if (door?.kind === 'card' && door.href)
    return (
      <a
        id={id}
        href={door.href}
        onClick={follow(door)}
        className={cn(box, lift)}
      >
        {header}
        {children}
      </a>
    )

  if (door?.kind === 'card')
    return (
      <section
        id={id}
        role="button"
        tabIndex={0}
        onClick={door.onOpen}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            door.onOpen()
          }
        }}
        className={cn(box, lift)}
      >
        {header}
        {children}
      </section>
    )

  return (
    <section id={id} className={box}>
      {header}
      {children}
    </section>
  )
}
