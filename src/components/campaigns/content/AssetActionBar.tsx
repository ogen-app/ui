import { CheckCircleIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { PageActionBar } from '@/components/page-primitives/PageActionBar'
import { wordCount } from '@/lib/assetExtent'
import { retrievability } from '@/lib/campaignSources'
import type { Asset } from '@/types/content'

type Props = {
  asset: Asset
  /** Back to the campaign that holds this document. */
  onDone: () => void
}

/**
 * The document's bottom bar, on the post editor's line (CON-210).
 *
 * It carries the same split as a post's: the top of the screen is about the
 * object and the views of it, the bottom is what you do with it. A document
 * has no status machine to advance, so where a post offers SCHEDULE this
 * offers the one commit there is — you are finished, put it back in the
 * campaign. Everything else has already been saved on its own.
 *
 * The bar is also where a document says whether it can actually be *used*,
 * which is the one thing about it the editor cannot show: the text on screen
 * is there either way, and whether retrieval will reach it is a fact about the
 * server's copy. The list page states this per row; a page you can spend ten
 * minutes writing in should not be the one place it goes unsaid.
 */
export function AssetActionBar({ asset, onDone }: Props) {
  const status = statusFor(asset)

  return (
    <PageActionBar
      // One action, always the same one — nothing for the bar to hand off to.
      contentKey="done"
      status={{
        full: <ExtentStatus text={status.full} reach={status.reach} />,
        compact: (
          <ExtentStatus text={status.compact} title={status.full} reach={status.reach} />
        ),
        key: status.full,
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-primary-foreground"
        onClick={onDone}
      >
        <CheckCircleIcon />
        <span>DONE</span>
      </Button>
    </PageActionBar>
  )
}

type Reach = ReturnType<typeof retrievability>

/**
 * How much of the document there is, and whether the campaign can read it.
 *
 * The two are stated together because either one alone misleads: a word count
 * says nothing about whether retrieval will reach the text, and "ready" over
 * an empty document is a promise about nothing. When there are no words the
 * count drops out entirely rather than being spelled as a zero — a document
 * with nothing in it has one thing to say, not two.
 */
function statusFor(asset: Asset): { full: string; compact: string; reach: Reach } {
  const reach = retrievability(asset.status)
  const count = wordCount(asset)
  const words =
    count > 0 ? `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'}` : null

  if (reach === 'waiting') {
    return {
      full: words ? `${words} · still being read` : 'Still being read',
      compact: 'Still being read',
      reach,
    }
  }
  if (reach === 'never') {
    return {
      full: words
        ? `${words} · this campaign will skip it`
        : "Nothing could be read from this document",
      compact: "Can't be read",
      reach,
    }
  }
  return {
    full: words ? `${words} · this campaign reads it` : 'Empty — nothing to read yet',
    compact: words ?? 'Empty',
    reach,
  }
}

function ExtentStatus({
  text,
  title,
  reach,
}: {
  text: string
  /** The full sentence, when `text` is the short form. */
  title?: string
  reach: Reach
}) {
  const Icon = reach === 'waiting' ? ClockIcon : WarningCircleIcon
  return (
    <span
      // Same reasoning as the post bar's: the role names the span so the long
      // sentence reaches a screen reader, but the text changes as the document
      // is typed in and announcing every count would be noise.
      role="status"
      aria-live="off"
      title={title}
      aria-label={title}
      className="flex min-w-0 items-center gap-1.5 px-1 text-xs text-tertiary-foreground"
    >
      {/* A document that reads normally gets no glyph — an icon on the
          ordinary case would make the count look like a warning. */}
      {reach !== 'ready' && <Icon className="size-4 shrink-0" />}
      <span className="truncate">{text}</span>
    </span>
  )
}
