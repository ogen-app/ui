import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useCanGoBack,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import {
  FlaskIcon,
  HourglassIcon,
  InfoIcon,
  XIcon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { NoticeShell, formatDay } from '@/components/entitlements/parts'
import { ChangePlanDialog } from '@/components/tiers/ChangePlanDialog'
import { CheckoutWait } from '@/components/tiers/CheckoutWait'
import { LeaveHiddenTierDialog } from '@/components/tiers/LeaveHiddenTierDialog'
import { PlanLedger, type LedgerColumn } from '@/components/tiers/PlanLedger'
import { PlanSummary } from '@/components/tiers/PlanSummary'
import { ZIndex } from '@/config/zIndex'
import { useOpenBillingPortal } from '@/hooks/useBilling'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useEventStream } from '@/hooks/useEventStream'
import { useChangePlan, useTiers } from '@/hooks/useTiers'
import { useCanChangePlan, useWorkspace } from '@/hooks/useWorkspaces'
import { subscribed } from '@/lib/billingGate'
import {
  complimentaryEnded,
  forgetComplimentary,
  noteComplimentary,
} from '@/lib/complimentaryMemory'
import {
  complimentaryColumns,
  isComplimentaryPicker,
} from '@/lib/complimentaryPlans'
import { awaiting } from '@/lib/fetched'
import { planChangeMessage } from '@/lib/planChange'
import { clearPlanIntent, readPlanIntent } from '@/lib/planIntent'
import {
  billingOptions,
  recommendedPlan,
  yearlySavingPercent,
} from '@/lib/upgradeOffer'
import { PlanChangeError } from '@/services/api/tiers'
import { toast } from '@/stores/toastStore'
import type { TierVersionPrice, WorkspacePlan } from '@/types/entitlements'
import type { PlanCheckout, Tier } from '@/types/tiers'

type Interval = TierVersionPrice['interval']

/**
 * `/plans` — every plan there is, and the billing gate (CON-232, CON-328).
 *
 * **Deliberately outside `_authenticated`**, like `/workspaces`: choosing a
 * plan is a decision about the workspace rather than work inside it. Auth is
 * still guarded once, in `__root.tsx`. One consequence: the app's event stream
 * is not open out here, so this screen opens it itself (`useEventStream`)
 * while it waits for a checkout to land.
 *
 * It is four screens behind one address, chosen in this order:
 *
 * 1. **Waiting for the provider** — back from checkout (`?billing=return`), or
 *    this tab opened checkout in another one. See `CheckoutWait`.
 * 2. **Waiting on the owner** — a member of a gated workspace. They read the
 *    plans; only an owner can choose.
 * 3. **The gate** — an owner of a workspace with no plan. No X: there is
 *    nowhere to go back to, so the ways out are another workspace and signing
 *    out.
 * 4. **The plans** — anybody else, with an X that goes back. A tester's
 *    complimentary workspace (CON-402) gets them with no money on the page:
 *    no prices, no interval, and a click switches the tier in place.
 *
 * What a click does is the server's call: no live subscription and it mints a
 * Lemon Squeezy checkout, opened in a new tab synchronously on the click (a
 * tab opened after the request has lost the gesture and is blocked); a live
 * one and it changes the plan in place, after a confirmation that states what
 * this click costs.
 */
export function PlansPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/plans/' })
  const returning = search.billing === 'return'
  const [opened, setOpened] = useState<PlanCheckout | null>(null)
  const [interval, setBillingInterval] = useState<Interval>('month')
  const [confirming, setConfirming] = useState<{
    tier: Tier
    price: TierVersionPrice | null
  } | null>(null)
  const [blocked, setBlocked] = useState(false)

  // The stream is only open inside `_authenticated`; this screen is outside it
  // and is the one that most needs to hear `entity:billing:<tenant>`.
  useEventStream()

  const workspace = useWorkspace()
  const mayChange = useCanChangePlan()
  const tiers = useTiers()
  const change = useChangePlan()
  const portal = useOpenBillingPortal()

  const awaitingCheckout = returning || opened !== null
  const plan = useWorkspacePlan({
    // After checkout, until a subscription shows; for a member, while the gate
    // is shut. Either way the events move it first — this is the backstop.
    pollWhile: (current) =>
      awaitingCheckout
        ? !subscribed(current)
        : current?.billing.required === true && !mayChange,
  })

  const gated = plan.data?.billing.required === true
  const memberWaiting = gated && !mayChange && workspace !== undefined

  // `/plans` sits outside `_authenticated`, so it remembers a comped
  // workspace itself as well (`lib/complimentaryMemory`).
  const workspaceId = workspace?.id
  useEffect(() => {
    noteComplimentary(workspaceId, plan.data)
  }, [workspaceId, plan.data])

  /**
   * The gate appeared because an operator ended this workspace's beta access
   * (CON-402) — said once, above the plans, so the owner is not left to guess
   * why a workspace that never asked for money suddenly does. Latched, then
   * forgotten, so a later visit to the gate does not say it again.
   */
  const [compEnded, setCompEnded] = useState(false)
  if (
    !compEnded &&
    gated &&
    mayChange &&
    complimentaryEnded(workspaceId, plan.data)
  ) {
    setCompEnded(true)
  }
  useEffect(() => {
    if (compEnded && workspaceId) forgetComplimentary(workspaceId)
  }, [compEnded, workspaceId])

  /** A comp switch away from a tier nobody can choose — asked first. */
  const [leaving, setLeaving] = useState<Tier | null>(null)

  // The tier the marketing link asked for, carried through signup. Read once;
  // `/plans` is where it is spent.
  const [intent] = useState(() => search.plan ?? readPlanIntent())
  useEffect(() => {
    clearPlanIntent()
  }, [])

  /**
   * Done waiting: the plan now shows a live subscription (after checkout), or
   * the gate has opened (for a member). Into the app, replacing this entry —
   * Back from the workspace should not land on a "finishing up" screen.
   */
  const [wasGated, setWasGated] = useState(false)
  if (memberWaiting && !wasGated) setWasGated(true)
  const done = awaitingCheckout
    ? subscribed(plan.data)
    : wasGated && plan.data !== undefined && !gated
  const left = useRef(false)
  useEffect(() => {
    if (!done || left.current) return
    left.current = true
    if (awaitingCheckout && plan.data) {
      toast.success(
        t('tiers.checkout.subscribed', { name: plan.data.tier.name }),
      )
    }
    void navigate({ to: '/', replace: true })
  }, [done, awaitingCheckout, navigate, plan.data, t])

  const workspaceName = workspace?.name ?? ''

  if (returning || opened) {
    return (
      <PlansFrame
        workspaceName={workspaceName}
        exits={gated ? 'gate' : 'close'}
      >
        <CheckoutWait
          workspace={workspaceName}
          opened={opened}
          onBack={opened ? () => setOpened(null) : undefined}
        />
      </PlansFrame>
    )
  }

  // `awaiting`, not `isLoading` — see `lib/fetched`.
  if (awaiting(plan) || awaiting(tiers)) {
    return (
      <PlansFrame workspaceName={workspaceName} exits="none">
        <PageLoader />
      </PlansFrame>
    )
  }

  if (plan.isError || tiers.isError || !plan.data || !tiers.data) {
    return (
      <PlansFrame workspaceName={workspaceName} exits="close">
        <PageError header={t('tiers.planLoadFailed')} />
      </PlansFrame>
    )
  }

  const current = plan.data
  const held = current.tier
  const live = subscribed(current)
  // Published only if purchasable — this filter is a guard, not a selection.
  const offered = tiers.data.filter((tier) => tier.purchasable)
  const retired = !offered.some((tier) => tier.tierId === held.tierId)

  if (isComplimentaryPicker(current)) {
    /**
     * Free and at once: the server's comp branch answers 200 with the plan,
     * which `useChangePlan` puts in the cache, so the columns move as the
     * toast lands. Never a checkout — if one ever came back, it is followed
     * rather than swallowed.
     */
    const switchTo = (tier: Tier) => {
      change.mutate(
        { tierId: tier.tierId },
        {
          onSuccess: (result) => {
            setLeaving(null)
            if (result.kind === 'checkout') {
              window.location.assign(result.checkout.url)
              return
            }
            toast.success(
              t('tiers.switched', { name: result.plan.tier.name }),
              { description: t('tiers.switchedBody') },
            )
          },
          onError: (error) => {
            setLeaving(null)
            toast.error(planChangeMessage(t, error))
          },
        },
      )
    }

    return (
      <PlansFrame workspaceName={workspaceName} exits="close">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="font-display text-5xl font-light tracking-tight">
            {t('tiers.ledger.compTitle')}
          </h1>
          <p className="max-w-xl text-base text-secondary-foreground">
            {t('tiers.ledger.compLead', { workspace: workspaceName })}
            <br />
            {t('tiers.ledger.compTryAny')}
          </p>
        </div>

        {!mayChange && (
          <p className="text-center text-[13px] text-secondary-foreground">
            {t('tiers.ownersOnlyPlan')}
          </p>
        )}

        {/* A tier the Ogen team set up is not among the columns, and leaving
            it is the one move that cannot be made back from here. */}
        {retired && (
          <NoticeShell
            icon={<FlaskIcon size={16} />}
            title={t('tiers.ledger.hiddenTierTitle', { name: held.name })}
          >
            {t('tiers.ledger.hiddenTierBody', { name: held.name })}
          </NoticeShell>
        )}

        {offered.length > 0 ? (
          <PlanLedger
            columns={complimentaryColumns(offered, held.tierId, mayChange)}
            interval="month"
            popularTierId={null}
            focusTierId={null}
            onChoose={(tier) => (retired ? setLeaving(tier) : switchTo(tier))}
            busy={change.isPending}
          />
        ) : (
          <p className="text-center text-sm text-secondary-foreground">
            {t('tiers.ledger.noneOnSale')}
          </p>
        )}

        <p className="text-center text-[13px] text-secondary-foreground">
          {t('tiers.ledger.compNote')}
        </p>

        {leaving && (
          <LeaveHiddenTierDialog
            heldName={held.name}
            target={leaving}
            busy={change.isPending}
            onConfirm={() => switchTo(leaving)}
            onClose={() => setLeaving(null)}
          />
        )}
      </PlansFrame>
    )
  }
  const popular = recommendedPlan(offered)
  const yearly = offered.some((tier) => billingOptions(tier).year !== null)
  const saving = yearly ? yearlySavingPercent(offered) : null
  const shownInterval: Interval = yearly ? interval : 'month'
  const preselected =
    mayChange && intent
      ? (offered.find((tier) => tier.tierId === intent && tier.available) ??
        null)
      : null

  /**
   * The free month is offered on the tier the price list marks, to a reader
   * whose account has not had one — "not false", so an unknown eligibility
   * still shows it; checkout then says whether it was really applied — and
   * only through checkout. A paying workspace never gets one.
   */
  const freeMonth = (tier: Tier) =>
    !live && tier.freeTrial && current.billing.trialEligible !== false
  /** Named in the comp-ended notice, when there is one to offer. */
  const freeMonthTier = offered.find(freeMonth) ?? null

  const columns: LedgerColumn[] = offered.map((tier) => ({
    tier,
    label: live
      ? tier.tierId === held.tierId
        ? 'current'
        : null
      : freeMonth(tier)
        ? 'freeMonthThen'
        : 'chargedToday',
    action: !mayChange
      ? { kind: 'none' }
      : live && tier.tierId === held.tierId
        ? { kind: 'held' }
        : held.scheduled?.tierId === tier.tierId
          ? { kind: 'scheduled' }
          : !tier.available || !billingOptions(tier)[shownInterval]?.available
            ? { kind: 'unavailable' }
            : { kind: 'choose', freeMonth: freeMonth(tier) },
  }))

  const announce = (next: WorkspacePlan) => {
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
  }

  /** No live subscription: a checkout, in a tab opened inside the click. */
  const checkout = (tier: Tier, price: TierVersionPrice | null) => {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    change.mutate(
      { tierId: tier.tierId, priceId: price?.id },
      {
        onSuccess: (result) => {
          if (result.kind === 'checkout') {
            if (tab) {
              tab.location.href = result.checkout.url
              setOpened(result.checkout)
            } else {
              // Pop-ups blocked: leave for the checkout in this tab instead.
              window.location.assign(result.checkout.url)
            }
            return
          }
          // The server changed the plan in place after all — a subscription
          // this tab had not heard of yet.
          tab?.close()
          announce(result.plan)
        },
        onError: (error) => {
          tab?.close()
          toast.error(planChangeMessage(t, error))
        },
      },
    )
  }

  const choose = (tier: Tier, price: TierVersionPrice | null) => {
    if (live) {
      setBlocked(false)
      setConfirming({ tier, price })
    } else {
      checkout(tier, price)
    }
  }

  const confirm = () => {
    if (!confirming) return
    change.mutate(
      { tierId: confirming.tier.tierId, priceId: confirming.price?.id },
      {
        onSuccess: (result) => {
          if (result.kind === 'checkout') {
            // Not expected with a live subscription, but the server decides.
            setConfirming(null)
            window.location.assign(result.checkout.url)
            return
          }
          setConfirming(null)
          announce(result.plan)
        },
        onError: (error) => {
          if (
            error instanceof PlanChangeError &&
            error.reason === 'trial_upgrade_unavailable'
          ) {
            setBlocked(true)
            return
          }
          setConfirming(null)
          toast.error(planChangeMessage(t, error))
        },
      },
    )
  }

  /** Choosing the tier already held is what calls a scheduled change off. */
  const cancelChange = () => {
    change.mutate(
      { tierId: held.tierId },
      {
        onSuccess: () => toast.success(t('tiers.changeCancelled')),
        onError: (error) => toast.error(planChangeMessage(t, error)),
      },
    )
  }

  return (
    <PlansFrame workspaceName={workspaceName} exits={gated ? 'gate' : 'close'}>
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-5xl font-light tracking-tight">
          {t('tiers.ledger.title')}
        </h1>
        {gated && (
          <p className="max-w-xl text-base text-secondary-foreground">
            {t('tiers.ledger.gatedLead', { workspace: workspaceName })}
          </p>
        )}
      </div>

      {/* A member of a workspace that is not gated reads the plans and cannot
          choose; one line says why, rather than a column of dead buttons. */}
      {!mayChange && !gated && (
        <p className="text-center text-[13px] text-secondary-foreground">
          {t('tiers.ownersOnlyPlan')}
        </p>
      )}

      {compEnded && (
        <NoticeShell
          icon={<InfoIcon size={16} />}
          title={t('tiers.ledger.compEndedTitle')}
        >
          {freeMonthTier
            ? t('tiers.ledger.compEndedBodyFreeMonth', {
                name: freeMonthTier.name,
              })
            : t('tiers.ledger.compEndedBody')}
        </NoticeShell>
      )}

      {memberWaiting && (
        <NoticeShell
          icon={<HourglassIcon size={16} />}
          title={t('tiers.ledger.waitingTitle')}
        >
          {t('tiers.ledger.waitingBody', { workspace: workspaceName })}
        </NoticeShell>
      )}

      {/* Only when it says something the columns cannot: the held plan is not
          among them, or a change is waiting on its date. */}
      {!gated && (retired || held.scheduled) && (
        <PlanSummary
          tier={held}
          retired={retired}
          mayChange={mayChange}
          onCancelChange={cancelChange}
          busy={change.isPending}
        />
      )}

      {yearly && (
        <div className="flex items-center justify-center gap-3">
          <Tabs
            value={shownInterval}
            onValueChange={(value) => setBillingInterval(value as Interval)}
          >
            <TabsList
              variant="segmented"
              size="excluded"
              aria-label={t('tiers.paywall.billing')}
            >
              <TabsTrigger variant="segmented" value="month">
                {t('tiers.paywall.monthly')}
              </TabsTrigger>
              <TabsTrigger variant="segmented" value="year">
                {t('tiers.paywall.yearly')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {saving !== null && (
            <span className="rounded-[2px] bg-accent/15 px-2 py-1 text-[11px] font-medium leading-none tracking-[0.1em] text-accent">
              {t('tiers.ledger.save', { percent: saving })}
            </span>
          )}
        </div>
      )}

      {offered.length > 0 ? (
        <PlanLedger
          columns={columns}
          interval={shownInterval}
          popularTierId={popular?.tierId ?? null}
          focusTierId={preselected?.tierId ?? null}
          onChoose={choose}
          busy={change.isPending}
        />
      ) : (
        <p className="text-center text-sm text-secondary-foreground">
          {t('tiers.ledger.noneOnSale')}
        </p>
      )}

      <p className="text-center text-[13px] text-secondary-foreground">
        {t('tiers.ledger.vatNote')}
      </p>

      {confirming && (
        <ChangePlanDialog
          target={confirming.tier}
          price={confirming.price}
          held={held}
          blocked={blocked}
          busy={change.isPending}
          onConfirm={confirm}
          onClose={() => setConfirming(null)}
          onManage={portal.open}
        />
      )}
    </PlansFrame>
  )
}

/**
 * The sheet the plans sit on, with the workspace named top-left and the ways
 * out top-right.
 *
 * `close` is the X, which goes *back* — this URL is linked from upgrade
 * prompts, so it falls back to Workspace Settings for somebody whose history
 * starts here. `gate` has no X, because a gated workspace has nowhere to go
 * back to: the ways out are another workspace and signing out.
 */
function PlansFrame({
  children,
  workspaceName,
  exits,
}: {
  children: React.ReactNode
  workspaceName: string
  exits: 'close' | 'gate' | 'none'
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  const close = () => {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/workspace-settings' })
  }

  return (
    // White edge to edge: one sheet, not the app's grey canvas.
    <PageContainer variant="fullFlex" className="bg-primary">
      <header
        className="flex h-16 shrink-0 items-center"
        style={{ zIndex: ZIndex.pageHeader }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 lg:px-6">
          {/* The workspace this is about, as the page's section tag. */}
          <p className="flex min-w-0 items-center gap-2 text-[11px] font-medium tracking-[0.1em]">
            <span aria-hidden className="size-2.5 shrink-0 bg-accent" />
            {/* Capitals by CSS here, unlike copy: a workspace's name is data,
                and the screen reader should read it as it was typed. */}
            <span className="truncate uppercase">{workspaceName}</span>
          </p>
          {exits === 'close' && (
            <Button
              variant="ghost"
              size="defaultIcon"
              onClick={close}
              aria-label={t('tiers.plansClose')}
            >
              <XIcon className="size-5" />
            </Button>
          )}
          {exits === 'gate' && (
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/workspaces">
                  {t('tiers.ledger.switchWorkspace')}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth/logout">{t('tiers.ledger.signOut')}</Link>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-0 grow flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-8 lg:px-6">
          {children}
        </div>
      </div>
    </PageContainer>
  )
}
