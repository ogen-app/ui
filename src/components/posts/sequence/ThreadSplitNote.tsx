import { useTranslation } from 'react-i18next'
import { WarningCircleIcon } from '@phosphor-icons/react'

import {
  MAX_THREAD_POSTS,
  autoSplitCount,
  type ThreadPlan,
} from '@/lib/threadSequence'

type Props = {
  plan: ThreadPlan<unknown>
  /** The platform's per-post ceiling, for the sentence about cutting to fit. */
  charLimit: number | null | undefined
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
 */
export function ThreadSplitNote({ plan, charLimit }: Props) {
  const { t } = useTranslation()

  if (plan.pending) {
    return <Line>{t('posts.sequence.splitPending')}</Line>
  }

  if (plan.overflowed) {
    return (
      <Line warning>
        {t('posts.sequence.splitOverflow', { max: MAX_THREAD_POSTS })}
      </Line>
    )
  }

  // Nothing was broken, so naming the rule that would have done it says the
  // note did work it did not do — "broken at blank lines" over a body with
  // none. One post is the whole verdict.
  if (plan.posts.length === 1) {
    return <Line>{t('posts.sequence.splitSingle')}</Line>
  }

  const cut = autoSplitCount(plan)

  // The author made no breaks at all, so there is no rule to name: every post
  // here is the ceiling's doing, and that is the whole sentence.
  if (plan.parts === 1 && plan.posts.length > 1 && charLimit != null) {
    return (
      <Line>
        {t('posts.sequence.splitByLimit', {
          count: plan.posts.length,
          limit: charLimit,
        })}
      </Line>
    )
  }

  return (
    <Line>
      {plan.rule === 'divider'
        ? t('posts.sequence.splitByDivider', { count: plan.posts.length })
        : t('posts.sequence.splitByBlankLine', { count: plan.posts.length })}
      {/* Its own sentence, never a clause appended to the one above: the two
          are separately translatable, and only this one has a limit in it. */}
      {cut > 0 && charLimit != null && (
        <>
          {' '}
          {t('posts.sequence.splitAutoCut', { count: cut, limit: charLimit })}
        </>
      )}
    </Line>
  )
}

function Line({
  warning,
  children,
}: {
  warning?: boolean
  children: React.ReactNode
}) {
  return (
    <p
      className={
        warning
          ? 'mt-3 flex items-start gap-2 text-xs text-warning'
          : 'mt-3 text-xs text-tertiary-foreground'
      }
    >
      {warning && (
        <WarningCircleIcon weight="fill" className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  )
}
