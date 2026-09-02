import { useTranslation } from 'react-i18next'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { XIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { formatDay } from '@/components/entitlements/parts'
import { PlanSummary } from '@/components/tiers/PlanSummary'
import { TierCard } from '@/components/tiers/TierCard'
import { ZIndex } from '@/config/zIndex'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useSelectTier, useTiers } from '@/hooks/useTiers'
import { toast } from '@/stores/toastStore'
import type { Tier } from '@/types/tiers'

/**
 * `/plans` — every plan there is, over the whole screen (CON-232).
 *
 * **Deliberately outside `_authenticated`**, like `/workspaces`: choosing a
 * plan is a decision about the workspace rather than work inside it, and the
 * sidebar's every item — campaigns, content bank, settings — is a distraction
 * from a comparison that wants the width. Auth is still guarded once, in
 * `__root.tsx`. Two consequences of living out here are worth knowing: the
 * broadcast stream (`useEventStream`) is closed while this is open, and the
 * reference caches warm again on the way back. Both are fine for a screen
 * somebody reads a few times a year and leaves.
 *
 * It reads as a modal — one X, top right, nothing else — because that is what
 * it is: a detour that every entry point returns from. Which is why the X goes
 * *back* rather than to a fixed address; people arrive here from the Plan &
 * billing card today and from a lock on a button tomorrow.
 *
 * **Nothing here charges anyone.** The tier list and the plan both come off a
 * local stub (`services/api/tiers.stub.ts`); choosing changes what the
 * workspace is allowed to do and nothing else. The screen says so, in a line
 * that cannot be dismissed, for as long as that is true.
 */
export function PlansPage() {
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
      <PlansFrame>
        <PageLoader />
      </PlansFrame>
    )
  }

  if (plan.isError || tiers.isError || !plan.data || !tiers.data) {
    return (
      <PlansFrame>
        <PageError header={t('tiers.planLoadFailed')} />
      </PlansFrame>
    )
  }

  const held = plan.data.tier
  const offered = tiers.data.filter((tier) => tier.available)
  // A tier the workspace holds but that is no longer sold will not be in the
  // list above. That is the expected case, not an error — hence the label
  // rather than a fallback that tried to render it as a fourth card.
  const retired = !offered.some((tier) => tier.id === held.id)

  return (
    <PlansFrame>
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
    </PlansFrame>
  )
}

function PlansFrame({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  /**
   * Back where they came from, or to Workspace Settings.
   *
   * The fallback matters more than it looks: this URL is shareable and will be
   * linked from upgrade prompts, so "close" has to mean something for someone
   * whose history starts here. Workspace Settings holds the Plan & billing
   * card, which is the only other place the plan is spoken about.
   */
  const close = () => {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/workspace-settings' })
  }

  return (
    <PageContainer variant="fullFlex">
      {/* Fixed rather than sticky: this route owns the viewport, so the one
          control on it should stay exactly where it was when the page scrolls
          — the way a dialog's close button does. */}
      <Button
        variant="ghost"
        size="defaultIcon"
        onClick={close}
        aria-label={t('tiers.plansClose')}
        className="fixed right-4 top-4"
        style={{ zIndex: ZIndex.pageHeader }}
      >
        <XIcon className="size-5" />
      </Button>

      <div className="flex h-0 grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-16 lg:px-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-medium tracking-tight">
              {t('tiers.plansTitle')}
            </h1>
            <p className="text-sm text-tertiary-foreground">
              {t('tiers.planIntro')}
            </p>
            <p className="text-[13px] text-tertiary-foreground">
              {t('tiers.planMock')}
            </p>
          </div>
          {children}
        </div>
      </div>
    </PageContainer>
  )
}
