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
import { TierComparison } from '@/components/tiers/TierComparison'
import { recommendedPlan } from '@/lib/upgradeOffer'
import { ZIndex } from '@/config/zIndex'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useSelectTier, useTiers } from '@/hooks/useTiers'
import { useCanChangePlan } from '@/hooks/useWorkspaces'
import { toast } from '@/stores/toastStore'
import type { Tier } from '@/types/tiers'
import { awaiting } from '@/lib/fetched'

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
  /**
   * Who is reading. A member gets the comparison and no controls — the screen
   * is a price list as well as a chooser, and the half of it that is a price
   * list is worth reading before anyone goes and asks an owner for anything.
   */
  const mayChange = useCanChangePlan()

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

  // `awaiting`, not `isLoading` — see `lib/fetched`.
  if (awaiting(plan) || awaiting(tiers)) {
    return (
      <PlansFrame mayChange={mayChange}>
        <PageLoader />
      </PlansFrame>
    )
  }

  if (plan.isError || tiers.isError || !plan.data || !tiers.data) {
    return (
      <PlansFrame mayChange={mayChange}>
        <PageError header={t('tiers.planLoadFailed')} />
      </PlansFrame>
    )
  }

  const held = plan.data.tier
  // `GET /api/public/pricing` publishes only purchasable versions, so this
  // filter is a guard rather than a selection — it keeps a card off the screen
  // that could not be chosen if the endpoint ever sends one.
  const offered = tiers.data.filter((tier) => tier.purchasable)
  // A version the workspace holds but that is no longer sold will not be in the
  // list above — and neither is the internal `default` tier every workspace sits
  // on today. That is the expected case, not an error: hence the label, rather
  // than a fallback that tried to render the held version as one more card.
  const retired = !offered.some((tier) => tier.id === held.id)
  const recommended = recommendedPlan(offered)

  return (
    <PlansFrame mayChange={mayChange}>
      {/* Only when it says something the cards cannot: the held plan is not
          among them, or a change is waiting on its date. Otherwise the plan in
          force is the card marked Current, and a second statement of it above
          the cards is the intro this page no longer has. */}
      {(retired || held.scheduled) && (
        <PlanSummary
          tier={held}
          retired={retired}
          mayChange={mayChange}
          onCancelChange={cancelChange}
          busy={select.isPending}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {offered.map((tier, index) => (
          <TierCard
            key={tier.id}
            tier={tier}
            previous={offered[index - 1] ?? null}
            recommended={tier.id === recommended?.id}
            current={tier.id === held.id}
            scheduled={held.scheduled?.id === tier.id}
            mayChoose={mayChange}
            onChoose={choose}
            busy={select.isPending}
          />
        ))}
      </div>

      <TierComparison tiers={offered} />

      {/* Not an Explainer and not dismissible — see the catalogue entry. Under
          the table rather than over the cards: it qualifies every button on the
          page, and at the top it was the intro this page no longer has. */}
      <p className="text-[13px] text-tertiary-foreground">
        {t('tiers.planMock')}
      </p>
    </PlansFrame>
  )
}

function PlansFrame({
  children,
  mayChange,
}: {
  children: React.ReactNode
  mayChange: boolean
}) {
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
    // White edge to edge: the page is one sheet the cards sit on, not the app's
    // grey canvas with cards floating over it.
    <PageContainer variant="fullFlex" className="bg-primary">
      {/* The heading and the X on one bar, outside the scroller, so the way
          out stays exactly where it was when the page scrolls — the way a
          dialog's close button does. */}
      <header
        className="flex h-16 shrink-0 items-center border-b border-border"
        style={{ zIndex: ZIndex.pageHeader }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
          <h1 className="font-display text-xl font-medium tracking-tight min-w-0 truncate">
            {t('tiers.plansTitle')}
          </h1>
          <Button
            variant="ghost"
            size="defaultIcon"
            onClick={close}
            aria-label={t('tiers.plansClose')}
          >
            <XIcon className="size-5" />
          </Button>
        </div>
      </header>

      <div className="flex h-0 grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-10 lg:px-6">
          {/* Said once, at the top, rather than on each card: with no CHOOSE
              buttons anywhere the page needs one line explaining why, not
              three copies of a disabled control. */}
          {!mayChange && (
            <p className="text-[13px] text-tertiary-foreground">
              {t('tiers.ownersOnlyPlan')}
            </p>
          )}
          {children}
        </div>
      </div>
    </PageContainer>
  )
}
