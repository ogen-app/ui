import { useMemo, type JSX, type ReactNode } from 'react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { usePublishingAccount } from '@/hooks/usePublishingAccount.ts'
import { getPlatformInfo } from '@/lib/platformDictionary.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { useCharLimit } from '@/hooks/useCharLimit'
import { markdownToSocialText } from '@/lib/socialText.ts'
import { attachmentKind, type PostAttachmentWithValidation } from '@/types/attachments'
import type { Post } from '@/types/posts'
import { FacebookPreview } from './FacebookPreview.tsx'
import { InstagramPreview } from './InstagramPreview.tsx'
import { LinkedInPreview } from './LinkedInPreview.tsx'
import { YouTubePreview } from './YouTubePreview.tsx'
import type { PreviewMediaItem, PreviewProps } from './types.ts'

/** Platforms with a preview built. The rest fall through to a stub. */
const RENDERERS: Record<string, (props: PreviewProps) => JSX.Element> = {
  linkedin: LinkedInPreview,
  facebook: FacebookPreview,
  instagram: InstagramPreview,
  youtube: YouTubePreview,
}

/**
 * How many *images* each card renders, so the notes can say what was left out.
 * Must match what the components actually do: the feeds collapse the rest
 * behind a "+N" tile, and Instagram shows only the first frame of a carousel.
 *
 * Images only, on purpose. A video is one video — "1 of 4 shown" is a
 * statement about a gallery, and applying it to a video post would invent a
 * truncation that never happened.
 */
const IMAGES_SHOWN: Record<string, number> = {
  linkedin: 4,
  facebook: 4,
  instagram: 1,
  youtube: 1,
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
  // Renders as the account the post actually publishes as — including a
  // disconnected one on a post that already went out, which is the only
  // honest byline for it.
  const author = usePublishingAccount(
    doc.platform_id,
    doc.social_account_id,
    doc.social_account,
  )

  const text = useMemo(() => markdownToSocialText(doc.content), [doc.content])

  // Images and video reach a feed card; video as its poster frame, which is
  // what the networks show before playback anyway. PDFs are attachments the
  // networks treat as documents (LinkedIn turns one into a slide carousel),
  // so they are counted for the notes but never rendered as pictures.
  const { media, pdfCount, missingImages, missingPosters } = useMemo(() => {
    const ordered = [...attachments].sort((a, b) => a.position - b.position)
    // `presigned_url` is absent when object storage is unconfigured, and a
    // video's poster is absent when the render failed — there is nothing to
    // show for those, so they are reported, not rendered.
    const shownUrl = (a: PostAttachmentWithValidation) =>
      attachmentKind(a.mime_type) === 'video' ? a.thumbnail_url : a.presigned_url
    const pictures = ordered.filter((a) => {
      const kind = attachmentKind(a.mime_type)
      return kind === 'image' || kind === 'video'
    })
    return {
      media: pictures.flatMap<PreviewMediaItem>((a) => {
        const url = shownUrl(a)
        if (!url) return []
        const kind = attachmentKind(a.mime_type) === 'video' ? 'video' : 'image'
        return [{ url, kind, durationMs: a.duration_ms }]
      }),
      pdfCount: ordered.filter((a) => attachmentKind(a.mime_type) === 'pdf').length,
      // Counted apart because they mean different things: an image with no
      // link is storage misconfigured, a video with no poster is the render
      // that never ran. Telling the user to check object storage when the
      // video service is what is down sends them to the wrong place.
      missingImages: pictures.filter(
        (a) => attachmentKind(a.mime_type) !== 'video' && !shownUrl(a),
      ).length,
      missingPosters: pictures.filter(
        (a) => attachmentKind(a.mime_type) === 'video' && !shownUrl(a),
      ).length,
    }
  }, [attachments])

  // The feed timestamp reads from the schedule when there is one — seeing
  // "in 3 days" on the card is a cheap confirmation that the date is right.
  // Once published, when it actually went out is the truer answer, and both
  // fields are set by then.
  const timeLabel = relativeTime(doc.published_at ?? doc.scheduled_at) ?? 'Just now'

  const Renderer = platform ? RENDERERS[platform.zernioId] : undefined
  // The same server-resolved ceiling the Validations panel measures against,
  // so the two never disagree about whether the copy fits.
  const { limit, titleLimit, ready: limitsReady } = useCharLimit(
    doc.platform_id,
    doc.platform_post_type,
  )
  const imageCount = media.filter((m) => m.kind === 'image').length
  const shownImages = Math.min(
    imageCount,
    (platform && IMAGES_SHOWN[platform.zernioId]) ?? 0,
  )
  const videoCount = media.filter((m) => m.kind === 'video').length

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
          No {platform.name} preview yet — LinkedIn, Facebook, Instagram and YouTube are
          built so far.
        </Note>
      ) : (
        <>
          <Renderer
            text={text}
            title={doc.title}
            media={media}
            postType={doc.platform_post_type}
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
            publishesTitle={limitsReady && titleLimit !== null}
            markdown={doc.content}
            imageCount={imageCount}
            videoCount={videoCount}
            pdfCount={pdfCount}
            missingImages={missingImages}
            missingPosters={missingPosters}
            shownImages={shownImages}
            textLength={[...text].length}
            max={limit}
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
  publishesTitle,
  markdown,
  imageCount,
  videoCount,
  pdfCount,
  missingImages,
  missingPosters,
  shownImages,
  textLength,
  max,
  accountConnected,
}: {
  platformName: string
  title: string
  /** The platform has a title field of its own (YouTube) — CON-160. */
  publishesTitle: boolean
  markdown: string
  /** Attached images that have a URL to render. */
  imageCount: number
  /** Attached videos with a poster to render. */
  videoCount: number
  /** Attached PDFs, which are documents rather than feed pictures. */
  pdfCount: number
  /** Images with no presigned URL — object storage is unconfigured. */
  missingImages: number
  /** Videos with no poster frame — the probe never produced one. */
  missingPosters: number
  /** How many of the images the card actually renders. */
  shownImages: number
  /** Length of the published text, in code points. */
  textLength: number
  /** The platform's ceiling; `null` while unresolved or where there is none. */
  max: number | null
  accountConnected: boolean
}) {
  const notes: ReactNode[] = []

  if (title.trim() && !publishesTitle) {
    notes.push(
      <>
        The title is not published. {platformName} posts have no title field, so it stays in
        Ogen as the post's name.
      </>,
    )
  }

  // The inverse, and the more surprising one: on YouTube the title *is* the
  // video's name, and leaving it empty does not block the publish — it just
  // names the video something nobody chose.
  if (!title.trim() && publishesTitle) {
    notes.push(
      <>
        There is no title, so {platformName} falls back to the first line of the description
        — or to "Untitled Video" when there is none.
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

  if (imageCount > shownImages) {
    notes.push(
      <>
        {shownImages === 1
          ? `Only the first of ${imageCount} images is shown`
          : `Only ${shownImages} of ${imageCount} images are shown`}
        , which is what {platformName} puts in the feed.
      </>,
    )
  }

  if (videoCount > 0) {
    notes.push(
      <>
        {videoCount === 1 ? 'The video is' : `The ${videoCount} videos are`} drawn as{' '}
        {videoCount === 1 ? 'its poster frame' : 'their poster frames'} — the same still{' '}
        {platformName} shows before playback. Nothing here plays, and the poster is generated
        rather than chosen.
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

  if (missingImages > 0) {
    notes.push(
      <>
        {missingImages === 1 ? 'One image has' : `${missingImages} images have`} no download
        link yet, so {missingImages === 1 ? 'it is' : 'they are'} missing from the card —
        object storage may not be configured.
      </>,
    )
  }

  if (missingPosters > 0) {
    notes.push(
      <>
        {missingPosters === 1 ? 'One video has' : `${missingPosters} videos have`} no poster
        frame, so {missingPosters === 1 ? 'it is' : 'they are'} missing from the card. The
        upload is fine — the frame is taken after it lands, and that step did not run.
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

  if (max !== null && textLength > max) {
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
