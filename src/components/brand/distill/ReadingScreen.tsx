import type { ReactNode } from 'react'
import {
  CheckCircleIcon,
  CheckIcon,
  CircleIcon,
  InfoIcon,
  ProhibitIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import {
  currentStep,
  pageKind,
  pagePath,
  readSteps,
  readableCount,
  runRoute,
  type ReadStep,
} from '@/lib/brandDistill'
import type { DistillRun, DistillSource } from '@/types/brandDistill'

/**
 * A run while it works (CON-400 board 2B) — a page of its own, so a reload or
 * another tab finds it again (`/foundation/read/:runId`).
 *
 * **The checklist is AssessProgress's**: a green tick for a step done, an
 * orange dot with a ping for the step in hand, a grey circle for what is to
 * come. A read takes minutes, and knowing how much is left beats a spinner.
 *
 * **Under it, the run's own sources, live.** Each row moves as the event bus
 * reports it — the teal loader is the reading state the Assets list already
 * uses, so a page being read looks the same here as it does there. A page the
 * workspace's quota stopped says so in words rather than in red: it is a limit
 * doing its job, not a failure, and the read carries on without it.
 *
 * And it says, in so many words, that you can leave: the run carries on, a
 * notification says when it is ready, and nothing is saved until you say so.
 */
export function ReadingScreen({ run }: { run: DistillRun }) {
  const { t } = useTranslation()
  const route = runRoute(run)

  return (
    <>
      <section className="mx-auto flex w-full max-w-content flex-col gap-5 bg-primary px-6 py-6">
        <Checklist run={run} />
        {run.sources.length > 0 && (
          <ul className="flex flex-col border-t border-quaternary">
            {run.sources.map((source, i) => (
              <SourceRow
                key={source.assetId || i}
                source={source}
                active={i === firstPending(run.sources)}
              />
            ))}
          </ul>
        )}
        <p className="text-sm leading-5 text-secondary-foreground">
          {t('brand.distill.reading.leave')}
        </p>
      </section>
      {route === 'website' && (
        <aside className="mx-auto flex w-full max-w-content items-start gap-3 bg-primary px-6 py-5">
          <InfoIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-tertiary-foreground"
          />
          <p className="text-sm leading-5 text-secondary-foreground">
            {t('brand.distill.reading.pagesLand')}
          </p>
        </aside>
      )}
    </>
  )
}

/** The page being read right now — the first one still waiting. */
function firstPending(sources: DistillSource[]): number {
  return sources.findIndex((s) => s.status === 'pending')
}

function Checklist({ run }: { run: DistillRun }) {
  const { t } = useTranslation()
  const steps = readSteps(run)
  const at = steps.indexOf(currentStep(run))

  return (
    <ol className="flex flex-col gap-1.5">
      {steps.map((step, i) => {
        const done = i < at
        const active = i === at
        return (
          <li
            key={step}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors duration-300',
              done
                ? 'text-secondary-foreground'
                : active
                  ? 'font-medium text-foreground'
                  : 'text-tertiary-foreground',
            )}
          >
            <Glyph>
              {done ? (
                <CheckIcon
                  aria-hidden
                  weight="bold"
                  className="size-4 text-positive animate-step-tick"
                />
              ) : active ? (
                <span className="relative flex size-4 items-center justify-center">
                  <span
                    aria-hidden
                    className="absolute size-1.5 rounded-full bg-warning animate-step-ping"
                  />
                  <span
                    aria-hidden
                    className="relative size-1.5 rounded-full bg-warning"
                  />
                </span>
              ) : (
                <CircleIcon aria-hidden className="size-4" />
              )}
            </Glyph>
            <span>{stepLabel(t, step, run)}</span>
            <StepDetail step={step} run={run} done={done} active={active} />
          </li>
        )
      })}
    </ol>
  )
}

function stepLabel(t: TFunction, step: ReadStep, run: DistillRun): string {
  switch (step) {
    case 'finding':
      return t('brand.distill.reading.steps.finding')
    case 'reading':
      return runRoute(run) === 'website'
        ? t('brand.distill.reading.steps.readingPages')
        : t('brand.distill.reading.steps.readingFiles')
    case 'drafting':
      return t('brand.distill.reading.steps.drafting')
    case 'checking':
      return runRoute(run) === 'questions'
        ? t('brand.distill.reading.steps.checkingAnswers')
        : t('brand.distill.reading.steps.checking')
  }
}

/** The figure beside a step — `84 found, 10 chosen`, `6 of 10`. */
function StepDetail({
  step,
  run,
  done,
  active,
}: {
  step: ReadStep
  run: DistillRun
  done: boolean
  active: boolean
}) {
  const { t } = useTranslation()
  let detail: string | null = null
  if (step === 'finding' && done && run.website) {
    detail = run.website.mapped
      ? t('brand.distill.reading.found', {
          count: run.website.pagesFound,
          chosen: run.sources.length,
        })
      : t('brand.distill.reading.homepageOnly')
  }
  if (step === 'reading' && (active || done) && run.sources.length > 0) {
    detail = t('brand.distill.reading.progress', {
      // Pages read, not pages settled: one the quota stopped is accounted
      // for in its own row, and counting it here would say it was read.
      done: readableCount(run),
      total: run.sources.length,
    })
  }
  if (!detail) return null
  return (
    <span className="font-normal text-tertiary-foreground tabular-nums">
      {detail}
    </span>
  )
}

function SourceRow({
  source,
  active,
}: {
  source: DistillSource
  /** The row being read now — the teal loader, rather than a grey circle. */
  active: boolean
}) {
  const { t } = useTranslation()
  const name =
    source.role === 'website' && source.url
      ? pagePath(source.url)
      : source.title

  const { mark, note, tone } = sourceState(t, source, active)

  return (
    <li className="flex min-h-10 items-center gap-3 border-b border-quaternary py-2.5">
      <span className="flex size-4 shrink-0 items-center justify-center">
        {mark}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          source.status === 'pending' && !active && 'text-secondary-foreground',
          (source.status === 'skipped_quota' ||
            source.status === 'thin' ||
            source.status === 'failed' ||
            source.status === 'timed_out') &&
            'text-tertiary-foreground',
        )}
      >
        {name}
      </span>
      {note && <span className={cn('shrink-0 text-xs', tone)}>{note}</span>}
    </li>
  )
}

/**
 * What one row of the list shows: its mark, and the word at the far end. A
 * page that was read says what it was read *for* — home, about, what you sell —
 * because that is the question somebody watching ten paths scroll past is
 * actually asking.
 */
function sourceState(
  t: TFunction,
  source: DistillSource,
  active: boolean,
): { mark: ReactNode; note: string | null; tone?: string } {
  switch (source.status) {
    case 'ready':
    case 'partial': {
      const kind =
        source.role === 'website' && source.url ? pageKind(source.url) : null
      return {
        mark: (
          <CheckCircleIcon
            weight="fill"
            aria-hidden
            className="size-4 text-positive"
          />
        ),
        note: kind
          ? t(`brand.distill.reading.kind.${kind}`)
          : source.truncated
            ? t('brand.distill.reading.truncated')
            : null,
        tone: 'text-tertiary-foreground',
      }
    }
    case 'pending':
      return active
        ? {
            mark: (
              <HugeiconsIcon
                icon={Loading03Icon}
                size={16}
                strokeWidth={2}
                aria-hidden
                className="text-accent motion-safe:animate-spin"
              />
            ),
            note: t('brand.distill.reading.reading'),
            tone: 'text-accent',
          }
        : {
            mark: (
              <CircleIcon
                aria-hidden
                className="size-4 text-senary-foreground"
              />
            ),
            note: null,
          }
    case 'skipped_quota':
      return {
        mark: <Skipped />,
        note: t('brand.distill.reading.overLimit'),
        tone: 'text-tertiary-foreground',
      }
    case 'thin':
      return {
        mark: <Skipped />,
        note: t('brand.distill.reading.thin'),
        tone: 'text-tertiary-foreground',
      }
    case 'timed_out':
      return {
        mark: <Skipped />,
        note: t('brand.distill.reading.timedOut'),
        tone: 'text-tertiary-foreground',
      }
    case 'failed':
      return {
        mark: (
          <WarningCircleIcon
            aria-hidden
            className="size-4 text-tertiary-foreground"
          />
        ),
        note: t('brand.distill.reading.failed'),
        tone: 'text-tertiary-foreground',
      }
  }
}

function Skipped() {
  return <ProhibitIcon aria-hidden className="size-4 text-senary-foreground" />
}

/** The shared 16px icon column, as in `AssessProgress`. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center"
    >
      {children}
    </span>
  )
}
