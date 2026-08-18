import { useEffect, useRef, useState } from 'react'
import { GlobeSimpleIcon } from '@phosphor-icons/react'
import { ModalContainer } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateUrlAsset } from '@/hooks/useContent'
import { readPageErrorMessage } from '@/lib/scrapeErrors'
import { checkPageUrl } from '@/lib/webPageUrl'
import type { Asset } from '@/types/content'

type Props = {
  isOpen: boolean
  onClose: () => void
  /**
   * The asset the backend created (or re-queued), before it has any content.
   * The page decides what happens next — attaching it to the campaign, and
   * saying which of the two it was.
   */
  onSubmitted: (asset: Asset) => void
}

/**
 * Paste a link, get the page as a document (CON-222).
 *
 * Deliberately a one-field modal with no options. The backend has a scrape it
 * runs and no knobs on it — no format choice, no "include images", no crawl
 * depth — so anything else here would be decoration over a single decision:
 * which page.
 *
 * It closes the moment the request is accepted rather than waiting for the
 * scrape. Reading a page takes seconds to a minute, and a modal held open for
 * it is a modal that stops the user doing the next thing; the row in the list
 * behind it already reports progress, and the broadcast stream keeps it honest.
 */
export function AddWebPageModal({ isOpen, onClose, onSubmitted }: Props) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const submit = useCreateUrlAsset()

  // A modal that keeps the last URL — and the last refusal — is a modal that
  // opens mid-conversation.
  useEffect(() => {
    if (!isOpen) return
    setUrl('')
    setError(null)
    submit.reset()
    // `autoFocus` is not enough here: one way in is a Radix dropdown item, and
    // Radix hands focus back to its trigger as the menu closes — which happens
    // after this mounts. Claiming the field a frame later lands after that.
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
    // `submit` is a new object on every render; only the open/close edge matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const checked = checkPageUrl(url)
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    setError(null)
    submit.mutate(checked.url, {
      onSuccess: (asset) => {
        onSubmitted(asset)
        onClose()
      },
      onError: (err) => setError(readPageErrorMessage(err)),
    })
  }

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} title="Add a web page">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <p className="text-sm text-tertiary-foreground">
          We read the page and save its text and images here as a document, so
          this campaign can write from it. Submitting a page you already saved
          replaces it with the current version.
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex h-10 items-center gap-2 border-b-2 border-quaternary bg-input-secondary px-3">
            <GlobeSimpleIcon className="size-4 shrink-0 text-secondary-foreground" />
            <Input
              ref={inputRef}
              variant="search"
              inputSize="default"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              placeholder="https://example.com/article"
              aria-label="Page address"
              aria-invalid={error !== null}
              className="px-0"
            />
          </div>
          {error !== null && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submit.isPending} disabled={url.trim() === ''}>
            Add page
          </Button>
        </div>
      </form>
    </ModalContainer>
  )
}
