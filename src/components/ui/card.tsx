import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  Cancel01Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'

import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import type { StatusTone } from '@/components/ui/status-badge'
import { TextSelect } from '@/components/ui/text-select'
import { cn } from '@/lib'

/**
 * The app's one card (design harness `/design/cards`, settled 2026-11-19).
 *
 * A card is three things: the surface, a header, and some content. The
 * surface is bordered `rounded-md` on white, full width of its column unless
 * `capped`. The header is a `text-lg` title with nothing under it, and one
 * option at its end. The content is the card's own — rows, fields, a chart,
 * a pair of buttons — and the card says nothing about its shape.
 *
 * The header's option is one of:
 * - a `door`: the card is read here and worked on elsewhere. The whole card is
 *   the door and lifts on hover, or only the heading is, when rows inside open
 *   on their own (a link can't sit inside a link).
 * - an `action`: one button — the AI, a move, a destructive step. White with
 *   a border, or black when it is the card's point (`accent`); never grey.
 *   Labels are in sentence case. A destructive one is white with its
 *   icon in the danger colour, so it always carries an icon. Never a
 *   submit: saving is automatic.
 * - a `choice`: a selector that changes what the content shows (the period),
 *   drawn as the outline button with a chevron at its end.
 * - an `aside`: a line of text in the qualifier's type (the dates and the day).
 * - `onDismiss`: the X that makes the card a notice.
 *
 * `icon` + `tone` is a prop on every card, never a kind of its own. Every
 * glyph a card draws is a Hugeicon, at the rail's 1.5 stroke.
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
  /** A Hugeicon, or `'ogen'` for Ogen's mark when the action is Ogen's. */
  icon?: IconSvgElement | 'ogen'
  /** Black rather than white: the one action the card is for. */
  accent?: boolean
  onClick: () => void
  disabled?: boolean
  /** The button's own spinner, while what it started is running. */
  loading?: boolean
  /** White with the icon in the danger colour: give it an icon. */
  destructive?: boolean
}

export type CardChoice = {
  label: string
  value: string
  options: readonly { id: string; displayValue: string }[]
  onChange: (value: string) => void
}

export type CardStatus = {
  label: string
  tone?: StatusTone
  icon?: IconSvgElement
}

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
function StatusMark({ label, tone = 'neutral', icon }: CardStatus) {
  return (
    <span className="ml-4 whitespace-nowrap text-tertiary-foreground">
      {icon ? (
        <HugeiconsIcon
          icon={icon}
          size={16}
          strokeWidth={1.5}
          className={cn('mr-1.5 inline align-[-0.125em]', TONE_INK[tone])}
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
  /** A Hugeicon, always drawn at 20px, so every title starts on one line. */
  icon?: IconSvgElement
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
  /**
   * The content scrolls under the header once something holds the card to a
   * height — a sticky column capped at the screen's. Unheld, the card is as
   * tall as its content.
   */
  scrolls?: boolean
  children?: ReactNode
} & (
  | {
      door: CardDoor
      action?: never
      choice?: never
      aside?: never
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: CardAction
      choice?: never
      aside?: never
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: never
      choice?: CardChoice
      aside?: never
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: never
      choice?: never
      aside: ReactNode
      onDismiss?: never
      dismissLabel?: never
    }
  | {
      door?: never
      action?: never
      choice?: never
      aside?: never
      onDismiss: () => void
      /** What the X does, when it does more than close ("Don't offer this again"). */
      dismissLabel?: string
    }
)

const Caret = () => (
  <HugeiconsIcon
    icon={ArrowRight01Icon}
    size={16}
    strokeWidth={2}
    className="ml-auto shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
    aria-hidden
  />
)

function End({
  action,
  choice,
  aside,
  onDismiss,
  dismissLabel,
}: {
  action?: CardAction
  choice?: CardChoice
  aside?: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
}) {
  const { t } = useTranslation()
  if (action) {
    const { label, icon, accent, onClick, disabled, loading, destructive } =
      action
    return (
      <Button
        type="button"
        size="sm"
        variant={
          destructive ? 'destructive' : accent ? 'defaultInverted' : 'outline'
        }
        onClick={onClick}
        disabled={disabled}
        loading={loading}
      >
        {icon === 'ogen' ? (
          <Logo variant="mark" />
        ) : (
          icon && <HugeiconsIcon icon={icon} strokeWidth={1.5} />
        )}
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
        variant="button"
        size="sm"
        className="shrink-0"
      />
    )
  if (aside)
    return (
      <span className="shrink-0 text-right text-sm text-tertiary-foreground">
        {aside}
      </span>
    )
  if (onDismiss)
    return (
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel ?? t('common.close')}
        className="-m-1 cursor-pointer p-1 text-tertiary-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
      </button>
    )
  return null
}

/**
 * The card that isn't there yet: the way to make a new one, at the end of the
 * cards it would join. Wherever a click spawns a new card — an entry in a
 * library, a file on a post — the offer looks like this: the card's outline,
 * dashed, on no surface of its own, with a plus and what it makes. Dashed
 * because it is a place for a card rather than a card; transparent so it never
 * reads as one of the real entries beside it. One plus as tall as the two
 * lines beside it, the title in the header's type, and a line under it saying
 * what the new card will be.
 */
export function NewCard({
  label,
  hint,
  icon = PlusSignIcon,
  onClick,
  capped = false,
}: {
  /** What it makes, in the card header's type. */
  label: string
  /** One line under it, for what the new card will be. */
  hint: string
  icon?: IconSvgElement
  onClick?: () => void
  capped?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-transparent p-6 text-left transition-colors hover:border-tertiary-foreground',
        capped && 'max-w-content',
      )}
    >
      {/* As tall as the two lines beside it, and centred on them. */}
      <span className="flex shrink-0 items-center text-tertiary-foreground group-hover:text-primary-foreground">
        <HugeiconsIcon icon={icon} size={32} strokeWidth={1.5} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex min-h-8 items-center font-display text-lg font-medium tracking-tight">
          {label}
        </span>
        <span className="text-sm text-tertiary-foreground">{hint}</span>
      </span>
    </button>
  )
}

export function Card({
  id,
  icon,
  tone,
  title,
  qualifier,
  status,
  door,
  action,
  choice,
  aside,
  onDismiss,
  dismissLabel,
  heading: Heading = 'h2',
  capped = false,
  scrolls = false,
  children,
}: CardProps) {
  const heading = (
    <>
      {icon && (
        <HugeiconsIcon
          icon={icon}
          size={20}
          strokeWidth={1.5}
          className="shrink-0"
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
          aside={aside}
          onDismiss={onDismiss}
          dismissLabel={dismissLabel}
        />
      )}
    </div>
  )

  const box = cn(
    'flex w-full min-w-0 flex-col gap-4 rounded-md border border-border bg-primary p-6',
    capped && 'max-w-content',
    scrolls && 'min-h-0 flex-1 overflow-hidden',
  )

  // Edge to edge, so the scroll bar sits on the card's border.
  const body = scrolls ? (
    <div className="-mx-6 -mb-6 flex min-h-0 flex-col gap-4 overflow-y-auto px-6 pb-6">
      {children}
    </div>
  ) : (
    children
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
        {body}
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
        {body}
      </section>
    )

  return (
    <section id={id} className={box}>
      {header}
      {body}
    </section>
  )
}
