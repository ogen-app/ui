import type { Icon } from '@phosphor-icons/react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'

/**
 * A destination reduced to its mark.
 *
 * The rail draws two kinds of row: the ones you came to open, which get a
 * label, and the ones that are simply always there — the workspace's utilities
 * at either level, and the workspace's modules once you are inside a campaign.
 * Three of those as full rows spends five rows' worth of a list on things
 * nobody is scanning for; as glyphs they take one line and stop competing with
 * the rows that matter.
 *
 * The label does not disappear with the text — it moves into a tooltip and
 * into `aria-label`, so the glyph is still named for a screen reader and for
 * anyone who pauses on it. A row of unlabelled icons that cannot be resolved
 * at all is the failure mode this device usually has, and the tooltip is the
 * whole of the mitigation.
 */
export function NavGlyph({
  label,
  icon: Glyph,
  to,
  isActive,
  /** An unread/open marker, drawn as the shape a notification is. */
  dot = false,
  className,
}: {
  label: string
  icon: Icon
  to: LinkProps['to']
  isActive: boolean
  dot?: boolean
  className?: string
}) {
  return (
    // The provider's own delay is 0, which is right for the collapsed rail's
    // row tooltips — one wide target, one label. It is wrong for a strip of
    // 32px glyphs: crossing three of them on the way to the fourth fires three
    // tooltips. The pause is what makes it a label you asked for.
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="smIcon"
          asChild
          active={isActive}
          aria-label={label}
          className={cn(
            'flex-none text-sidebar-secondary-foreground hover:bg-sidebar-secondary hover:text-sidebar-primary-foreground',
            'data-[active=true]:bg-sidebar-secondary data-[active=true]:text-sidebar-primary-foreground',
            className,
          )}
        >
          <Link to={to}>
            <span className="relative flex items-center">
              <Glyph weight="regular" className="size-5" />
              {dot && (
                // The same dot the collapsed rail puts on a row's icon, for
                // the same reason: beside a 20px glyph there is no room for a
                // figure, so the count becomes the fact that there is one. The
                // ring punches the sidebar's own surface between the two marks
                // so they do not read as one.
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-notification ring-1 ring-sidebar-primary"
                />
              )}
            </span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}
