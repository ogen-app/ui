import { useMemo, type JSX, type ReactNode } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { usePublishingAccount } from '@/hooks/usePublishingAccount.ts'
import { getPlatformInfo } from '@/lib/platformDictionary.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { markdownToSocialText, PLATFORM_TEXT_LIMITS } from '@/lib/socialText.ts'
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
 * "Preview" for the right sidebar: the post as its platform will render it.
 *
 * Approximate by construction — the networks change their feeds without
 * telling anyone, and we cannot know the viewer's device — so this is here to
 * answer the questions the editor cannot: where the text folds, which image
 * leads, and what happens to formatting the platform does not support.
 */
export function PostPreviewPanel({ doc, onClose }: { doc: Post; onClose?: () => void }) {
  const platform = getPlatformInfo(doc.platform_id)
  const author = usePublishingAccount(doc.platform_id)

  const text = useMemo(() => markdownToSocialText(doc.content), [doc.content])

  // The feed timestamp reads from the schedule when there is one — seeing
  // "in 3 days" on the card is a cheap confirmation that the date is right.
  // Once published, when it actually went out is the truer answer, and both
  // fields are set by then.
  const timeLabel = relativeTime(doc.published_at ?? doc.scheduled_at) ?? 'Just now'

  const Renderer = platform ? RENDERERS[platform.zernioId] : undefined
  const limits = platform ? PLATFORM_TEXT_LIMITS[platform.zernioId] : undefined

  return (
    <RailPanel
      title="Preview"
      onClose={onClose}
      className="h-full"
      titleAdornment={
        platform && (
          <span className="flex items-center gap-1.5 text-sm text-tertiary-foreground">
            <platform.icon className="size-4" style={{ color: platform.color }} aria-hidden />
            {platform.name}
          </span>
        )
      }
    >
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
            mediaUrls={doc.media_urls}
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

          <div className="flex flex-col gap-2 text-xs text-tertiary-foreground">
            {limits && <CharacterCount length={text.length} max={limits.max} />}
            {!author.connected && (
              <Warning>
                No {platform.name} account is connected, so the name and picture above are
                placeholders.
              </Warning>
            )}
            {looksLikeMarkdown(doc.content) && (
              <Warning>
                {platform.name} publishes plain text — the formatting in the editor is shown
                here as it will actually appear.
              </Warning>
            )}
            <p>
              An approximation, not a guarantee: the real post depends on the viewer's device
              and whatever {platform.name} changed this week.
            </p>
          </div>
        </>
      )}
    </RailPanel>
  )
}

function CharacterCount({ length, max }: { length: number; max: number }) {
  const over = length > max

  return (
    <p className={over ? 'text-destructive' : undefined}>
      {length.toLocaleString()} / {max.toLocaleString()} characters
      {over && ' — too long to publish'}
    </p>
  )
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-1.5">
      <WarningCircleIcon className="size-4 shrink-0 translate-y-px" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-tertiary-foreground">{children}</p>
}

/** Formatting that will not survive publishing — worth saying so once. */
function looksLikeMarkdown(markdown: string): boolean {
  return /(\*\*|__|~~|^\s*#{1,6}\s|\[[^\]]*\]\([^)]*\))/m.test(markdown)
}
