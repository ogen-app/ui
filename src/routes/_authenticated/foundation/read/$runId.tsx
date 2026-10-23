import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PageError } from '@/components/page-primitives/PageError'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { DistillPage } from '@/components/brand/distill/DistillPage'
import { ReadingScreen } from '@/components/brand/distill/ReadingScreen'
import {
  ReviewBar,
  ReviewScreen,
} from '@/components/brand/distill/ReviewScreen'
import { ClosedRun, FailedRun } from '@/components/brand/distill/RunOutcome'
import { useBrand } from '@/hooks/useBrand'
import { useDistillRun } from '@/hooks/useBrandDistill'
import { isRunOpen, runRoute } from '@/lib/brandDistill'
import { sourceLabel } from '@/lib/brandDistillCopy'
import { useBrandDistillStore } from '@/stores/brandDistillStore'
import type { DistillRun } from '@/types/brandDistill'

/**
 * `/foundation/read/:runId` — one brand read (CON-400), from the moment it
 * starts to the moment it is saved.
 *
 * **One address for the whole life of a run**, so a reload or another tab
 * lands on whatever it is now: the checklist while it reads, the review once
 * it is `ready`, the outcome when it is over. The page asks the run and draws
 * its status; nothing here keeps a phase of its own.
 *
 * A run that answers were given to is `superseded` by the one they made, and
 * this page follows it there — `replace`d, so back goes to the hub rather
 * than to a review that no longer exists — carrying the review over by
 * proposal id.
 */
export const Route = createFileRoute('/_authenticated/foundation/read/$runId')({
  component: ReadPage,
})

function ReadPage() {
  const { t } = useTranslation()
  const { runId } = Route.useParams()
  const navigate = useNavigate()
  const run = useDistillRun(runId)
  const brand = useBrand()
  const carryReview = useBrandDistillStore((s) => s.carryReview)

  const child = run.data?.status === 'superseded' ? run.data.childRunId : null
  useEffect(() => {
    if (!child) return
    carryReview(runId, child)
    void navigate({
      to: '/foundation/read/$runId',
      params: { runId: child },
      replace: true,
    })
  }, [child, runId, carryReview, navigate])

  if (run.isPending || child) {
    return (
      <DistillPage>
        <PageLoader />
      </DistillPage>
    )
  }

  // Missing data, not a failed read: a background poll that fails keeps the
  // run it had, and a network blip is no reason to say the run is gone.
  if (!run.data) {
    return (
      <DistillPage>
        <PageError
          header={t('brand.distill.page.missingHeader')}
          message={t('brand.distill.page.missingMessage')}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/foundation' })}
            >
              <span className="uppercase">
                {t('brand.distill.closed.back')}
              </span>
            </Button>
          }
        />
      </DistillPage>
    )
  }

  const data = run.data
  const proposal = data.status === 'ready' ? data.proposal : null

  return (
    <DistillPage
      title={pageTitle(t, data)}
      bar={proposal ? <ReviewBar run={data} proposal={proposal} /> : undefined}
    >
      {isRunOpen(data.status) ? (
        <ReadingScreen run={data} />
      ) : proposal ? (
        <ReviewScreen run={data} proposal={proposal} brand={brand.data} />
      ) : data.status === 'failed' ? (
        <FailedRun run={data} />
      ) : (
        <ClosedRun run={data} />
      )}
    </DistillPage>
  )
}

/**
 * "Reading acme-roasters.com" while it reads, "What we read off
 * acme-roasters.com" once there is something to review — the same source,
 * named for what the page is doing with it.
 */
function pageTitle(t: TFunction, run: DistillRun): string {
  const route = runRoute(run)
  const label = sourceLabel(t, run)
  const reading = isRunOpen(run.status) || run.status === 'failed'
  if (route === 'questions')
    return reading
      ? t('brand.distill.page.draftingAnswers')
      : t('brand.distill.page.fromAnswers')
  if (reading) return t('brand.distill.page.reading', { what: label })
  return route === 'website'
    ? t('brand.distill.page.readOff', { what: label })
    : t('brand.distill.page.readIn', { what: label })
}
