import { useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge'
import { useAutoPublishState } from '@/hooks/useAutoPublishAllowlist'
import { useCampaign } from '@/hooks/useCampaigns'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { usePublishingAccount } from '@/hooks/usePublishingAccount'
import { PLATFORMS, getPlatformInfo } from '@/lib/platformDictionary'
import {
  canEditPublishingAccount,
  type PublishMethod,
} from '@/lib/postStatusMachine'
import { cn } from '@/lib'
import type { Post } from '@/types/posts'
import { AccountSlot } from './quickBar/AccountSlot'
import { PlatformPicker, PostTypePicker } from './quickBar/ChannelPickers'
import { PublishMethodPicker } from './quickBar/PublishMethodPicker'
import { SchedulingDetails } from './quickBar/SchedulingLine'
import { Dot } from './quickBar/parts'

type Props = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  cancelling: boolean
  /**
   * Bumped by the header when a blocked status action is clicked. Each new
   * value flashes the bar — see the outline/shake below — because the fields
   * that block the transition all live in here.
   */
  attention?: number
  publishMethod: PublishMethod
  onPublishMethodChange: (method: PublishMethod) => void
  /**
   * Opens the "where did you publish it?" dialog. The only way back into
   * verification once a post is `published`: that status is terminal, so the
   * header has no button to offer (CON-149).
   */
  onAddPostLink: () => void
  className?: string
}

/** How long the attention flash runs. Matches the `attention-flash` keyframes. */
const ATTENTION_MS = 1500

/**
 * The card above the post editor. Line 1: when and how it publishes, next to
 * the status badge. Line 2: the platform / post type pickers (autosaving
 * through `changeDoc`) and the connected publishing account.
 *
 * Validation is inline — no separate checklist: a missing/past publish
 * date warns on line 1, a deselected platform warns on its own trigger,
 * and a platform without a connected account warns in the account slot.
 * The pickers only offer what the campaign allows, plus a deselect option.
 *
 * Everything here is editable in place — the date, the time and the publish
 * method all open pickers — so a post can be scheduled without opening the
 * settings rail. The status badge is read-only: moving between statuses is
 * the header's job.
 *
 * What stays in this file is the two lines and the wiring: which controls
 * appear, in what order, against which reads of the campaign and the platform
 * list. Each control's own behaviour lives beside it in `quickBar/` — they
 * share the bar's grammar (`quickBar/parts.tsx`) rather than each other's
 * internals, so the ordering above can be read without them.
 */
export function PostQuickSettingsBar({
  doc,
  changeDoc,
  cancelling,
  attention = 0,
  publishMethod,
  onPublishMethodChange,
  onAddPostLink,
  className,
}: Props) {
  const platform = getPlatformInfo(doc.platform_id)
  const { data: campaign, isLoading: campaignPending } = useCampaign(
    doc.campaign_id,
  )
  // The same source the route resolves the method against, so the two can't
  // disagree. `unknown` holds the picker: "manual publish" is a promise about
  // what happens to this post, and it waits until we can keep it.
  const autoPublish = useAutoPublishState(doc.platform_id)
  const views = usePlatformViews()
  const flashing = useAttentionFlash(attention)

  // platform id → post-type slugs enabled on this campaign.
  const campaignPostTypes = useMemo(
    () =>
      new Map(
        (campaign?.target_platforms ?? []).map((tp) => [
          tp.id,
          new Set(tp.post_types),
        ]),
      ),
    [campaign],
  )
  // platform id → post-type slugs a CONNECTED publisher supports.
  const connectedPostTypes = useMemo(
    () =>
      new Map(
        views.map((v) => [
          v.platform.id,
          new Set(v.available.map((pt) => pt.slug)),
        ]),
      ),
    [views],
  )

  // While it is loading the triggers are disabled (`campaignPending` below),
  // so the unfiltered fallback is what an *errored* campaign leaves behind —
  // an over-wide menu beats no menu once there is nothing left to wait for.
  const campaignPlatforms = campaign
    ? PLATFORMS.filter((p) => (campaignPostTypes.get(p.id)?.size ?? 0) > 0)
    : PLATFORMS
  const campaignTypes = (platform?.postTypes ?? []).filter(
    (t) =>
      !campaign ||
      (campaignPostTypes.get(doc.platform_id)?.has(t.slug) ?? false),
  )

  // The publishing account comes from the backend: one of the connected
  // publisher's accounts for the attached platform, not the app user. Shared
  // with the preview panel, which has to render as that same account.
  const account = usePublishingAccount(
    doc.platform_id,
    doc.social_account_id,
    doc.social_account,
  )

  const selectAccount = (accountId: string) => {
    if (accountId === doc.social_account_id) return
    changeDoc((d) => {
      d.social_account_id = accountId
    })
  }

  const selectPlatform = (platformId: string) => {
    if (platformId === doc.platform_id) return
    changeDoc((d) => {
      d.platform_id = platformId
      // The account belongs to the platform it was picked under, so it
      // never survives the move — keeping it would send the server an
      // `account_platform_mismatch` on the next schedule.
      d.social_account_id = ''
      if (!platformId) {
        // A post type without a platform is meaningless.
        d.platform_post_type = ''
        return
      }
      // Keep the post type when the new platform supports the same slug,
      // otherwise prefer the campaign's first enabled type for it. Both
      // sides read the selectable list, so switching platforms can never
      // land the post on a video type the picker would not have offered.
      const next = getPlatformInfo(platformId)
      const types = next?.postTypes ?? []
      if (next && !types.some((t) => t.slug === d.platform_post_type)) {
        const camp = campaignPostTypes.get(platformId)
        const preferred = types.find((t) => camp?.has(t.slug)) ?? types[0]
        d.platform_post_type = preferred?.slug ?? ''
      }
    })
  }

  const selectPostType = (slug: string) => {
    if (slug === doc.platform_post_type) return
    changeDoc((d) => {
      d.platform_post_type = slug
    })
  }

  const setScheduledAt = (iso: string | null) => {
    changeDoc((d) => {
      d.scheduled_at = iso
    })
  }

  return (
    <div
      className={cn(
        'w-full bg-primary px-10 py-4 flex flex-col gap-3',
        // Blocked-action feedback: shake, then the ring fades out. Defined
        // in index.css because the ring's colour is animated, and it uses
        // `outline` rather than `border` so the bar never reflows.
        flashing && 'animate-attention',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* text-sm, like the row below: the bare Dot inherits the card's
            24px line-height otherwise and makes this row 4px taller than
            its 20px siblings. */}
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <SchedulingDetails
            post={doc}
            cancelling={cancelling}
            onChange={setScheduledAt}
            onAddPostLink={onAddPostLink}
          />
          {/* Only where the fork is still ahead of the post. Once it's
              scheduled the status itself records which way it went, and
              SchedulingDetails spells it out ("Auto-publishes …"). */}
          {(doc.status === 'draft' || doc.status === 'ready_for_publish') && (
            <>
              <Dot />
              {autoPublish === 'unknown' ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <PublishMethodPicker
                  method={publishMethod}
                  onChange={onPublishMethodChange}
                  platformName={platform?.name ?? null}
                  hasAccount={account.connected}
                  autoAllowed={autoPublish === 'allowed'}
                />
              )}
            </>
          )}
        </span>
        {/* flex, not a plain block: the badge is inline-flex, so a block
            parent gives it a line box at the bar's 24px line-height and the
            row renders 24.5px against its 20px siblings. */}
        <div className="shrink-0 flex items-center">
          <PostStatusBadge
            status={doc.status}
            className="text-sm text-primary-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-sm">
        <PlatformPicker
          platform={platform}
          platforms={campaignPlatforms}
          disabled={campaignPending}
          onSelect={selectPlatform}
        />

        {/* Post types are a property of the platform, so there is nothing to
            choose from until one is picked — the slot is hidden rather than
            shown disabled next to its own warning. The account slot follows
            the same rule for the same reason. */}
        {platform && (
          <>
            <Dot />
            <PostTypePicker
              platform={platform}
              selected={doc.platform_post_type}
              types={campaignTypes}
              connectedSlugs={
                connectedPostTypes.get(doc.platform_id) ?? EMPTY_SLUGS
              }
              disabled={campaignPending}
              onSelect={selectPostType}
            />
            <Dot />
            <AccountSlot
              account={account}
              platformName={platform.name}
              editable={canEditPublishingAccount(doc.status)}
              onSelect={selectAccount}
            />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Stands in for a platform with no connected post types — a shared frozen
 * value rather than a fresh `new Set()` per render, which would be a changed
 * prop on every keystroke of the autosave.
 */
const EMPTY_SLUGS: ReadonlySet<string> = new Set()

/**
 * Holds a flash on for ATTENTION_MS each time `attention` changes. The
 * counter (not a boolean) is what lets a second blocked click re-trigger
 * the animation while the first is still running.
 */
function useAttentionFlash(attention: number): boolean {
  const [flashing, setFlashing] = useState(false)
  const seen = useRef(attention)

  useEffect(() => {
    if (attention === seen.current) return
    seen.current = attention
    setFlashing(false)
    // Two frames: drop the class, let the browser paint, then re-add it so
    // the animation restarts from the top on a repeat click.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlashing(true))
    })
    const timer = setTimeout(() => setFlashing(false), ATTENTION_MS + 50)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [attention])

  return flashing
}
