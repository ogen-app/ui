import { useMemo } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { useCampaignAccounts } from '@/hooks/useCampaignAccounts'
import { usePlatformViews } from '@/hooks/usePlatforms'
import {
  accountRows,
  activateTarget,
  deactivateTarget,
  togglePostType,
  PLACEHOLDER_ACCOUNT_ID,
  type CampaignAccountRow,
  type CampaignAccountTarget,
} from '@/lib/campaignAccounts'
import type { CampaignPlatform } from '@/types/campaigns'
import { AccountRow } from './accountsControl/AccountRow'
import { GroupLabel } from './accountsControl/parts'

type Props = {
  campaignId: string
  /** The campaign's `target_platforms` — seeds a campaign with no stored choice. */
  targetPlatforms: CampaignPlatform[]
  /**
   * Every change persists straight away instead of waiting for the header
   * Save: the rows read as toggles, not as an edit, and the account choice is
   * stored outside the form anyway — leaving the derived platforms behind
   * would put the two out of step until Save.
   */
  onCommitPlatforms: (next: CampaignPlatform[]) => void
}

/**
 * The accounts this campaign publishes as, and what each of them posts.
 *
 * One row per connected account, then one per platform nobody has connected
 * yet — see `lib/campaignAccounts` for why those two kinds never stack and why
 * connecting an account doesn't take a placeholder's place on its own.
 *
 * This file is the list: which rows exist, which group each falls into, and
 * what every one of the four actions writes back. A row draws itself in
 * `accountsControl/` — the rules above are about the campaign, the ones in
 * there are about a row, and keeping them apart is what makes the four
 * `apply(…)` calls below readable as a set.
 */
export function AccountsControl({
  campaignId,
  targetPlatforms,
  onCommitPlatforms,
}: Props) {
  const views = usePlatformViews()
  // The hook owns both writes — the account choice into the settings key and
  // the platform-level view of it onto the campaign — so a burst of clicks
  // costs one request each and they can't disagree.
  const {
    targets,
    isPending,
    write: apply,
  } = useCampaignAccounts(campaignId, targetPlatforms, onCommitPlatforms)

  const rows = useMemo(() => accountRows(views, targets), [views, targets])

  if (views.length === 0) {
    return (
      <span className="text-xs text-tertiary-foreground">
        No platforms available
      </span>
    )
  }

  // The list would otherwise draw every row as untargeted and then correct
  // itself — a campaign flashing "nothing to publish to" it doesn't mean.
  if (isPending) {
    return (
      <div className="flex flex-col gap-1">
        <Skeleton className="mb-3 h-5 w-64" />
        {views.map((view) => (
          <Skeleton key={view.platform.id} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const renderRow = (row: CampaignAccountRow) => {
    const platformId = row.view.platform.id
    const accountId = row.account?.id ?? PLACEHOLDER_ACCOUNT_ID
    const allowed = row.view.allowed.map((pt) => pt.slug)

    return (
      <AccountRow
        key={row.key}
        row={row}
        onAdd={() =>
          // Everything the expanded region renders starts switched on —
          // `allowed`, not `available`, so a placeholder arrives fully
          // targeted rather than as a row of dormant switches.
          apply(activateTarget(targets, platformId, accountId, allowed))
        }
        onSupersede={(account) =>
          // The placeholder's own post types come across with it —
          // `activateTarget` treats this as the same row gaining a name.
          apply(activateTarget(targets, platformId, account.id, allowed))
        }
        onTogglePostType={(slug) =>
          // Switching the last post type off leaves the account active
          // with nothing to publish, and it stays that way. Deactivating
          // on the user's behalf was one click doing two things — the row
          // would vanish mid-sentence while they were still deciding what
          // it posts. The row says it publishes nothing instead, and
          // DEACTIVATE is still right there when that is what they meant.
          apply(togglePostType(targets, platformId, accountId, slug))
        }
        onDeactivate={() =>
          apply(deactivateTarget(targets, platformId, accountId))
        }
      />
    )
  }

  // Two groups rather than one list in two sorts: an active row and an
  // inactive one look alike at a glance — same tile, same name, same width —
  // and interleaving them made the campaign's actual choice something you had
  // to read the right-hand end of every row to find.
  //
  // Both filters preserve `accountRows`' order, which is already the display
  // order for both halves — accounts before placeholders, and inside the
  // active half by when each was chosen, so activating a row lands it at the
  // foot of its kind rather than somewhere up the group.
  const active = rows.filter((row) => row.selection !== undefined)
  const inactive = rows.filter((row) => row.selection === undefined)

  return (
    <div className="flex flex-col gap-1">
      <AccountsSummary targets={targets} />
      <GroupLabel>ACTIVE</GroupLabel>
      {active.length > 0 ? active.map(renderRow) : <NoneActive />}
      {inactive.length > 0 && (
        <>
          <GroupLabel className="mt-4">INACTIVE</GroupLabel>
          {inactive.map(renderRow)}
        </>
      )}
    </div>
  )
}

/**
 * Holds the active group open at row height while it is empty.
 *
 * Without it the heading sits directly on top of INACTIVE and the card looks
 * like a list with a stray word in it — and the group the campaign is actually
 * defined by would be the one thing on screen with no substance to it.
 *
 * It carries the warning too, rather than repeating it in the summary line
 * above: a campaign with nowhere to publish is a state, and this is the shape
 * of the thing that is missing.
 */
function NoneActive() {
  return (
    <div className="flex h-16 items-center justify-center border border-dashed border-warning/40 px-3">
      <span className="text-sm text-warning">
        No accounts active — this campaign has nowhere to publish.
      </span>
    </div>
  )
}

/**
 * What the campaign currently publishes as, in one line above the list.
 *
 * The list only says this by omission, and targeting nothing is a dead
 * campaign — so it reads as a warning rather than a neutral count, matching
 * the dot on the card heading.
 */
function AccountsSummary({ targets }: { targets: CampaignAccountTarget[] }) {
  // Nothing to summarise, and the empty ACTIVE group says it in the place the
  // eye is already going. Two sentences about the same nothing read as two
  // problems.
  if (targets.length === 0) return null

  const postTypes = targets.reduce((n, t) => n + t.post_types.length, 0)
  const placeholders = targets.filter(
    (t) => t.account_id === PLACEHOLDER_ACCOUNT_ID,
  ).length

  return (
    <p className="mb-3 text-sm text-tertiary-foreground">
      {/* "Active", the same word the rows and their buttons use — the campaign
          has one verb for this and the summary shouldn't invent a second. */}
      {targets.length} account{targets.length === 1 ? '' : 's'} active with{' '}
      {postTypes} post type{postTypes === 1 ? '' : 's'}.
      {/* Not left to the rows: a placeholder is an active row that cannot
          publish at all, and a reader who takes the count above at face value
          would think it can. A row with no post types is the rows' own
          business — it says so on its face and again when opened, and a
          second tally up here was one warning too many for a state the user
          is usually halfway through creating. */}
      {placeholders > 0 && (
        <span className="text-warning">
          {' '}
          {placeholders} of {placeholders === 1 ? 'them has' : 'them have'} no
          account behind {placeholders === 1 ? 'it' : 'them'} yet.
        </span>
      )}
    </p>
  )
}
