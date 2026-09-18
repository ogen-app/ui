import { useTranslation } from 'react-i18next'
import { WarningCircleIcon } from '@phosphor-icons/react'

import { cn } from '@/lib/styles'
import { MAX_THREAD_POSTS, type ThreadPlan } from '@/lib/threadSequence'

type Props = {
  plan: ThreadPlan<unknown>
  /**
   * The body has moved on and the server has not answered about it yet. The
   * note is dimmed rather than replaced: a count that flickers back to
   * "working it out" on every keystroke is harder to read than one that is
   * briefly a keystroke behind.
   */
  stale?: boolean
}

/**
 * What the body will actually publish as, under the editor (CON-196).
 *
 * Deliberately **not** an `<Explainer>`. It carries a count and a verdict, and
 * an Explainer can be dismissed for good — the teaching about dividers lives
 * in one above the editor, and this line has to survive its dismissal because
 * it is the only place on the screen that says the body just became six posts
 * instead of five.
 *
 * It is also the only feedback the split gets in the editor itself: the
 * document stays one Markdown body, exactly as every other post type, so the
 * chain is summarised here in a sentence and drawn in full in the preview.
 *
 * Every number in here came off the server's own split (CON-284 R2), so the
 * sentence is a report rather than a prediction.
 */
export function ThreadSplitNote({ plan, stale }: Props) {
  const { t } = useTranslation()

  if (plan.pending) {
    return <Line>{t('posts.sequence.splitPending')}</Line>
  }

  if (plan.overflowed) {
    return (
      <Line warning stale={stale}>
        {t('posts.sequence.splitOverflow', { max: MAX_THREAD_POSTS })}
      </Line>
    )
  }

  // Nothing was broken, so naming the rule that would have done it says the
  // note did work it did not do — "broken at your dividers" over a body with
  // none. One post is the whole verdict.
  if (plan.posts.length === 1) {
    return <Line stale={stale}>{t('posts.sequence.splitSingle')}</Line>
  }

  // Two sentences, and which one is true is the split's own mode rather than
  // anything counted here: a body with a divider line in it is broken exactly
  // where the author said, and one without is packed to the ceiling.
  return (
    <Line stale={stale}>
      {plan.rule === 'divider'
        ? t('posts.sequence.splitByDivider', { count: plan.posts.length })
        : t('posts.sequence.splitByLimit', {
            count: plan.posts.length,
            // Auto mode only ever produces more than one message when the
            // server had a ceiling to pack to — without one `SplitThread`
            // returns the whole body as a single segment — so this branch
            // always has a limit to name.
            limit: plan.charLimit ?? 0,
          })}
    </Line>
  )
}

function Line({
  warning,
  stale,
  children,
}: {
  warning?: boolean
  stale?: boolean
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        warning
          ? 'mt-3 flex items-start gap-2 text-xs text-warning'
          : 'mt-3 text-xs text-tertiary-foreground',
        stale && 'opacity-50 transition-opacity',
      )}
    >
      {warning && (
        <WarningCircleIcon weight="fill" className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  )
}
