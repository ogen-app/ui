import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { CaretLeftIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { formatDay } from '@/components/entitlements/parts'
import { PlanSummary } from '@/components/tiers/PlanSummary'
import { TierCard } from '@/components/tiers/TierCard'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useSelectTier, useTiers } from '@/hooks/useTiers'
import { toast } from '@/stores/toastStore'
import type { Tier } from '@/types/tiers'

/**
 * `/workspace-settings/plan` — what this workspace is on, and what else there
 * is (CON-232).
 *
 * Its own screen rather than a card in Workspace Settings: it is the one place
 * in the app that talks *about* the plan rather than being gated by it, it is
 * read a few times a year, and it wants the width to put the tiers side by
 * side. Workspace Settings links to it.
 *
 * **Nothing here charges anyone.** The tier list and the plan both come off a
 * local stub (`services/api/tiers.stub.ts`), and choosing a plan changes what
 * the workspace is allowed to do and nothing else. The screen says so, in a
 * line that cannot be dismissed, for as long as that is true.
 */
export function PlanPage() {
  const { t, i18n } = useTranslation()
  const plan = useWorkspacePlan()
  const tiers = useTiers()
  const select = useSelectTier()

  const choose = (tier: Tier) => {
    select.mutate(tier.id, {
      onSuccess: (next) => {
        // Which of the two happened is the server's answer, read back off the
        // plan it returned — not predicted from the click. A client that
        // guessed would have to rank the tiers to do it.
        if (next.tier.scheduled) {
          toast.success(
            t('tiers.changeScheduled', {
              name: next.tier.scheduled.name,
              when: formatDay(next.tier.scheduled.effectiveFrom, i18n.language),
            }),
          )
        } else {
          toast.success(t('tiers.changedNow', { name: next.tier.name }))
        }
      },
      onError: () => toast.error(t('tiers.changeFailed')),
    })
  }

  const cancelChange = () => {
    // Choosing the tier already held is what calls a scheduled change off —
    // one endpoint, not a second one that could disagree with it.
    if (!plan.data) return
    select.mutate(plan.data.tier.id, {
      onSuccess: () => toast.success(t('tiers.changeCancelled')),
      onError: () => toast.error(t('tiers.changeFailed')),
    })
  }

  if (plan.isLoading || tiers.isLoading) {
    return (
      <PlanFrame>
        <PageLoader />
      </PlanFrame>
    )
  }

  if (plan.isError || tiers.isError || !plan.data || !tiers.data) {
    return (
      <PlanFrame>
        <PageError header={t('tiers.planLoadFailed')} />
      </PlanFrame>
    )
  }

  const held = plan.data.tier
  const offered = tiers.data.filter((tier) => tier.available)
  // A tier the workspace holds but that is no longer sold will not be in the
  // list above. That is the expected case, not an error — hence the label
  // rather than a fallback that tried to render it as a fourth card.
  const retired = !offered.some((tier) => tier.id === held.id)

  return (
    <PlanFrame>
      <PlanSummary
        tier={held}
        retired={retired}
        onCancelChange={cancelChange}
        busy={select.isPending}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offered.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            current={tier.id === held.id}
            scheduled={held.scheduled?.id === tier.id}
            onChoose={choose}
            busy={select.isPending}
          />
        ))}
      </div>
    </PlanFrame>
  )
}

function PlanFrame({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <PageContainer variant="fullFlex">
      <div className="flex h-0 grow flex-col overflow-y-auto">
        <PageHeader
          title={t('tiers.planTitle')}
          fadeOnScroll
          back={
            <Button
              variant="headerIcon"
              size="excluded"
              asChild
              aria-label={t('tiers.planBack')}
            >
              <Link to="/workspace-settings">
                <CaretLeftIcon className="size-5" />
              </Link>
            </Button>
          }
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 pb-10 pt-4 lg:px-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-tertiary-foreground">{t('tiers.planIntro')}</p>
            <p className="text-[13px] text-tertiary-foreground">{t('tiers.planMock')}</p>
          </div>
          {children}
        </div>
      </div>
    </PageContainer>
  )
}
