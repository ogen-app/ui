import { useRef, useState, type ReactNode } from 'react'
import { CaretDownIcon, PlusIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib'
import type { CampaignAccountRow } from '@/lib/campaignAccounts'
import { accountLabel } from '@/lib/publishingAccount'
import type { PublisherAccount } from '@/types/campaigns'
import { AccountLabel } from './AccountLabel'
import { SupersedeOffer } from './SupersedeOffer'

// `pr-5` against `pl-3`: the right end carries a label and an icon rather than
// a fixed control, and at the row's own padding they sat on the card's edge.
// Everything inside the expanded region uses the same right inset.
const ROW =
  'group flex items-center justify-between gap-3 pl-3 pr-5 py-3 bg-secondary'

/**
 * One row, targeted or not.
 *
 * Both states are one component so the post-type region can be a height
 * transition rather than a mount: swapping components here would unmount the
 * region on deactivate, and an unmounted element cannot animate out.
 *
 * The row is one click target throughout, and what that click does is what the
 * right-hand end says it does: ACTIVATE + while the campaign doesn't target
 * this account, a caret once it does. Those are different verbs, so they never
 * share an affordance — a plus that sometimes expands and sometimes adds is the
 * thing this replaced.
 *
 * Expansion is therefore its own state rather than a reading of `selection`: a
 * targeted row can be folded away without losing its post types, and a row
 * being open no longer claims the campaign publishes there.
 */
export function AccountRow({
  row,
  onAdd,
  onSupersede,
  onTogglePostType,
  onDeactivate,
}: {
  row: CampaignAccountRow
  onAdd: () => void
  onSupersede: (account: PublisherAccount) => void
  onTogglePostType: (slug: string) => void
  onDeactivate: () => void
}) {
  const { view, account, selection, supersededBy } = row
  const { info, available, unavailable } = view
  const selected = selection !== undefined
  const name = account ? accountLabel(account) : info.name

  // Targeted rows start open, the way they did when being open *was* being
  // targeted; from then on it is the user's to set. Activating opens the row
  // it activated — the post types are the rest of that decision, and burying
  // them behind a second click would be an odd place to stop.
  const [expanded, setExpanded] = useState(selected)
  const open = selected && expanded

  // Deactivating drops the entry on the same click that starts the collapse,
  // so the switches would flip off under the user while the region is still
  // closing. They keep their last state on the way out.
  const lastPostTypes = useRef<string[]>([])
  if (selection) lastPostTypes.current = selection.post_types
  const postTypes = selection?.post_types ?? lastPostTypes.current

  const activate = () => {
    setExpanded(true)
    onAdd()
  }

  return (
    <div className="flex flex-col bg-secondary">
      <RowShell
        onToggle={selected ? () => setExpanded((v) => !v) : activate}
        label={
          selected
            ? `${name} — post types`
            : `Activate ${name} for this campaign`
        }
        expanded={selected ? expanded : undefined}
      >
        <div className="flex-1 min-w-0">
          <AccountLabel
            row={row}
            selectedCount={selected ? postTypes.length : undefined}
            open={open}
          />
        </div>
        {/* Not a nested button in either state: the row is the control, and a
            second tab stop that does exactly what the row does would be one
            more thing for a keyboard user to step past. Colour is the whole of
            the hover feedback — the row keeps its background, so a pointer
            moving down the list doesn't set off a column of blocks. */}
        {/* Bolder and a couple of pixels larger than the plus it replaces: a
            caret is two strokes where a plus is a filled cross, so matching
            box sizes leaves it looking like the lighter of the two. */}
        {selected ? (
          <CaretDownIcon
            aria-hidden
            weight="bold"
            className={cn(
              'size-[18px] shrink-0 text-tertiary-foreground',
              'transition-[transform,color] duration-200 group-hover:text-primary-foreground',
              expanded && 'rotate-180',
            )}
          />
        ) : (
          <span
            aria-hidden
            className="flex shrink-0 items-center gap-2.5 text-tertiary-foreground transition-colors group-hover:text-primary-foreground"
          >
            {/* Literal caps, matching every other action label in the app. */}
            <span className="text-[13px]/4 font-medium">ACTIVATE</span>
            <PlusIcon className="size-4" weight="bold" />
          </span>
        )}
      </RowShell>

      {/* `grid-template-rows` rather than `height`: the post-type list has no
          height to name up front, and 0fr→1fr animates to whatever it turns
          out to be. `visibility` rides along because a zero-height row still
          holds focusable switches — a keyboard user would tab into a list
          nobody can see. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-200 ease-out',
          open ? 'grid-rows-[1fr] visible' : 'grid-rows-[0fr] invisible',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pb-2">
            {supersededBy.length > 0 && (
              <SupersedeOffer
                accounts={supersededBy}
                platform={info}
                onSupersede={onSupersede}
              />
            )}
            {/* An active row with every switch off publishes nothing, and
                nothing else on screen says so — the switches are all in their
                normal off state and the row looks targeted. Only while
                targeted: on the way out `postTypes` is the last state, which
                is not this. */}
            {selected && postTypes.length === 0 && (
              <p className="ml-3 mr-5 mb-2 border border-warning/40 px-3 py-2 text-sm text-warning">
                No post types selected — this {account ? 'account' : 'platform'}{' '}
                won’t publish anything.
              </p>
            )}
            {[...available, ...unavailable].map((pt) => (
              <PostTypeSwitchRow
                key={pt.slug}
                label={pt.label}
                ariaLabel={`${name} — ${pt.label}`}
                checked={postTypes.includes(pt.slug)}
                onToggle={() => onTogglePostType(pt.slug)}
                muted={unavailable.includes(pt)}
              />
            ))}
            {/* The last line of the same list, not a button parked under it:
                the label starts where the switch labels do and what it says
                sits where their switches do, so the column reads straight
                down. It ends what this account does for the campaign, which is
                why it comes after everything that account does.

                Two controls in this app take an account away from something,
                and they take it away from different things. Workspace
                Settings' Disconnect is a red plug icon that ends the
                connection for the whole tenant; this one is words only, and
                the line beside it names what it removes — a campaign's
                targeting comes back with one click, an OAuth grant does not.
                Literal caps, per the app's action-label convention. */}
            <div className="flex items-center justify-between gap-4 pl-16 pr-5 py-2">
              <Button
                type="button"
                variant="ghost"
                size="excluded"
                // Nothing to close by hand: dropping the entry closes the
                // region on its own, and reactivating opens it again.
                onClick={onDeactivate}
              >
                {account ? 'DEACTIVATE ACCOUNT' : 'DEACTIVATE PLATFORM'}
              </Button>
              <span className="text-right text-xs text-tertiary-foreground">
                {account
                  ? 'The account stays connected to the workspace.'
                  : 'Removes this platform from the campaign.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The row's clickable shell — always pressable, whichever verb the row is
 * currently offering.
 *
 * `aria-expanded` is passed only by a targeted row, which is the only one that
 * has a region to open; on an untargeted row the same click activates, and
 * announcing it as collapsed would name the wrong action.
 */
function RowShell({
  onToggle,
  label,
  expanded,
  children,
}: {
  onToggle: () => void
  label: string
  expanded?: boolean
  children: ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={(e) => {
        // Only the row's own keys: Enter/Space on a nested control bubbles
        // here too, and must not also toggle.
        if (e.target !== e.currentTarget) return
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onToggle()
      }}
      className={cn(
        ROW,
        'cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
      )}
    >
      {children}
    </div>
  )
}

function PostTypeSwitchRow({
  label,
  ariaLabel,
  checked,
  onToggle,
  muted = false,
}: {
  label: string
  ariaLabel: string
  checked: boolean
  onToggle: () => void
  muted?: boolean
}) {
  return (
    <label
      className={cn(
        // Left edge lines up with the name: row padding (12) + avatar (40) +
        // gap (12).
        'flex items-center justify-between gap-3 pl-16 pr-5 py-2',
        'cursor-pointer select-none hover:bg-secondary/60',
        muted && 'opacity-60',
      )}
    >
      {/* On/off is legible from the label as well as the switch, so a glance
          down the column reads as a list of what publishes. */}
      <span
        className={cn(
          'text-sm',
          checked ? 'text-primary-foreground' : 'text-tertiary-foreground',
        )}
      >
        {label}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={ariaLabel}
      />
    </label>
  )
}
