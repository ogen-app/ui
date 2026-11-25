import { Link01Icon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
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
        <Card
          title={t('posts.performance.title')}
          action={{
            label: t('posts.performance.unlinked.action'),
            icon: Link01Icon,
            onClick: onAddPostLink,
          }}
        >
          <Body>{t('posts.performance.unlinked.body')}</Body>
        </Card>
      )

    case 'waiting':
      return <Note body={t('posts.performance.waiting.body')} />

    case 'unavailable':
      return <Note body={t('posts.performance.unavailable.body')} />

    case 'error':
      return <Note body={t('posts.performance.error.body')} />
  }
}

/**
 * One of the answers that are not numbers, on the app's card.
 *
 * Titled "Analytics" rather than by the answer: the card is the place the
 * figures will be, and the sentence under it says why they are not.
 */
function Note({ body }: { body: string }) {
  const { t } = useTranslation()
  return (
    <Card title={t('posts.performance.title')}>
      <Body>{body}</Body>
    </Card>
  )
}

function Body({ children }: { children: string }) {
  return <p className="text-sm">{children}</p>
}
