import {
  BookmarkSimpleIcon,
  ChartBarIcon,
  ChatCircleIcon,
  DotsThreeIcon,
  HeartIcon,
  RepeatIcon,
} from '@phosphor-icons/react'
import {
  PLATFORM_FOLDS,
  measureSegment,
  threadSegments,
  type ThreadSegment,
} from '@/lib/socialText.ts'
import { FoldedText, PreviewAvatar, PreviewMedia, PreviewSurface } from './previewParts.tsx'
import { TWITTER as C } from './previewTheme.ts'
import type { PreviewAuthor, PreviewMediaItem, PreviewProps } from './types.ts'

/**
 * An X (Twitter) post, or a thread of them.
 *
 * The limit is the whole story here: 280 characters is both the fold and the
 * cap, so there is no "see more" to preview — text either fits or the post is
 * rejected. What the card is for instead is the shape of that constraint,
 * which is much harder to feel in an editor sized for LinkedIn: four images
 * maximum, and a caption that a single URL can eat a tenth of.
 *
 * A `thread` post is the exception, and the reason this component knows its
 * post type: the 280 characters apply *per post*, so a 900-character thread is
 * perfectly valid and the single-card preview was calling it rejected.
 *
 * Where those posts come from depends on whether the sequence feature is on.
 * With it on the editor hands them over (`sequence`), each with the media it
 * carries. Without it, the card falls back to splitting the body at blank
 * lines — a guess, but the honest one: that is also what the single block of
 * `content` would have to be split on by anything downstream.
 *
 * The avatar sits in its own column with everything else indented past it,
 * which is X's layout and the reason its text measure is narrower than the
 * other networks' at the same card width.
 */
export function TwitterPreview({
  text,
  media,
  author,
  timeLabel,
  postType,
  charLimit,
  sequence,
}: PreviewProps) {
  const thread = postType === 'thread'
  // The panel's notes read the same verdicts, so the badge on a post and the
  // note naming it can never disagree.
  const posts: { segment: ThreadSegment; media: PreviewMediaItem[] }[] =
    sequence
      ? sequence.map((item) => ({
          segment: measureSegment(item.text, charLimit ?? null),
          media: item.media,
        }))
      : thread
        ? threadSegments(text, charLimit ?? null).map((segment, i) => ({
            segment,
            /* Without a sequence there is nothing saying which post carries
               what, and a thread's images conventionally ride the first —
               which is the one decision the preview cannot leave blank. */
            media: i === 0 ? media : [],
          }))
        : [{ segment: { text, count: 0, over: false }, media }]

  return (
    <PreviewSurface style={{ borderRadius: 16 }}>
      {posts.map(({ segment, media: postMedia }, i) => (
        <Tweet
          key={i}
          segment={segment}
          media={postMedia}
          author={author}
          timeLabel={timeLabel}
          thread={thread}
          charLimit={charLimit}
          connector={i < posts.length - 1}
        />
      ))}
    </PreviewSurface>
  )
}

function Tweet({
  segment,
  media,
  author,
  timeLabel,
  thread,
  charLimit,
  connector,
}: {
  /** The post's text with its length verdict — see `threadSegments`. */
  segment: ThreadSegment
  media: PreviewMediaItem[]
  author: PreviewAuthor
  timeLabel: string
  /** Part of a thread: text is shown whole, and over-length is called out. */
  thread: boolean
  /** The network's ceiling, from the API. Null while it loads. */
  charLimit?: number | null
  /** Draw the line down to the next post. */
  connector: boolean
}) {
  const text = segment.text
  const name = author.name ?? 'Your account'
  const handle = author.username ? `@${author.username}` : null

  return (
    <div className="flex gap-2 p-3" style={{ paddingBottom: connector ? 0 : 12 }}>
      <div className="flex shrink-0 flex-col items-center">
        <PreviewAvatar src={author.avatarUrl} name={name} size={40} background={C.link} />
        {/* X's thread line: what makes several cards read as one post rather
            than as three unrelated ones in a feed. */}
        {connector && (
          <div className="mt-1 min-h-2 w-0.5 flex-1" style={{ background: C.border }} />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${connector ? 'pb-3' : ''}`}>
        <div className="flex items-center gap-1" style={{ fontSize: 15 }}>
          <span className="truncate font-bold" style={{ color: C.text }}>
            {name}
          </span>
          {/* The handle is what identifies the account on X — but it is
              also the first thing to lose when the name is long, which is
              why it truncates and the name does not. */}
          {handle && (
            <span className="min-w-0 truncate" style={{ color: C.muted }}>
              {handle}
            </span>
          )}
          <span aria-hidden style={{ color: C.muted }}>
            ·
          </span>
          <span className="shrink-0" style={{ color: C.muted }}>
            {timeLabel}
          </span>
          <DotsThreeIcon
            className="ml-auto size-5 shrink-0"
            style={{ color: C.muted }}
            aria-hidden
          />
        </div>

        <div className="pt-0.5">
          {thread ? (
            // No fold: within a thread the whole segment is the post, and
            // hiding its tail behind "Show more" would hide exactly the part
            // that puts it over the limit.
            <div
              className="whitespace-pre-wrap break-words"
              style={{ color: C.text, fontSize: 15, lineHeight: 1.3125 }}
            >
              {text}
            </div>
          ) : (
            <FoldedText
              text={text}
              fold={PLATFORM_FOLDS.twitter}
              moreLabel="Show more"
              color={C.text}
              moreColor={C.link}
              style={{ fontSize: 15, lineHeight: 1.3125 }}
            />
          )}
        </div>

        {/* An annotation rather than X chrome — X simply refuses to post at
            281 characters, so there is nothing authentic to reproduce, and
            "which post in the thread is too long" is unanswerable from the
            notes alone once a thread runs past a few segments. */}
        {thread && segment.over && (
          <div className="pt-1 font-semibold" style={{ color: C.danger, fontSize: 12 }}>
            {segment.count}/{charLimit} characters — this post is too long
          </div>
        )}

        {media.length > 0 && (
          // X rounds and outlines the media block rather than letting it
          // bleed to the card edge, so it is wrapped rather than handed a
          // radius — `PreviewMedia` owns its own layout inside.
          <div
            className="mt-3"
            style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}
          >
            <PreviewMedia items={media} background={C.surface} />
          </div>
        )}

        {/* Spread the full width, unlabelled: X shows counts, and a count
            we do not have is worse than none. */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ color: C.action, maxWidth: 320 }}
        >
          <ChatCircleIcon className="size-[18px]" aria-hidden />
          <RepeatIcon className="size-[18px]" aria-hidden />
          <HeartIcon className="size-[18px]" aria-hidden />
          <ChartBarIcon className="size-[18px]" aria-hidden />
          <BookmarkSimpleIcon className="size-[18px]" aria-hidden />
        </div>
      </div>
    </div>
  )
}
