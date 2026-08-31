import { Link } from '@tanstack/react-router'
import { WarningCircleIcon } from '@phosphor-icons/react'

import { AccountAvatar } from '@/components/ui/account-avatar'
import { useAutoPublishState } from '@/hooks/useAutoPublishAllowlist'
import { cn } from '@/lib'
import type { CampaignAccountRow } from '@/lib/campaignAccounts'
import { accountLabel } from '@/lib/publishingAccount'

/**
 * Everything a row says about itself before it is opened: who publishes, on
 * what platform, how, and how much of it.
 *
 * The whole file is one line of text and the mark beside it, which is out of
 * proportion to its length for a reason — this line is the row when the row is
 * folded, and a folded row is the state most of the list is in. Each clause
 * below is carrying something the expanded region would otherwise have said.
 */
export function AccountLabel({
  row,
  selectedCount,
  open = false,
}: {
  row: CampaignAccountRow
  selectedCount?: number
  /** Whether the row's own region is showing — some of this line is a pointer at it. */
  open?: boolean
}) {
  const { view, account } = row
  const { info } = view
  const Icon = info.icon
  // Only a targeted row passes a count, so this doubles as "is targeted".
  const selected = selectedCount !== undefined
  const placeholder = account === null
  const name = account ? accountLabel(account) : info.name

  // `allowed`, not `available`, on both sides: those are the rows the expanded
  // block actually renders. An untargeted placeholder gives up the count
  // entirely — how many kinds of post it could take is the wrong thing to
  // answer when the workspace cannot reach the platform at all.
  // Zero is not a count worth reporting neutrally — "0 of 4 post types" reads
  // as a setting, and it is a row that publishes nothing. The folded row has
  // to carry that on its own, since the warning inside is folded away with it.
  const counts = selected ? (
    selectedCount === 0 ? (
      <span className="text-warning">No post types selected</span>
    ) : (
      `${selectedCount} of ${view.allowed.length} post types`
    )
  ) : placeholder ? null : (
    `${view.allowed.length} post types available`
  )

  // Set in Workspace Settings, not here: this is the workspace's decision
  // showing through, so the campaign can see how its posts will go out without
  // having to leave the page to find out.
  const autoPublish = useAutoPublishState(view.platform.id)

  return (
    <div className="min-w-0 flex items-center gap-3">
      <span className="relative shrink-0">
        {placeholder ? (
          // Square where an account is round, and that is the whole of the
          // difference at a glance: a circle is somebody's face, a tile is a
          // network.
          //
          // Monochrome, not the brand's colour: this row is a platform with
          // nobody behind it, and a full-colour logo would out-shout the
          // connected accounts above it — the rows that can actually publish.
          // Selection is the whole of what the tile encodes, so it darkens
          // and the mark turns white; hover only moves the unselected tile,
          // because a selected one has nowhere left to go.
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-lg transition-colors',
              selected
                ? 'bg-secondary-foreground'
                : 'bg-platform-tile group-hover:bg-platform-tile-hover',
            )}
          >
            <Icon
              className={cn(
                'size-7',
                selected ? 'text-primary' : 'text-platform-tile-foreground',
              )}
              weight="fill"
            />
          </span>
        ) : (
          // The badge is full colour whether or not the campaign targets this
          // account — which platform a face belongs to is identity, not
          // selection.
          <AccountAvatar
            src={account.avatar_url}
            name={name}
            platform={info}
            size="md"
          />
        )}
        {/* A targeted placeholder is a campaign that cannot publish, and from a
            distance the row looks like any other. The badge is the one thing
            the identity block can't say on its own. */}
        {placeholder && selected && (
          <WarningCircleIcon
            weight="fill"
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full bg-secondary text-warning"
          />
        )}
      </span>
      <div className="min-w-0 flex flex-col">
        <span className="text-base font-semibold text-primary-foreground truncate">
          {name}
        </span>
        <span className="text-xs text-tertiary-foreground truncate">
          {/* The platform first on an account row: the name above it is a page,
              not a channel, and "Acme" alone doesn't say where it posts. */}
          {!placeholder && (
            <>
              {info.name}
              {' · '}
            </>
          )}
          {/* Ahead of the post-type count: whether Ogen posts on the user's
              behalf outranks how many kinds of post it may send. Held while
              `unknown` — "Manual publishing only" is not a sentence to write
              before asking. */}
          {selected && autoPublish !== 'unknown' && (
            <>
              {autoPublish === 'allowed'
                ? 'Auto-publishing allowed'
                : 'Manual publishing only'}
              {counts && ' · '}
            </>
          )}
          {counts}
          {/* The same fact in two registers. On a platform nobody has targeted
              it is grey and it is the whole line — the normal state of most of
              this list, stated and left alone. Once the campaign targets it,
              it turns into a campaign that cannot publish, so it escalates to
              the warning colour and carries the way out. */}
          {placeholder &&
            (selected ? (
              <>
                {counts && ' · '}
                {row.supersededBy.length > 0 ? (
                  // The offer that says this is inside the row, and the row
                  // folds — so the line has to carry it, or a collapsed
                  // placeholder would go on claiming nothing is connected
                  // while an account sits waiting one click away. Once the row
                  // is open the accounts are on screen with a button each, and
                  // the directions come off: nothing ages worse than being
                  // told to open something you are looking inside.
                  <span className="text-warning">
                    {row.supersededBy.length === 1
                      ? 'Account available'
                      : 'Accounts available'}
                    {!open &&
                      ` — open the row to use ${row.supersededBy.length === 1 ? 'it' : 'one'}`}
                    .
                  </span>
                ) : (
                  <>
                    <span className="text-warning">No account connected.</span>{' '}
                    <ConnectLink platformName={info.name} />
                  </>
                )}
              </>
            ) : (
              'No account connected — add it as a placeholder.'
            ))}
        </span>
      </div>
    </div>
  )
}

/**
 * Sends the user to Workspace Settings, where accounts are actually linked.
 *
 * A text link in the subline rather than a button on the row's right edge: it
 * belongs to the sentence that explains the problem, and the right edge is
 * reserved for the one control that acts on this campaign. It only appears on a
 * placeholder the campaign already targets, where the missing account is not
 * information but a campaign that cannot publish.
 */
function ConnectLink({ platformName }: { platformName: string }) {
  return (
    <Link
      to="/workspace-settings"
      aria-label={`Connect ${platformName}`}
      // Keeps the link from also triggering the row it sits inside.
      onClick={(e) => e.stopPropagation()}
      className="text-warning underline underline-offset-2"
    >
      Connect
    </Link>
  )
}
