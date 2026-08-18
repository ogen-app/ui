import { ArrowsClockwiseIcon, WarningIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { pageUrlLabel } from '@/lib/webPageUrl'

type Props = {
  /** Where the document is being read from. */
  sourceUrl: string
  /** True once the scrape has given up. */
  failed: boolean
  onRetry: () => void
  /** A retry is already in flight. */
  retrying: boolean
}

/**
 * What a scraped page shows instead of itself, while it has nothing to show
 * (CON-222).
 *
 * The alternative is the editor with an empty body, which is worse than
 * uninformative: an empty document that autosaves is a document you can type
 * into and then lose, because the scrape lands on top of whatever is there. So
 * the editor doesn't mount until there is something to edit — which also means
 * it mounts *with* the finished text, rather than having to be told about it
 * (`AssetEditor` reads its content once, on mount).
 *
 * The failure copy names the two causes worth acting on and stops. We don't
 * have the worker's own message here: the error rides the `asset.updated`
 * event, and `GET /assets/:id` has no field for it — a deliberate omission
 * upstream, not something to work around by holding event payloads in a store.
 */
export function ScrapeState({ sourceUrl, failed, onRetry, retrying }: Props) {
  const label = pageUrlLabel(sourceUrl)

  if (failed) {
    return (
      <Frame>
        <WarningIcon className="size-8 text-destructive" />
        <h2 className="font-display text-2xl/8 font-medium text-foreground">
          We couldn't read this page
        </h2>
        <p className="text-sm text-tertiary-foreground">
          {label} either isn't there any more or won't let a reader in. Try again,
          or delete this and paste a different link.
        </p>
        <Button variant="outline" onClick={onRetry} loading={retrying}>
          <ArrowsClockwiseIcon />
          <span>TRY AGAIN</span>
        </Button>
      </Frame>
    )
  }

  return (
    <Frame>
      <Spinner tone="onSurface" className="w-32" />
      <h2 className="font-display text-2xl/8 font-medium text-foreground">
        Reading {label}
      </h2>
      <p className="text-sm text-tertiary-foreground">
        {/* The wait is a worker's, not this tab's — worth saying, because the
            instinct with a spinner is to sit and watch it. */}
        This takes up to a minute. You can leave — the page fills in here on its
        own, and the campaign can use it as soon as it does.
      </p>
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-content flex-col items-center gap-4 bg-primary px-10 py-16 text-center">
      {children}
    </div>
  )
}
