import { useMemo, type JSX, type ReactNode } from 'react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { usePublishingAccount } from '@/hooks/usePublishingAccount.ts'
import { getPlatformInfo } from '@/lib/platformDictionary.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { markdownToSocialText, PLATFORM_TEXT_LIMITS } from '@/lib/socialText.ts'
import { attachmentKind, type PostAttachmentWithValidation } from '@/types/attachments'
import type { Post } from '@/types/posts'
import { FacebookPreview } from './FacebookPreview.tsx'
import { InstagramPreview } from './InstagramPreview.tsx'
import { LinkedInPreview } from './LinkedInPreview.tsx'
import type { PreviewProps } from './types.ts'

/** Platforms with a preview built. The rest fall through to a stub. */
const RENDERERS: Record<string, (props: PreviewProps) => JSX.Element> = {
  linkedin: LinkedInPreview,
  facebook: FacebookPreview,
  instagram: InstagramPreview,
}

/**
 * How many images each card renders, so the notes can say what was left out.
 * Must match what the components actually do: the feeds collapse the rest
 * behind a "+N" tile, and Instagram shows only the first frame of a carousel.
 */
const MEDIA_SHOWN: Record<string, number> = {
  linkedin: 4,
  facebook: 4,
  instagram: 1,
}

/**
 * "Preview" for the right sidebar: the post as its platform will render it.
 *
 * Approximate by construction — the networks change their feeds without
 * telling anyone, and we cannot know the viewer's device — so this is here to
 * answer the questions the editor cannot: where the text folds, which image
 * leads, and what happens to formatting the platform does not support.
 */
export function PostPreviewPanel({
  doc,
  attachments,
  onClose,
}: {
  doc: Post
  /**
   * Passed in rather than fetched: the route already holds the one
   * `usePostMedia` instance, and these carry presigned URLs that the query
   * refreshes on a timer — reading them from anywhere else risks a second,
   * separately-expiring copy.
   */
  attachments: PostAttachmentWithValidation[]
  onClose?: () => void
}) {
  const platform = getPlatformInfo(doc.platform_id)
  const author = usePublishingAccount(doc.platform_id)

  const text = useMemo(() => markdownToSocialText(doc.content), [doc.content])

  // Only images reach a feed card. PDFs are attachments the networks treat as
  // documents (LinkedIn turns one into a slide carousel), so they are counted
  // for the notes but never rendered as pictures.
  const { imageUrls, pdfCount, missingUrls } = useMemo(() => {
    const ordered = [...attachments].sort((a, b) => a.position - b.position)
    const images = ordered.filter((a) => attachmentKind(a.mime_type) === 'image')
    return {
      // `presigned_url` is absent when object storage is unconfigured — there
      // is nothing to show for those, so they are reported, not rendered.
      imageUrls: images.flatMap((a) => (a.presigned_url ? [a.presigned_url] : [])),
      pdfCount: ordered.filter((a) => attachmentKind(a.mime_type) === 'pdf').length,
      missingUrls: images.filter((a) => !a.presigned_url).length,
    }
  }, [attachments])

  // The feed timestamp reads from the schedule when there is one — seeing
  // "in 3 days" on the card is a cheap confirmation that the date is right.
  // Once published, when it actually went out is the truer answer, and both
  // fields are set by then.
  const timeLabel = relativeTime(doc.published_at ?? doc.scheduled_at) ?? 'Just now'

  const Renderer = platform ? RENDERERS[platform.zernioId] : undefined
  const limits = platform ? PLATFORM_TEXT_LIMITS[platform.zernioId] : undefined
  const shownMedia = Math.min(
    imageUrls.length,
    (platform && MEDIA_SHOWN[platform.zernioId]) ?? 0,
  )

  return (
    <RailPanel
      title="Preview"
      onClose={onClose}
      className="h-full"
    >
      {/* The platform gets its own line rather than riding the title: it is
          what the card below *is*, not a qualifier on the panel's name. */}
      {platform && (
        <div className="flex items-center gap-2">
          <platform.icon size={20} weight="fill" color={platform.color} aria-hidden />
          <span className="text-sm text-secondary-foreground">{platform.name}</span>
        </div>
      )}

      {!platform ? (
        <Note>Pick a platform for this post and its preview appears here.</Note>
      ) : !Renderer ? (
        <Note>
          No {platform.name} preview yet — LinkedIn, Facebook and Instagram are built so far.
        </Note>
      ) : (
        <>
          <Renderer
            text={text}
            mediaUrls={imageUrls}
            /* No subtitle: LinkedIn's second line is the page's own headline,
               which we do not have. The campaign name went there first and
               read as if it were public — it never is. */
            author={{
              name: author.name,
              username: author.username,
              avatarUrl: author.avatarUrl,
            }}
            timeLabel={timeLabel}
          />

          <Notes
            platformName={platform.name}
            title={doc.title}
            markdown={doc.content}
            mediaCount={imageUrls.length}
            pdfCount={pdfCount}
            missingUrls={missingUrls}
            shownMedia={shownMedia}
            overLimit={limits ? text.length > limits.max : false}
            max={limits?.max}
            accountConnected={author.connected}
          />
        </>
      )}
    </RailPanel>
  )
}

/**
 * What the preview did to the post to produce the card above.
 *
 * Every line here is a difference between what the user typed and what
 * publishes — the things a faithful-looking card would otherwise hide.
 */
function Notes({
  platformName,
  title,
  markdown,
  mediaCount,
  pdfCount,
  missingUrls,
  shownMedia,
  overLimit,
  max,
  accountConnected,
}: {
  platformName: string
  title: string
  markdown: string
  /** Attached images that have a URL to render. */
  mediaCount: number
  /** Attached PDFs, which are documents rather than feed pictures. */
  pdfCount: number
  /** Images with no presigned URL — object storage is unconfigured. */
  missingUrls: number
  /** How many of the images the card actually renders. */
  shownMedia: number
  overLimit: boolean
  max?: number
  accountConnected: boolean
}) {
  const notes: ReactNode[] = []

  if (title.trim()) {
    notes.push(
      <>
        The title is not published. {platformName} posts have no title field, so it stays in
        Ogen as the post's name.
      </>,
    )
  }

  if (looksLikeMarkdown(markdown)) {
    // The editor stores Markdown and the API flattens it on the way to the
    // network, so the card above is the published text rather than the source.
    // Worth saying once: the user typed bold and it is not going to be bold.
    notes.push(
      <>
        The formatting is not published — {platformName} captions are plain text, so bold,
        headings and lists are flattened before the post goes out. Links keep their address
        in the text, which counts toward the limit.
      </>,
    )
  }

  if (mediaCount > shownMedia) {
    notes.push(
      <>
        {shownMedia === 1
          ? `Only the first of ${mediaCount} images is shown`
          : `Only ${shownMedia} of ${mediaCount} images are shown`}
        , which is what {platformName} puts in the feed.
      </>,
    )
  }

  if (pdfCount > 0) {
    notes.push(
      <>
        {pdfCount === 1 ? 'A PDF is attached' : `${pdfCount} PDFs are attached`} and not
        drawn above — {platformName} treats documents as their own kind of post, which this
        preview does not cover.
      </>,
    )
  }

  if (missingUrls > 0) {
    notes.push(
      <>
        {missingUrls === 1 ? 'One image has' : `${missingUrls} images have`} no download link
        yet, so {missingUrls === 1 ? 'it is' : 'they are'} missing from the card — object
        storage may not be configured.
      </>,
    )
  }

  if (!accountConnected) {
    notes.push(
      <>
        No {platformName} account is connected, so the name and picture above are
        placeholders.
      </>,
    )
  }

  if (overLimit && max) {
    notes.push(
      <span className="text-destructive">
        The text is past {platformName}'s limit of {max.toLocaleString()} characters and will
        be rejected.
      </span>,
    )
  }

  notes.push(
    <>
      Everything else is an approximation — the real post depends on the reader's device and
      on whatever {platformName} changed this week.
    </>,
  )

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs text-tertiary-foreground">NOTES</h3>
      <ul className="flex flex-col gap-1.5">
        {notes.map((note, i) => (
          <li key={i} className="text-xs text-secondary-foreground">
            {note}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-tertiary-foreground">{children}</p>
}

/** Formatting that will not survive publishing — worth saying so once. */
function looksLikeMarkdown(markdown: string): boolean {
  return /(\*\*|__|~~|^\s*#{1,6}\s|\[[^\]]*\]\([^)]*\))/m.test(markdown)
}
