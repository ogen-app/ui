import {
  ChatCircleTextIcon,
  CheckCircleIcon,
  GlobeIcon,
  ProhibitIcon,
  StackIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useRequestDistill } from '@/hooks/useBrandDistill'
import { formatDate } from '@/lib/intl'
import { pagePath, runRoute, type RunRoute } from '@/lib/brandDistill'
import type { DistillRun, DistillSource } from '@/types/brandDistill'
import { StarterCard } from '../shell'

/**
 * How a read ended when it did not end in a review (CON-400 board 6B, and the
 * statuses around it).
 *
 * **There is no dead end.** `no_usable_sources` — a site that builds its pages
 * in the browser, a scan with no text in it — says why in plain words, shows
 * what each source came to, says the read was not charged, and offers the
 * other two routes as the same tiles the hub offers. Any other failure is the
 * same card with TRY AGAIN, which asks for the same read once more.
 */
export function FailedRun({ run }: { run: DistillRun }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { request, refusal } = useRequestDistill()
  const route = runRoute(run)
  const nothingToRead = run.failure?.code === 'no_usable_sources'

  const retry = () =>
    request.mutate(
      route === 'website' && run.website
        ? { websiteUrl: run.website.url }
        : route === 'document'
          ? { assetIds: run.sources.map((s) => s.assetId) }
          : { answers: run.answers },
    )

  const others = (['website', 'document', 'questions'] as RunRoute[]).filter(
    (r) => r !== route,
  )
  const icons = {
    website: GlobeIcon,
    document: StackIcon,
    questions: ChatCircleTextIcon,
  }

  return (
    <section className="mx-auto flex w-full max-w-content flex-col gap-4 bg-primary px-6 py-6">
      <header className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium leading-6 tracking-tight">
          <WarningIcon aria-hidden className="size-5 shrink-0 text-warning" />
          {nothingToRead
            ? t(`brand.distill.failed.nothingTitle.${route}` as const)
            : t('brand.distill.failed.title')}
        </h2>
        <p className="max-w-2xl text-sm leading-5 text-secondary-foreground">
          {nothingToRead
            ? t(`brand.distill.failed.nothingBody.${route}` as const, {
                count: run.sources.length,
              })
            : t(failureKey(run.failure?.code))}
        </p>
      </header>

      {nothingToRead && run.sources.length > 0 && (
        <ul className="flex flex-col border-t border-quaternary">
          {run.sources.map((source, i) => (
            <SourceOutcome key={source.assetId || i} source={source} />
          ))}
        </ul>
      )}

      {nothingToRead ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">
            {t('brand.distill.failed.tryInstead')}
          </p>
          {others.map((other) => (
            <StarterCard
              key={other}
              icon={icons[other]}
              title={t(`brand.shell.offer.${other}.title` as const)}
              body={t(`brand.distill.failed.instead.${other}` as const)}
              caret="right"
              onClick={() =>
                other === 'questions'
                  ? navigate({ to: '/foundation/questions' })
                  : navigate({ to: '/foundation' })
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          {refusal && (
            <p role="alert" className="text-xs text-destructive">
              {t(`brand.distill.refusal.${refusal}`)}
            </p>
          )}
          <Button
            variant="defaultInverted"
            loading={request.isPending}
            onClick={retry}
          >
            {t('brand.distill.failed.tryAgain')}
          </Button>
        </div>
      )}
    </section>
  )
}

function failureKey(code: string | undefined) {
  switch (code) {
    case 'scraping_unavailable':
      return 'brand.distill.failed.reason.scraping' as const
    case 'model_refused':
      return 'brand.distill.failed.reason.refused' as const
    case 'limit_reached':
    case 'entitlement_disabled':
      return 'brand.distill.failed.reason.plan' as const
    default:
      return 'brand.distill.failed.reason.internal' as const
  }
}

/** What one source came to — the page, and that it had too little to read. */
function SourceOutcome({ source }: { source: DistillSource }) {
  const { t } = useTranslation()
  const name =
    source.role === 'website' && source.url
      ? pagePath(source.url)
      : source.title
  return (
    <li className="flex min-h-10 items-center gap-3 border-b border-quaternary py-2.5">
      <ProhibitIcon
        aria-hidden
        className="size-4 shrink-0 text-senary-foreground"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-secondary-foreground">
        {name}
      </span>
      <span className="shrink-0 text-xs text-tertiary-foreground">
        {t(`brand.distill.failed.source.${outcomeOf(source)}` as const)}
      </span>
    </li>
  )
}

function outcomeOf(
  source: DistillSource,
): 'thin' | 'failed' | 'overLimit' | 'timedOut' | 'read' {
  switch (source.status) {
    case 'thin':
      return 'thin'
    case 'failed':
      return 'failed'
    case 'skipped_quota':
      return 'overLimit'
    case 'timed_out':
      return 'timedOut'
    default:
      return 'read'
  }
}

/**
 * A run that is over without a review to show: saved, discarded, or left long
 * enough to expire. One card each, and a way back to the hub — a committed
 * run's material is already in its usual cards, and that is where to look.
 */
export function ClosedRun({ run }: { run: DistillRun }) {
  const { t, i18n } = useTranslation()
  const committed = run.status === 'committed'
  const when =
    committed && run.committedAt
      ? formatDate(
          run.committedAt,
          { day: 'numeric', month: 'long', year: 'numeric' },
          i18n.language,
        )
      : null

  return (
    <section className="mx-auto flex w-full max-w-content flex-col gap-3 bg-primary px-6 py-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-medium leading-6 tracking-tight">
        {committed && (
          <CheckCircleIcon
            weight="fill"
            aria-hidden
            className="size-5 shrink-0 text-positive"
          />
        )}
        {t(`brand.distill.closed.${closedKind(run)}.title` as const)}
      </h2>
      <p className="max-w-2xl text-sm leading-5 text-secondary-foreground">
        {committed && when
          ? t('brand.distill.closed.committed.bodyOn', { date: when })
          : t(`brand.distill.closed.${closedKind(run)}.body` as const)}
      </p>
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/foundation">{t('brand.distill.closed.back')}</Link>
        </Button>
      </div>
    </section>
  )
}

function closedKind(run: DistillRun): 'committed' | 'discarded' | 'expired' {
  return run.status === 'committed'
    ? 'committed'
    : run.status === 'expired'
      ? 'expired'
      : 'discarded'
}
