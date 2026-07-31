import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LightningIcon, ProhibitIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAutoPublishState,
  useToggleAutoPublish,
} from '@/hooks/useAutoPublishAllowlist'
import { useConvertToManualPublish } from '@/hooks/useConvertToManualPublish'
import type { PlatformView } from '@/lib/platformDictionary'
import { listPosts } from '@/services/api/posts'
import { toast } from '@/stores/toastStore'
import type { Post } from '@/types/posts'

/**
 * Posts this platform will publish on its own if nothing is done.
 *
 * `scheduled` is the auto-publish status, and the Zernio job for each is
 * already enqueued — the allowlist is only consulted when a post is
 * *scheduled*, so switching it off changes nothing about work already in
 * flight. That is the whole reason this control asks before switching off:
 * without it, the setting would read "not allowed" while posts kept going out.
 */
function pendingAutoPosts(posts: Post[], platformId: string, now: number): Post[] {
  return posts
    .filter(
      (p) =>
        p.platform_id === platformId &&
        p.status === 'scheduled' &&
        p.scheduled_at !== null &&
        new Date(p.scheduled_at).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime(),
    )
}

export function AutoPublishControl({ view }: { view: PlatformView }) {
  const { platform, info } = view
  const queryClient = useQueryClient()
  const { toggle, isPending } = useToggleAutoPublish()
  // Read here rather than passed in: the sentence and the button are two
  // halves of one state, and `unknown` has to reach both. Worse than looking
  // wrong, a click on ALLOW before the list lands would write this platform
  // over the stored one, since the toggle replaces the whole thing.
  const state = useAutoPublishState(platform.id)
  const allowed = state === 'allowed'

  const [checking, setChecking] = useState(false)
  const [affected, setAffected] = useState<Post[] | null>(null)

  const handleChange = async (next: boolean) => {
    // Switching on is safe and immediate: it only widens what a *future*
    // schedule may do, and touches nothing already scheduled.
    if (next) {
      try {
        await toggle(info.zernioId, true)
      } catch (e) {
        toast.error(`Unable to allow auto-publishing for ${info.name}`, {
          description: e instanceof Error ? e.message : undefined,
        })
      }
      return
    }

    setChecking(true)
    try {
      // Fetched rather than read from a cache: this spans every campaign, and
      // the per-campaign post queries only cover whatever the user has opened.
      const posts = await queryClient.fetchQuery({
        queryKey: ['posts'],
        queryFn: listPosts,
      })
      const pending = pendingAutoPosts(posts, platform.id, Date.now())
      if (pending.length === 0) {
        await toggle(info.zernioId, false)
        return
      }
      setAffected(pending)
    } catch (e) {
      toast.error(`Unable to check ${info.name}'s scheduled posts`, {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
    {/* A button rather than a switch: the two directions are not equivalent.
        Switching off has to reckon with posts already queued with the
        publisher, so it can open a dialog and take time — a toggle that
        sometimes flips back after a round trip would misreport the state it
        is supposed to show. The sentence states the state; the button
        changes it. */}
    <div className="flex flex-col items-start gap-3">
      {state === 'unknown' ? (
        <>
          <Skeleton className="h-5 w-full max-w-lg" />
          <Skeleton className="h-12 w-36" />
        </>
      ) : (
        <>
          <p className="text-sm text-primary-foreground">
            {allowed
              ? 'Auto-publishing allowed — scheduled posts go out on their own, across every campaign.'
              : 'Auto-publishing not allowed — scheduled posts wait for you to publish them by hand.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="xl"
            disabled={isPending || checking}
            loading={checking}
            onClick={() => handleChange(!allowed)}
          >
            {allowed ? <ProhibitIcon /> : <LightningIcon />}
            <span>{allowed ? 'DISALLOW' : 'ALLOW'}</span>
          </Button>
        </>
      )}
    </div>

      {affected && (
        <PendingPostsDialog
          platformName={info.name}
          posts={affected}
          onClose={() => setAffected(null)}
          onConverted={async () => {
            await toggle(info.zernioId, false)
            setAffected(null)
          }}
        />
      )}
    </>
  )
}

/**
 * Asks what should happen to posts that are already queued to publish on
 * their own. Both answers are spelled out rather than left to a bare
 * confirm/cancel: "switch off" alone would not say whether the queued posts
 * go out or not, which is the only thing the user actually cares about here.
 */
function PendingPostsDialog({
  platformName,
  posts,
  onClose,
  onConverted,
}: {
  platformName: string
  posts: Post[]
  onClose: () => void
  /** Runs once every post has been dealt with, to flip the allowlist. */
  onConverted: () => Promise<void>
}) {
  const count = posts.length
  const { convert, progress } = useConvertToManualPublish()
  const running = progress !== null && progress.done < progress.total

  const handleConvert = async () => {
    const result = await convert(posts)
    if (result.failed.length > 0) {
      toast.error(
        `${result.failed.length} of ${count} post${count === 1 ? '' : 's'} could not be converted`,
        {
          description:
            'They are still scheduled to auto-publish. Auto-publishing was left on.',
        },
      )
      return
    }
    await onConverted()
    toast.success(
      `${count} post${count === 1 ? '' : 's'} moved to manual publishing`,
    )
  }

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      title={`${platformName} has ${count} post${count === 1 ? '' : 's'} queued to publish`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          Turning auto-publishing off only changes how posts are scheduled from now on.
          {count === 1 ? ' This post is' : ' These posts are'} already queued with the
          publisher and will still go out unless{' '}
          {count === 1 ? 'it is' : 'they are'} converted.
        </p>

        <ul className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {posts.map((p) => (
            <li key={p.id} className="text-sm text-primary-foreground">
              {p.title?.trim() || 'Untitled post'}
              <span className="text-tertiary-foreground">
                {' · '}
                {p.scheduled_at
                  ? new Date(p.scheduled_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'no date'}
              </span>
            </li>
          ))}
        </ul>

        {running && (
          <p className="text-sm text-secondary-foreground">
            Converting {progress.done} of {progress.total} — each post has to be
            unqueued with the publisher first. Leave this open until it finishes.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="uppercase"
            onClick={onClose}
            disabled={running}
          >
            Keep auto-publishing
          </Button>
          <Button
            type="button"
            className="uppercase"
            onClick={handleConvert}
            loading={running}
          >
            Switch {count === 1 ? 'it' : `all ${count}`} to manual
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
