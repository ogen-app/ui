import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import type { TransitionStatusResult, VerifyExternalResult } from '@/hooks/usePost'
import { toast } from '@/stores/toastStore'
import type { Post } from '@/types/posts'

type Props = {
  post: Post
  isOpen: boolean
  onClose: () => void
  verifyExternal: (url: string) => Promise<VerifyExternalResult>
  /**
   * The way out when the link can't be supplied: publishes via a plain
   * status PUT, unverified. Omitted for a post that is already `published`
   * — there the dialog only adds a missing link, so there is nothing to
   * fall back to.
   */
  onSkip?: () => Promise<TransitionStatusResult>
}

/** What the dialog is currently showing. */
type Stage =
  | { kind: 'input' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }

/**
 * Loose on purpose. The platforms accept a wide spread of URL shapes
 * (`youtu.be/…`, `vm.tiktok.com/…`, `instagram.com/reel/…`) and Zernio does
 * the real resolution — anything stricter here would reject links the server
 * would have matched. All this catches is "that isn't a link at all".
 */
function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Asks for the URL a post was published at, and hands it to the server to
 * match against the platform (CON-149).
 *
 * This is not a form that records a link for later — it is how a manual
 * publish completes. The server looks the URL up through Zernio, and only a
 * post that really exists there flips to `published` with its analytics
 * linkage attached. Publishing without the link stays possible (`onSkip`)
 * because Zernio cannot verify every platform — LinkedIn personal accounts
 * have no listing API at all — and a user who genuinely posted should never
 * be stuck behind a field they can't fill.
 */
export function PublishedUrlDialog({
  post,
  isOpen,
  onClose,
  verifyExternal,
  onSkip,
}: Props) {
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>({ kind: 'input' })
  const [verifying, setVerifying] = useState(false)
  const [skipping, setSkipping] = useState(false)

  // Reopening is a fresh attempt: a stale "we couldn't find that post" from
  // last time would read as a verdict on the URL not yet typed.
  useEffect(() => {
    if (!isOpen) return
    setUrl('')
    setStage({ kind: 'input' })
    setVerifying(false)
    setSkipping(false)
  }, [isOpen])

  // An already-published post is here to fill in a link it never got, not to
  // publish — the wording and the way out both change.
  const alreadyPublished = post.status === 'published'
  const platformName = post.platform?.name?.trim()
  const busy = verifying || skipping
  const canSubmit = looksLikeUrl(url) && !busy

  const handleVerify = async () => {
    if (!canSubmit) return
    setVerifying(true)
    setStage({ kind: 'input' })
    const result = await verifyExternal(url.trim())
    setVerifying(false)
    if (result.ok) {
      toast.success(alreadyPublished ? 'Post link added' : 'Post marked as published')
      onClose()
      return
    }
    setStage(
      result.reason === 'not_found'
        ? { kind: 'notFound' }
        : { kind: 'error', message: result.error },
    )
  }

  const handleSkip = async () => {
    if (!onSkip) {
      onClose()
      return
    }
    setSkipping(true)
    const result = await onSkip()
    setSkipping(false)
    if (result.ok) {
      toast.success('Post marked as published')
      onClose()
      return
    }
    toast.error('Unable to mark the post as published', {
      description: result.error,
    })
  }

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={alreadyPublished ? 'Add the post link' : 'Where did you publish it?'}
      size="small"
      closeOnBackdropClick={!busy}
      closeOnEscape={!busy}
    >
      <form
        noValidate
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault()
          void handleVerify()
        }}
        className="flex flex-col gap-4"
      >
        <p className="text-sm text-secondary-foreground">
          {alreadyPublished ? (
            <>
              Paste the link to this post{platformName ? ` on ${platformName}` : ''}{' '}
              and we'll match it up, so its performance shows up in Ogen.
            </>
          ) : (
            <>
              Paste the link to the post you just published
              {platformName ? ` on ${platformName}` : ''}. We'll check it's really
              there before marking this one as published — and it's what lets us
              track how it performs.
            </>
          )}
        </p>

        <div className="flex flex-col gap-2">
          <Label htmlFor="published-url">Post link</Label>
          <Input
            id="published-url"
            name="published-url"
            type="url"
            inputMode="url"
            autoFocus
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            aria-invalid={stage.kind !== 'input' || undefined}
            aria-describedby={stage.kind === 'input' ? undefined : 'published-url-problem'}
          />
          {/*
            Both problems are answered in place, with the field still filled
            in: a mistyped link is the likeliest cause of either, and a toast
            would take the explanation away from the thing that needs fixing.
          */}
          {stage.kind === 'notFound' && (
            <p id="published-url-problem" className="text-sm text-destructive">
              We couldn't find that post{platformName ? ` on ${platformName}` : ''}.
              Check the link is the published post itself and try again — a
              just-published post can also take a moment to show up.
            </p>
          )}
          {stage.kind === 'error' && (
            <p id="published-url-problem" className="text-sm text-destructive">
              {stage.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {alreadyPublished ? (
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              CANCEL
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleSkip()}
              disabled={verifying}
              loading={skipping}
            >
              I DON'T HAVE THE LINK
            </Button>
          )}
          <Button type="submit" disabled={!canSubmit} loading={verifying}>
            {alreadyPublished ? 'ADD LINK' : 'CONFIRM PUBLISHED'}
          </Button>
        </div>
      </form>
    </ModalContainer>
  )
}
