import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRequestDistill, useStarterQuestions } from '@/hooks/useBrandDistill'
import { filledAnswers, questionText } from '@/lib/brandDistillCopy'
import { QuestionField } from './Questions'

/**
 * The third route, for when nothing is written down (CON-400 board 5A).
 *
 * Seven questions from the server, worded here by their stable ids. None is
 * required and DRAFT IT needs one: the run skips the reading steps and goes
 * straight to drafting, and the review it lands on is the same page every
 * other read lands on, with each item's source reading "your answer to …".
 */
export function QuestionsScreen() {
  const { t } = useTranslation()
  const questions = useStarterQuestions()
  const { request, refusal } = useRequestDistill()
  const [values, setValues] = useState<Record<string, string>>({})

  const list = questions.data ?? []
  const answers = filledAnswers(t, list, values)

  return (
    <section className="mx-auto flex w-full max-w-content flex-col gap-5 bg-primary px-6 py-6">
      <p className="max-w-2xl text-sm leading-5 text-secondary-foreground">
        {t('brand.distill.questions.intro')}
      </p>
      {questions.isPending ? (
        <div className="flex flex-col gap-4" aria-hidden>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : questions.isError ? (
        <p className="text-sm text-secondary-foreground">
          {t('brand.distill.questions.unavailable')}
        </p>
      ) : (
        <ol className="flex flex-col gap-5">
          {list.map((q, i) => (
            <QuestionField
              key={q.id}
              number={i + 1}
              question={questionText(t, q)}
              value={values[q.id] ?? ''}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, [q.id]: value }))
              }
            />
          ))}
        </ol>
      )}
      <div className="flex flex-col gap-2 border-t border-quaternary pt-4">
        {refusal && (
          <p role="alert" className="text-xs text-destructive">
            {t(`brand.distill.refusal.${refusal}`)}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-secondary-foreground">
            {t('brand.distill.questions.answered', {
              answered: answers.length,
              count: list.length,
            })}
          </span>
          <Button
            variant="defaultInverted"
            loading={request.isPending}
            disabled={answers.length === 0}
            onClick={() => request.mutate({ answers })}
          >
            {t('brand.distill.questions.draft')}
          </Button>
        </div>
      </div>
    </section>
  )
}
