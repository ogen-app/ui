import type { ReactNode } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'

/**
 * The pieces every row of the post's Settings tab is built from.
 *
 * They live together because what they encode is the tab's own grammar — a
 * label, then a 16px mark, then the value; what an incomplete field looks
 * like; what a trigger reads like — and every control is drawn with the same
 * ones. Split across the controls' files instead, the grammar would only exist
 * as a resemblance. (The folder keeps the name of what the tab was before it
 * was a tab: a two-line bar above the post.)
 */

/**
 * One row: the label, and beside it the value with its mark. Every value
 * starts with a 16px mark — the platform's logo, the account's picture, an
 * icon, or the warning that something is missing in its place — so the text
 * of every row starts at the same x and the column reads straight down.
 *
 * `note` is a quiet line under the value, indented to the value's text.
 */
export function SettingRow({
  label,
  help,
  note,
  children,
}: {
  label: string
  help?: ReactNode
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <dt className="flex h-6 items-center gap-1 self-start text-tertiary-foreground">
        {label}
        {help}
      </dt>
      <dd className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-h-6 min-w-0 items-center gap-1.5">
          {children}
        </div>
        {note && (
          <p className="pl-5.5 text-xs text-tertiary-foreground">{note}</p>
        )}
      </dd>
    </>
  )
}

/**
 * The 16px slot every value starts with. Icons in it are the tertiary grey
 * the labels are, so the marks guide the eye without competing with the
 * values; a platform logo keeps its own colour.
 */
export function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-tertiary-foreground [&_svg]:size-4">
      {children}
    </span>
  )
}

/**
 * A mark and a value side by side, for a value that is text rather than a
 * trigger — the same gap a trigger puts between its own mark and label.
 */
export function Marked({
  mark,
  className,
  children,
}: {
  mark: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <Mark>{mark}</Mark>
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

/**
 * Separator between the bar's inline controls. Without it neighbouring
 * triggers read as one run-on phrase ("Select publish date Add time",
 * "LinkedIn Text post by Ogen").
 */
export function Dot() {
  return (
    <span aria-hidden className="text-tertiary-foreground select-none">
      ·
    </span>
  )
}

/**
 * The orange marker on an incomplete field, carrying the reason on hover.
 * The icon alone says "something is wrong here" but not what or why — the
 * tooltip is where that gets answered.
 *
 * `focusable` is opt-in: these sit inside dropdown triggers in most places,
 * and a focusable span nested in a button is a keyboard trap.
 */
export function WarningHint({
  text,
  focusable,
}: {
  text: string
  focusable?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex shrink-0 items-center"
          tabIndex={focusable ? 0 : undefined}
          role="img"
          aria-label={text}
        >
          <WarningCircleIcon weight="fill" className="size-4 text-warning" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * A "nothing to choose here" note inside a menu. Styled like the settings
 * panel's own selects: quieter than a disabled row, and not selectable, so
 * it can't be mistaken for an option.
 */
export function InfoRow({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1.5 text-xs text-tertiary-foreground">
      {children}
    </div>
  )
}

export function QuickBarTrigger({
  label,
  disabled,
  children,
}: {
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="excluded"
        disabled={disabled}
        aria-label={label}
        className="gap-1.5 text-sm font-normal text-primary-foreground shrink-0"
      >
        {children}
      </Button>
    </DropdownMenuTrigger>
  )
}
