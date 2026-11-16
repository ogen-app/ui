import type { ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/Logo'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import {
  ONBOARDING_STAGES,
  STAGE_OF,
  type OnboardingStage,
  type OnboardingStep,
} from './flow'

/**
 * Onboarding's frame: across the top, where you are and a way out; below, the
 * work on the left and what Ogen needs on the right.
 *
 * The stages are one line rather than a stepper with numbered dots, because
 * the question a reader asks of them is "how much is left", and five words in
 * a row answer it. A finished stage can be reopened; a later one cannot,
 * because what it asks depends on what came before.
 *
 * Setup can always be skipped — nobody is held in a flow — which is the
 * header's right-hand corner, where a full-screen page keeps its way out.
 */
export function OnboardingFrame({
  step,
  reached,
  onStage,
  onSkip,
  sheet,
  children,
}: {
  step: OnboardingStep
  /** The furthest stage the workspace has reached. */
  reached: OnboardingStage
  onStage: (stage: OnboardingStage) => void
  onSkip: () => void
  /** The needs sheet. */
  sheet: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  const current = ONBOARDING_STAGES.indexOf(STAGE_OF[step])
  const furthest = ONBOARDING_STAGES.indexOf(reached)

  return (
    <PageContainer variant="fullscreen" className="bg-secondary">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-quaternary bg-primary px-4 lg:px-6">
        <Logo className="size-7 shrink-0" />
        <nav aria-label={t('onboarding.progress')} className="min-w-0 flex-1">
          <ol className="flex items-center gap-1 overflow-x-auto">
            {ONBOARDING_STAGES.map((stage, i) => {
              const done = i < current
              const here = i === current
              const label = t(`onboarding.stages.${stage}`)
              return (
                <li key={stage} className="flex shrink-0 items-center gap-1">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="h-px w-4 bg-quaternary lg:w-6"
                    />
                  )}
                  <button
                    type="button"
                    disabled={i > furthest || here}
                    onClick={() => onStage(stage)}
                    aria-current={here ? 'step' : undefined}
                    aria-label={
                      done
                        ? t('onboarding.stageDone', { stage: label })
                        : here
                          ? t('onboarding.stageCurrent', { stage: label })
                          : undefined
                    }
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-md px-2 text-sm whitespace-nowrap transition-colors',
                      here &&
                        'bg-secondary font-medium text-primary-foreground',
                      done &&
                        'cursor-pointer text-secondary-foreground hover:bg-secondary hover:text-primary-foreground',
                      !here && !done && 'text-tertiary-foreground',
                      i > furthest && 'cursor-default',
                    )}
                  >
                    {done ? (
                      <CheckIcon
                        aria-hidden
                        weight="bold"
                        className="size-3.5 text-accent"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          'size-1.5 rounded-full',
                          here ? 'bg-accent' : 'bg-quaternary',
                        )}
                      />
                    )}
                    <span className={cn(!here && 'hidden md:inline')}>
                      {label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {t('onboarding.skip')}
        </Button>
      </header>

      <div className="mx-auto grid w-full max-w-[1120px] flex-1 grid-cols-1 items-start gap-4 px-4 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-10">
        <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
          {children}
        </div>
        <aside className="order-1 lg:sticky lg:top-10 lg:order-2">
          {sheet}
        </aside>
      </div>
    </PageContainer>
  )
}

/**
 * One step's card: the title, a line saying why it is asked, the work, and the
 * way on. A step that needs more than one card passes the rest as `after`.
 */
export function StepCard({
  title,
  lead,
  children,
  footer,
}: {
  title: string
  lead?: ReactNode
  children?: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-6 bg-primary px-5 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl leading-8 font-medium tracking-tight text-balance">
          {title}
        </h1>
        {lead && (
          <p className="max-w-[60ch] text-sm leading-5 text-secondary-foreground">
            {lead}
          </p>
        )}
      </div>
      {children}
      {footer}
    </section>
  )
}

/**
 * The `accent` variant has no disabled look of its own, so a step's way on
 * would read as ready while it waits on an answer. Onboarding's buttons carry
 * `neutral`'s disabled face instead.
 */
export const DISABLED_ACCENT =
  'disabled:bg-tertiary disabled:text-quaternary-foreground'

/** Back on the left, the way on on the right — the same in every step. */
export function StepFooter({
  onBack,
  next,
  note,
}: {
  onBack?: () => void
  next: ReactNode
  note?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 border-t border-quaternary pt-5">
      {note && (
        <p className="text-sm leading-5 text-tertiary-foreground">{note}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="ghost" onClick={onBack}>
            {t('onboarding.back')}
          </Button>
        ) : (
          <span />
        )}
        {next}
      </div>
    </div>
  )
}
