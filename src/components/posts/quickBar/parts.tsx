import { WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The pieces every control on the quick-settings bar is built from.
 *
 * They live together because what they encode is the bar's own grammar — how
 * one inline control is separated from the next, what an incomplete field
 * looks like, what a trigger reads like — and each of the bar's four controls
 * is drawn with the same ones. Split across those files instead, the grammar
 * would only exist as a resemblance.
 */

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
export function WarningHint({ text, focusable }: { text: string; focusable?: boolean }) {
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
export function InfoRow({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-xs text-tertiary-foreground">{children}</div>
}

export function QuickBarTrigger({
  label,
  disabled,
  children,
}: {
  label: string
  disabled?: boolean
  children: React.ReactNode
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
