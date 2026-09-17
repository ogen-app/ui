import { SwapIcon } from '@phosphor-icons/react'

import { AccountAvatar } from '@/components/ui/account-avatar'
import { Button } from '@/components/ui/button'
import type { PlatformInfo } from '@/lib/platformDictionary'
import { accountLabel } from '@/lib/publishingAccount'
import type { PublisherAccount } from '@/types/campaigns'
import { GroupLabel } from './parts'

/**
 * The swap a connected account offers an active placeholder.
 *
 * Deliberately an offer and not a migration: the campaign said "post to
 * Facebook" before anyone connected a page, and quietly resolving that to
 * whichever page turned up would publish to an audience nobody chose. Accepting
 * carries the placeholder's post types across, so the row keeps everything but
 * its anonymity.
 *
 * It lives inside the expanded region rather than on the row because it is only
 * ever true of a targeted placeholder, and it has to sit above the switches it
 * is about to move.
 *
 * Presented as a heading over ordinary account rows rather than as a notice:
 * the accounts are the point, and drawing them the way the card draws every
 * other account — round avatar, platform badge, name over platform — is what
 * says they are the same kind of thing as the rows above. No warning colour;
 * this is something the user has gained, not something wrong. A rule under it
 * keeps it from reading as the first two entries of the post-type list.
 */
export function SupersedeOffer({
  accounts,
  platform,
  onSupersede,
}: {
  accounts: PublisherAccount[]
  platform: PlatformInfo
  onSupersede: (account: PublisherAccount) => void
}) {
  return (
    // The rule is drawn by the block's own bottom edge, inset to the content
    // it is separating rather than run to the card's edges — a full-bleed line
    // would cut the row in half instead of ending a section inside it.
    <div className="ml-16 mr-5 mb-2 border-b border-border pb-2">
      <GroupLabel>
        {accounts.length === 1 ? 'AVAILABLE ACCOUNT' : 'AVAILABLE ACCOUNTS'}
      </GroupLabel>
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between gap-3 py-1"
        >
          <AccountIdentity account={account} platform={platform} />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onSupersede(account)}
            aria-label={`Use ${accountLabel(account)} instead of the placeholder`}
          >
            {/* Literal caps, not `uppercase` — the caps are the copy. The
                glyph is a swap, which is what this does: the placeholder
                leaves as the account arrives, carrying its post types. */}
            <span>USE</span>
            <SwapIcon />
          </Button>
        </div>
      ))}
    </div>
  )
}

/**
 * An offered account, drawn exactly as an account row draws itself: round
 * avatar with the platform badged on it, name over the platform's name.
 *
 * The badge repeats what the row it sits in already says, and it stays anyway —
 * the point of this block is that these are the same objects as the rows above,
 * and dropping a piece of the identity to save a repetition would make them
 * look like something lesser.
 *
 * No post-type count, which is the one thing an account row carries that this
 * doesn't: nothing has been decided about these yet.
 */
function AccountIdentity({
  account,
  platform,
}: {
  account: PublisherAccount
  platform: PlatformInfo
}) {
  const name = accountLabel(account)
  return (
    <div className="min-w-0 flex items-center gap-3">
      <AccountAvatar
        src={account.avatar_url}
        name={name}
        platform={platform}
        size="md"
      />
      <div className="min-w-0 flex flex-col">
        <span className="truncate text-base font-semibold text-primary-foreground">
          {name}
        </span>
        <span className="truncate text-xs text-tertiary-foreground">
          {platform.name}
        </span>
      </div>
    </div>
  )
}
