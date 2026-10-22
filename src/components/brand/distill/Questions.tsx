import { useState } from 'react'
import { ChatCircleTextIcon, XIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { brandSectionCopy } from '@/lib/brandSections'
import type { RunRoute } from '@/lib/brandDistill'
import { filledAnswers } from '@/lib/brandDistillCopy'
import type { DistillAnswer, DistillQuestion } from '@/types/brandDistill'

/**
 * Questions, in the two places a read asks them (CON-400 board 5): the
 * questions route's seven starters, and the gap questions at the top of any
 * review.
 *
 * Each answer is the facts editor's field — a pale fill, a rule under it that
 * goes black on focus — under the question as its label. None is required.
 */

export function QuestionField({
  number,
  question,
  why,
  value,
  onChange,
}: {
  number: number
  question: string
  /** Under the question — what it would fill and why it is asked. */
  why?: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)] gap-y-2">
      <span className="text-sm font-medium leading-5 text-tertiary-foreground tabular-nums">
        {number}
      </span>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold leading-5">{question}</span>
        {why && (
          <span className="text-xs leading-4 text-tertiary-foreground">
            {why}
          </span>
        )}
      </label>
      <Textarea
        variant="primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('brand.distill.questions.placeholder')}
        aria-label={question}
        className="col-start-2 min-h-10 bg-secondary px-3 py-2.5 leading-5"
      />
    </li>
  )
}

/**
 * What the sources left out, asked at the top of the review — up to five, each
 * naming the section it would fill and why it matters. Closable: the proposal
 * stands without them.
 *
 * Answering composes the proposal again from the passages already read plus
 * the answers — a new run, which the page follows — and keeps the user's
 * decisions where the items carried over. It is free; the plan's monthly
 * allowance counts reads, not rounds of answers.
 */
export function GapQuestions({
  questions,
  route,
  busy,
  onAsk,
  onClose,
}: {
  questions: DistillQuestion[]
  route: RunRoute
  busy: boolean
  onAsk: (answers: DistillAnswer[]) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState<Record<string, string>>({})
  const answers = filledAnswers(t, questions, values)

  return (
    <section
      id="gap-questions"
      className="relative mx-auto flex w-full max-w-content flex-col gap-5 bg-primary px-6 py-6"
    >
      <Button
        variant="ghost"
        size="smIcon"
        className="absolute top-3 right-3"
        aria-label={t('brand.distill.gaps.close')}
        onClick={onClose}
      >
        <XIcon />
      </Button>
      <h2 className="flex items-center gap-2 pr-10 font-display text-lg font-medium leading-6 tracking-tight">
        <ChatCircleTextIcon
          aria-hidden
          className="size-5 shrink-0 text-accent"
        />
        {t(`brand.distill.gaps.title.${route}` as const, {
          count: questions.length,
        })}
      </h2>
      <ol className="flex flex-col gap-5">
        {questions.map((q, i) => (
          <QuestionField
            key={q.id}
            number={i + 1}
            question={q.text}
            why={[brandSectionCopy(t, q.section).label, q.why]
              .filter(Boolean)
              .join(t('brand.distill.gaps.whyJoin'))}
            value={values[q.id] ?? ''}
            onChange={(value) =>
              setValues((prev) => ({ ...prev, [q.id]: value }))
            }
          />
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="max-w-md text-xs leading-5 text-tertiary-foreground">
          {t(`brand.distill.gaps.note.${route}` as const)}
        </p>
        <Button
          variant="defaultInverted"
          loading={busy}
          disabled={answers.length === 0}
          onClick={() => onAsk(answers)}
        >
          {t('brand.distill.gaps.ask')}
        </Button>
      </div>
    </section>
  )
}
