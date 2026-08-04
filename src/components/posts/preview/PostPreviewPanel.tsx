import { useMemo, type JSX, type ReactNode } from 'react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { usePublishingAccount } from '@/hooks/usePublishingAccount.ts'
import { getPlatformInfo } from '@/lib/platformDictionary.ts'
import { getPlatformMedia } from '@/lib/platformMedia.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { useCharLimit } from '@/hooks/useCharLimit'
import { markdownToSocialText, splitThread } from '@/lib/socialText.ts'
import { attachmentKind, type PostAttachmentWithValidation } from '@/types/attachments'
import type { Post } from '@/types/posts'
import { FacebookPreview } from './FacebookPreview.tsx'
import { InstagramPreview } from './InstagramPreview.tsx'
import { LinkedInPreview } from './LinkedInPreview.tsx'
import { StoryPreview } from './StoryPreview.tsx'
import { ThreadsPreview } from './ThreadsPreview.tsx'
import { TwitterPreview } from './TwitterPreview.tsx'
import type { PreviewProps } from './types.ts'

/**
 * A card per platform Ogen publishes to — all five of them, now that YouTube
 * is hidden (CON-145). Anything without an entry falls through to a stub,
 * which is now only reachable by a post pointing at a platform we no longer
 * offer.
 */
const RENDERERS: Record<string, (props: PreviewProps) => JSX.Element> = {
  linkedin: LinkedInPreview,
  facebook: FacebookPreview,
  instagram: InstagramPreview,
  twitter: TwitterPreview,
  threads: ThreadsPreview,
}

/**
 * How many images the card puts in the feed before collapsing the rest behind
 * a "+N" tile. Only the grid networks are listed: Instagram and Threads draw
 * every slide, because a carousel is not a truncation.
 */
const FEED_TILES: Record<string, number> = {
  linkedin: 4,
  facebook: 4,
  twitter: 4,
}

/** Networks whose `story` post type is the fullscreen kind we can draw. */
const STORY_NETWORKS = new Set(['instagram', 'facebook'])

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
  const { limit } = useCharLimit(doc.platform_id, doc.platform_post_type)

  // Two post types are not a feed card at all, and previewing them as one
  // said something untrue: a story publishes no caption, and a thread's
  // character limit is per post rather than for the whole text.
  const postType = doc.platform_post_type
  const isStory = postType === 'story' && !!platform && STORY_NETWORKS.has(platform.zernioId)
  const isThread = postType === 'thread' && platform?.zernioId === 'twitter'
  // 1-based, because the note counts posts the way the reader will. Counted in
  // code points, like the whole-text check below — an emoji is one character
  // to the network and two to `String.length`.
  const longSegments = isThread
    ? splitThread(text).flatMap((s, i) =>
        limit !== null && [...s].length > limit ? [i + 1] : [],
      )
    : []

  // The platform's own ceiling on images in one post. Anything past it cannot
  // publish, so the card is drawn from the images that can — otherwise the
  // preview would promise a slide the network will drop.
  const mediaCap = getPlatformMedia(doc.platform_id).image?.maxPerPost ?? null
  const publishable =
    mediaCap === null ? imageUrls : imageUrls.slice(0, mediaCap)
  const feedTiles = platform ? FEED_TILES[platform.zernioId] : undefined

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
      ) : platform.hidden ? (
        // Reachable only by a post made before the platform was withdrawn.
        // Saying why beats a card that pretends the post has a future.
        <Note>
          Ogen doesn't publish to {platform.name} — it has no video pipeline yet. Move this
          post to another platform and its preview appears here.
        </Note>
      ) : !Renderer ? (
        <Note>No {platform.name} preview yet.</Note>
      ) : (
        <>
          {isStory ? (
            <StoryPreview
              text={text}
              mediaUrls={publishable}
              author={previewAuthor}
              timeLabel={timeLabel}
              postType={postType}
              network={platform.zernioId as 'instagram' | 'facebook'}
            />
          ) : (
            <Renderer
              text={text}
              mediaUrls={publishable}
              author={previewAuthor}
              timeLabel={timeLabel}
              postType={postType}
              charLimit={limit}
            />
          )}

          <Notes
            platformName={platform.name}
            title={doc.title}
            markdown={doc.content}
            text={text}
            mediaCount={imageUrls.length}
            pdfCount={pdfCount}
            missingUrls={missingUrls}
            mediaCap={mediaCap}
            feedTiles={feedTiles}
            carousel={!isStory && publishable.length > 1 && feedTiles === undefined}
            story={isStory}
            thread={isThread}
            longSegments={longSegments}
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
  markdown,
  text,
  mediaCount,
  pdfCount,
  missingUrls,
  mediaCap,
  feedTiles,
  carousel,
  story,
  thread,
  longSegments,
  textLength,
  max,
  accountConnected,
}: {
  platformName: string
  title: string
  markdown: string
  /** The flattened copy, as the network would receive it. */
  text: string
  /** Attached images that have a URL to render. */
  mediaCount: number
  /** Attached PDFs, which are documents rather than feed pictures. */
  pdfCount: number
  /** Images with no presigned URL — object storage is unconfigured. */
  missingUrls: number
  /** The platform's ceiling on images in one post, if it has one. */
  mediaCap: number | null
  /** Images the feed shows before a "+N" tile — grid networks only. */
  feedTiles?: number
  /** The card is drawn as a swipeable carousel rather than a grid. */
  carousel: boolean
  /** A fullscreen story: no caption, exactly one image. */
  story: boolean
  /** An X thread: several posts, each with its own character limit. */
  thread: boolean
  /** 1-based positions of the thread posts that are over that limit. */
  longSegments: number[]
  /** Length of the published text, in code points. */
  textLength: number
  /** The platform's ceiling; `null` while unresolved or where there is none. */
  max: number | null
  accountConnected: boolean
}) {
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
    if (mediaCount === 0) {
      notes.push(
        <span className="text-destructive">
          A story is one image, full screen. This post has none, so it cannot be scheduled.
        </span>,
      )
    } else if (mediaCount > 1) {
      notes.push(
        <span className="text-destructive">
          A story takes exactly one image and this post has {mediaCount} — {platformName} will
          not accept it. Remove the rest, or split them across posts.
        </span>,
      )
    }
  }

  if (title.trim()) {
    notes.push(
      <>
        The title is not published. {platformName} posts have no title field, so it stays in
        Ogen as the post's name.
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
    notes.push(
      <>
        A thread: the card splits the copy at blank lines, one post per paragraph. Ogen sends
        it as a single block and the publisher does the real splitting, so the breaks may land
        elsewhere.
      </>,
    )

    // The limit is per post here, so the usual "over the limit" note would be
    // wrong in both directions — it fires on threads that are fine and says
    // nothing about which post is the problem.
    if (longSegments.length > 0 && max) {
      notes.push(
        <span className="text-destructive">
          {longSegments.length === 1
            ? `Post ${longSegments[0]} is`
            : `Posts ${longSegments.slice(0, -1).join(', ')} and ${
                longSegments[longSegments.length - 1]
              } are`}{' '}
          past {platformName}'s {max} characters per post, and will be rejected.
        </span>,
      )
    }
  }

  // Past the platform's cap the extra images do not publish at all — a
  // different and worse fact than a feed that collapses them, so it is said
  // first and in the destructive colour.
  if (!story && mediaCap !== null && mediaCount > mediaCap) {
    notes.push(
      <span className="text-destructive">
        Only the first {mediaCap} of {mediaCount} images will publish — {platformName} takes{' '}
        {mediaCap} in one post. Remove the rest, or split them across posts.
      </span>,
    )
  }

  const publishing = mediaCap === null ? mediaCount : Math.min(mediaCount, mediaCap)

  if (!story && feedTiles !== undefined && publishing > feedTiles) {
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
        A carousel: the reader swipes through {publishing} slides and only the first is in the
        feed, so it carries the post. Every slide is cropped to the first one's shape.
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

  // `!thread` matters: on a thread the limit is per post, so measuring the
  // whole text against it is wrong in both directions — it fires on threads
  // that are fine, and stays silent about which post is actually too long.
  // The per-post version of this note is above.
  if (!thread && max !== null && textLength > max) {
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
