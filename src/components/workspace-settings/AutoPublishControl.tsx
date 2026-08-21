import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { formatDate } from '@/lib/intl'
import { cn } from '@/lib'
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
  const { t } = useTranslation()
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
      // A refused write reports itself through the mutation-cache default
      // (CON-164); the catch is only here so the rejection doesn't escape as
      // an unhandled promise.
      await toggle(info.zernioId, true).catch(() => {})
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
        // Caught separately from the lookup below: a refused toggle is not a
        // failure to *check*, and it already reports itself.
        await toggle(info.zernioId, false).catch(() => {})
        return
      }
      setAffected(pending)
    } catch (e) {
      toast.error(t('workspaceSettings.autoPublish.checkFailed', { platform: info.name }), {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
    {/* Framed rather than stacked in with the row's other fields: this is the
        one setting here that decides whether posts leave the workspace without
        a person present, and it used to read as another line of prose between
        the account list and the cadence. The border carries it — green only
        while the posts publish themselves — over a transparent fill, so the
        frame marks the setting out without turning it into a second card.

        A button rather than a switch: the two directions are not equivalent.
        Switching off has to reckon with posts already queued with the
        publisher, so it can open a dialog and take time — a toggle that
        sometimes flips back after a round trip would misreport the state it
        is supposed to show. The sentence states the state; the button
        changes it. */}
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 border-1 px-4 py-4',
        allowed ? 'border-positive' : 'border-border',
      )}
    >
      {state === 'unknown' ? (
        <>
          <Skeleton className="h-5 w-full max-w-lg" />
          <Skeleton className="h-12 w-36" />
        </>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            {allowed ? (
              <LightningIcon className="size-5 shrink-0 text-positive" />
            ) : (
              <ProhibitIcon className="size-5 shrink-0 text-tertiary-foreground" />
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-medium text-primary-foreground">
                {allowed
                  ? t('workspaceSettings.autoPublish.allowedTitle')
                  : t('workspaceSettings.autoPublish.blockedTitle')}
              </p>
              <p className="text-sm text-tertiary-foreground">
                {allowed
                  ? t('workspaceSettings.autoPublish.allowedBody')
                  : t('workspaceSettings.autoPublish.blockedBody')}
              </p>
            </div>
          </div>
          {/* Only the switching-on direction carries an icon. DISALLOW is the
              one that can queue work and open a dialog, so it stays the
              plainer of the two rather than being dressed up to match. */}
          <Button
            type="button"
            variant="ghost"
            size="xl"
            disabled={isPending || checking}
            loading={checking}
            onClick={() => handleChange(!allowed)}
          >
            {!allowed && <LightningIcon />}
            <span>
              {allowed
                ? t('workspaceSettings.autoPublish.disallow')
                : t('workspaceSettings.autoPublish.allow')}
            </span>
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
            // Was unguarded: a rejection here skipped the close *and* went
            // unhandled, so switching off silently did nothing. The toast now
            // comes from the mutation-cache default.
            await toggle(info.zernioId, false).catch(() => {})
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
  const { t, i18n } = useTranslation()
  const count = posts.length
  const { convert, progress } = useConvertToManualPublish()
  const running = progress !== null && progress.done < progress.total

  const handleConvert = async () => {
    const result = await convert(posts)
    if (result.failed.length > 0) {
      toast.error(
        t('workspaceSettings.autoPublish.pending.convertFailed', {
          count,
          failed: result.failed.length,
        }),
        {
          description: t('workspaceSettings.autoPublish.pending.convertFailedDetail'),
        },
      )
      return
    }
    await onConverted()
    toast.success(t('workspaceSettings.autoPublish.pending.converted', { count }))
  }

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      title={t('workspaceSettings.autoPublish.pending.title', {
        count,
        platform: platformName,
      })}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {t('workspaceSettings.autoPublish.pending.body', { count })}
        </p>

        <ul className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {posts.map((p) => (
            <li key={p.id} className="text-sm text-primary-foreground">
              {p.title?.trim() || t('workspaceSettings.autoPublish.pending.untitledPost')}
              <span className="text-tertiary-foreground">
                {' · '}
                {/* The active language, not the browser's: the rest of the
                    line is translated, so the date should agree with it. */}
                {formatDate(
                  p.scheduled_at,
                  { dateStyle: 'medium', timeStyle: 'short' },
                  i18n.language,
                ) ?? t('workspaceSettings.autoPublish.pending.noDate')}
              </span>
            </li>
          ))}
        </ul>

        {running && (
          <p className="text-sm text-secondary-foreground">
            {t('workspaceSettings.autoPublish.pending.progress', {
              done: progress.done,
              total: progress.total,
            })}
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
            {t('workspaceSettings.autoPublish.pending.keep')}
          </Button>
          <Button
            type="button"
            className="uppercase"
            onClick={handleConvert}
            loading={running}
          >
            {t('workspaceSettings.autoPublish.pending.convert', { count })}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
