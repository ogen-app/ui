import { ChartLineIcon, LinkSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { PostPerformanceResult } from '@/hooks/usePostPerformance'
import { PostAnalyticsSurface } from './PostPerformance'

/**
 * A post's own numbers on the post screen, with the four answers that are not
 * numbers.
 *
 * The section decides *whether to be here at all* before it decides what to
 * say. A post that has not gone out renders nothing — no empty card, no "no
 * data yet" — because a draft has no numbers in the same way a letter has no
 * postmark, and a card promising figures later is a card on every screen in
 * the app forever.
 *
 * The three states that do render are each a different kind of not-yet, and
 * flattening them into one would lose the only part that matters — whether
 * anyone can do anything about it:
 *
 * - **unlinked** is the one with an action. The post went out by hand and
 *   nothing ties it to what was posted, so the fix is a URL and the section
 *   says so and offers the control.
 * - **waiting** is a clock. Nothing is wrong and nothing is owed; the sweep
 *   has not been round yet, and the hook is already polling.
 * - **unavailable** is this deployment's configuration. Nobody reading a post
 *   can act on it, so it is stated once, quietly, and never dressed as an
 *   error the reader caused.
 */
export function PostPerformanceSection({
  result,
  onAddPostLink,
}: {
  result: PostPerformanceResult
  /** Opens the dialog that links a manually-published post. */
  onAddPostLink: () => void
}) {
  const { t } = useTranslation()

  switch (result.state) {
    // Nothing has gone out, so there is nothing to be silent *about*.
    case 'unpublished':
      return null

    // Also nothing: the first paint of a published post should not push the
    // page down by a card's height a moment later.
    case 'loading':
      return null

    case 'measured':
      return <PostAnalyticsSurface view={result.view} />

    case 'unlinked':
      return (
        <Note
          title={t('posts.performance.unlinked.title')}
          body={t('posts.performance.unlinked.body')}
          action={
            <Button variant="secondary" size="sm" onClick={onAddPostLink}>
              <LinkSimpleIcon weight="bold" className="size-4" />
              {t('posts.performance.unlinked.action')}
            </Button>
          }
        />
      )

    case 'waiting':
      return (
        <Note
          title={t('posts.performance.waiting.title')}
          body={t('posts.performance.waiting.body')}
        />
      )

    case 'unavailable':
      return <Note body={t('posts.performance.unavailable.body')} />

    case 'error':
      return <Note body={t('posts.performance.error.body')} />
  }
}

/**
 * One quiet line, optionally with the thing to do about it.
 *
 * Not a `SectionCard`: those carry a heading and a scope note and are a promise
 * that figures are inside. None of these states has figures, and dressing them
 * as a measurement card would make the screen look like it is reporting zero.
 */
function Note({
  title,
  body,
  action,
}: {
  title?: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border px-5 py-4">
      <ChartLineIcon
        weight="bold"
        className="mt-0.5 size-4 shrink-0 text-quaternary-foreground"
        aria-hidden
      />
      <div className="flex min-w-0 flex-col gap-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <p className="text-xs text-secondary-foreground">{body}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
