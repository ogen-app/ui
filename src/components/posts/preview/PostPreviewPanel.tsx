import { useMemo, type JSX, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { usePublishingAccount } from '@/hooks/usePublishingAccount.ts'
import { getPlatformInfo } from '@/lib/platformDictionary.ts'
import { getPlatformMedia } from '@/lib/platformMedia.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { formatNumber } from '@/lib/intl'
import { useCharLimit } from '@/hooks/useCharLimit'
import { charCount, markdownToSocialText } from '@/lib/socialText.ts'
import type { ThreadPlan } from '@/lib/threadSequence'
import { attachmentKind, type PostAttachmentWithValidation } from '@/types/attachments'
import type { Post } from '@/types/posts'
import { FacebookPreview } from './FacebookPreview.tsx'
import { InstagramPreview } from './InstagramPreview.tsx'
import { LinkedInPreview } from './LinkedInPreview.tsx'
import { ShortsPreview } from './ShortsPreview.tsx'
import { StoryPreview } from './StoryPreview.tsx'
import { ThreadsPreview } from './ThreadsPreview.tsx'
import { TwitterPreview } from './TwitterPreview.tsx'
import { YouTubePreview } from './YouTubePreview.tsx'
import {
  STORY_NETWORKS,
  type PreviewMediaItem,
  type PreviewProps,
  type StoryNetwork,
} from './types.ts'

/**
 * A card per platform Ogen publishes to. Anything without an entry falls
 * through to a stub, which is now only reachable by a post pointing at a
 * platform we no longer offer.
 */
const RENDERERS: Record<string, (props: PreviewProps) => JSX.Element> = {
  linkedin: LinkedInPreview,
  facebook: FacebookPreview,
  instagram: InstagramPreview,
  twitter: TwitterPreview,
  threads: ThreadsPreview,
  youtube: YouTubePreview,
}

/**
 * How many *images* the card puts in the feed before collapsing the rest
 * behind a "+N" tile. Only the grid networks are listed: Instagram and
 * Threads draw every slide, because a carousel is not a truncation, and on
 * YouTube the video is the page rather than a gallery.
 *
 * Images only, on purpose. A video is one video — "1 of 4 shown" is a
 * statement about a gallery, and applying it to a video post would invent a
 * truncation that never happened.
 */
const FEED_TILES: Record<string, number> = {
  linkedin: 4,
  facebook: 4,
  twitter: 4,
}

/** Networks whose multi-image card is a swipeable carousel, not a grid. */
const CAROUSEL_NETWORKS = new Set(['instagram', 'threads'])

/**
 * Networks whose `thread` post type chains several per-limit posts. Zernio
 * takes the same `threadItems` on both (CON-196).
 */
const THREAD_NETWORKS = new Set(['twitter', 'threads'])

/**
 * The URL a card actually draws: a video shows its poster frame, everything
 * else its own file. Absent when object storage is unconfigured, or when a
 * video's poster render never ran — there is nothing to show for those, so
 * they are reported in the notes rather than rendered.
 */
function shownUrl(a: PostAttachmentWithValidation): string | undefined {
  return attachmentKind(a.mime_type) === 'video' ? a.thumbnail_url : a.presigned_url
}

/**
 * Attachments as feed tiles. PDFs are dropped — the networks treat them as
 * documents (LinkedIn turns one into a slide carousel), so they are counted
 * for the notes but never rendered as pictures.
 */
function toPreviewMedia(list: PostAttachmentWithValidation[]): PreviewMediaItem[] {
  return list.flatMap<PreviewMediaItem>((a) => {
    const kind = attachmentKind(a.mime_type)
    if (kind !== 'image' && kind !== 'video') return []
    const url = shownUrl(a)
    if (!url) return []
    return [{ url, kind, durationMs: a.duration_ms }]
  })
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
  sequence,
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
  /**
   * The chain a thread publishes as, when the post is one and the feature is
   * on (CON-196). Passed in rather than worked out here for the same reason
   * the attachments are: the editor owns the one plan, and a second one
   * derived from the same body could still disagree about the ceiling it was
   * cut to while that ceiling is loading.
   */
  sequence?: ThreadPlan<PostAttachmentWithValidation>
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
    const pictures = ordered.filter((a) => {
      const kind = attachmentKind(a.mime_type)
      return kind === 'image' || kind === 'video'
    })
    return {
      media: toPreviewMedia(ordered),
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

  /* No subtitle: LinkedIn's second line is the page's own headline, which we
     do not have. The campaign name went there first and read as if it were
     public — it never is. */
  const previewAuthor = {
    name: author.name,
    username: author.username,
    avatarUrl: author.avatarUrl,
  }

  const Renderer = platform ? RENDERERS[platform.zernioId] : undefined
  // The same server-resolved ceiling the Validations panel measures against,
  // so the two never disagree about whether the copy fits (CON-91). It
  // replaced a hard-coded per-network max that lived beside the folds.
  const { limit, titleLimit, ready: limitsReady } = useCharLimit(
    doc.platform_id,
    doc.platform_post_type,
  )

  // Two post types are not a feed card at all, and previewing them as one
  // said something untrue: a story publishes no caption, and a thread's
  // character limit is per post rather than for the whole text.
  const postType = doc.platform_post_type
  const isStory =
    postType === 'story' &&
    !!platform &&
    (STORY_NETWORKS as readonly string[]).includes(platform.zernioId)
  // A Short is the third: fullscreen vertical with its chrome laid over the
  // video, nothing like the watch page it used to borrow (CON-169).
  const isShort = postType === 'short' && platform?.zernioId === 'youtube'
  const isThread = postType === 'thread' && !!platform && THREAD_NETWORKS.has(platform.zernioId)

  // The chain the cards draw: each post's own words and its own files. Built
  // here rather than in the cards because the presigned URLs live on this
  // side, and there is one owner of them by design.
  const previewSequence = useMemo(() => {
    if (!sequence) return undefined
    return sequence.posts.map((post) => ({
      // Already flattened: `planThread` runs the body through
      // `markdownToSocialText` before it cuts it, so this is the text the
      // network receives, cut where the network will see it cut.
      text: post.text,
      media: toPreviewMedia(post.attachments),
    }))
  }, [sequence])

  // The platform's own ceiling on images in one post. Anything past it cannot
  // publish, so the card is drawn from the images that can — otherwise the
  // preview would promise a slide the network will drop. Videos ride along:
  // the image cap is about images, and the video rules live server-side
  // (`video_constraints`), enforced by the Validations panel.
  const imageCap = getPlatformMedia(doc.platform_id).image?.maxPerPost ?? null
  const publishable = useMemo(() => {
    if (imageCap === null) return media
    let images = 0
    return media.filter((m) => m.kind !== 'image' || ++images <= imageCap)
  }, [media, imageCap])
  const imageCount = media.filter((m) => m.kind === 'image').length
  const videoCount = media.filter((m) => m.kind === 'video').length
  const feedTiles = platform ? FEED_TILES[platform.zernioId] : undefined
  // Not a carousel when the post is a chain, however many files it holds: a
  // sequence's images are spread across its posts, one or two each, and
  // calling that "a carousel" describes a card the network will never draw.
  const carousel =
    !isStory &&
    !previewSequence &&
    !!platform &&
    CAROUSEL_NETWORKS.has(platform.zernioId) &&
    publishable.length > 1

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
        <Note>No {platform.name} preview yet.</Note>
      ) : (
        <>
          {isStory ? (
            <StoryPreview
              text={text}
              title={doc.title}
              media={publishable}
              author={previewAuthor}
              timeLabel={timeLabel}
              postType={postType}
              network={platform.zernioId as StoryNetwork}
            />
          ) : isShort ? (
            <ShortsPreview
              text={text}
              title={doc.title}
              media={publishable}
              author={previewAuthor}
              timeLabel={timeLabel}
              postType={postType}
            />
          ) : (
            <Renderer
              text={text}
              title={doc.title}
              media={publishable}
              author={previewAuthor}
              timeLabel={timeLabel}
              postType={postType}
              charLimit={limit}
              sequence={previewSequence}
            />
          )}

          <Notes
            platformName={platform.name}
            title={doc.title}
            publishesTitle={limitsReady && titleLimit !== null}
            markdown={doc.content}
            text={text}
            imageCount={imageCount}
            videoCount={videoCount}
            pdfCount={pdfCount}
            missingImages={missingImages}
            missingPosters={missingPosters}
            imageCap={imageCap}
            feedTiles={feedTiles}
            carousel={carousel}
            story={isStory}
            thread={isThread}
            sequence={!!previewSequence}
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
  text,
  sequence,
  imageCount,
  videoCount,
  pdfCount,
  missingImages,
  missingPosters,
  imageCap,
  feedTiles,
  carousel,
  story,
  thread,
  max,
  accountConnected,
}: {
  platformName: string
  title: string
  /** The platform has a title field of its own (YouTube) — CON-160. */
  publishesTitle: boolean
  /** The chain is real: the editor composed it, rather than the card guessing it. */
  sequence: boolean
  markdown: string
  /** The flattened copy, as the network would receive it. */
  text: string
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
  /** The platform's ceiling on images in one post, if it has one. */
  imageCap: number | null
  /** Images the feed shows before a "+N" tile — grid networks only. */
  feedTiles?: number
  /** The card is drawn as a swipeable carousel rather than a grid. */
  carousel: boolean
  /** A fullscreen story: no caption, exactly one image. */
  story: boolean
  /** An X thread: several posts, each with its own character limit. */
  thread: boolean
  /** 1-based positions of the thread posts that are over that limit. */
  /** The platform's ceiling; `null` while unresolved or where there is none. */
  max: number | null
  accountConnected: boolean
}) {
  const { t } = useTranslation()
  const notes: ReactNode[] = []

  // The whole of a story's copy is dropped, which outranks every other note
  // here — it is the only case where the text the user wrote does not publish
  // in any form.
  if (story && text.trim()) {
    notes.push(
      <span className="text-destructive">
        The caption is not published — a story has no text field. Anything that has to be read
        must be part of the image itself.
      </span>,
    )
  }

  if (story) {
    if (imageCount === 0) {
      notes.push(
        <span className="text-destructive">
          A story is one image, full screen. This post has none, so it cannot be scheduled.
        </span>,
      )
    } else if (imageCount > 1) {
      notes.push(
        <span className="text-destructive">
          A story takes exactly one image and this post has {imageCount} — {platformName} will
          not accept it. Remove the rest, or split them across posts.
        </span>,
      )
    }
  }

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

  // Pointless next to "none of the caption publishes".
  if (!story && looksLikeMarkdown(markdown)) {
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

  if (thread) {
    // The two strings here go through the catalogue while the rest of this
    // component's copy does not: it is still legacy English awaiting the
    // CON-174 pass, and the rule is that the strings you *touch* move
    // (CLAUDE.md). These two had to be touched — the old one said the
    // publisher does the splitting, and it never has.
    notes.push(
      <>{t(sequence ? 'posts.sequence.previewNote' : 'posts.sequence.previewNoteUnsplit')}</>,
    )

    // No "post 3 is too long" note, deliberately: the chain is cut to the
    // per-post ceiling as it is built, so a post past it is not a state this
    // card can be shown. The whole-body length note below is skipped for the
    // same reason — `thread` guards it.
  }

  // Past the platform's cap the extra images do not publish at all — a
  // different and worse fact than a feed that collapses them, so it is said
  // first and in the destructive colour. Not on a chain: its images are spread
  // across its posts, and the cap is per post — the thread's own row in the
  // pre-publish bar is what measures them.
  if (!story && !sequence && imageCap !== null && imageCount > imageCap) {
    notes.push(
      <span className="text-destructive">
        Only the first {imageCap} of {imageCount} images will publish — {platformName} takes{' '}
        {imageCap} in one post. Remove the rest, or split them across posts.
      </span>,
    )
  }

  const publishing = imageCap === null ? imageCount : Math.min(imageCount, imageCap)

  if (!story && !sequence && feedTiles !== undefined && publishing > feedTiles) {
    notes.push(
      <>
        {publishing} images publish, and the feed shows the first {feedTiles} — the rest open
        when the reader taps the post.
      </>,
    )
  }

  if (carousel) {
    notes.push(
      <>
        A carousel: the reader swipes through the slides and only the first is in the feed,
        so it carries the post. Every slide is cropped to the first one's shape.
      </>,
    )
  }

  if (videoCount > 0 && !story) {
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

  // `!thread` matters: on a thread the limit is per post, so measuring the
  // whole text against it is wrong in both directions — it fires on threads
  // that are fine, and stays silent about which post is actually too long.
  // The per-post version of this note is above.
  if (!thread && max !== null && charCount(text) > max) {
    notes.push(
      <span className="text-destructive">
        The text is past {platformName}'s limit of {formatNumber(max)} characters and will
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
