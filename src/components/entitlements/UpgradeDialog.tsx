import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import {
  ArrowRightIcon,
  RocketLaunchIcon,
  StarIcon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useTiers } from '@/hooks/useTiers'
import { useCanChangePlan } from '@/hooks/useWorkspaces'
import { formatNumber } from '@/lib/intl'
import {
  featureLabel,
  isTierFeatureKey,
  type TierFeature,
} from '@/lib/tierFeatures'
import { BenefitTile } from './BenefitTile'
import { toMajorUnits } from '@/lib/tierPrice'
import {
  billingOptions,
  offerBenefits,
  recommendedTier,
  yearlySaving,
} from '@/lib/upgradeOffer'
import { formatDay } from './parts'
import type { UpgradeGate } from './useUpgradeGate'
import type {
  Entitlement,
  EntitlementKey,
  TierVersionPrice,
  WorkspacePlan,
} from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

type Denied = Extract<Entitlement, { state: 'denied' }>

/** What the paywall needs from the server: the plan held and the plans on sale. */
export type PaywallData = { plan: WorkspacePlan; tiers: Tier[] }

/**
 * What a sold denial looks like when the user has already clicked (CON-232).
 *
 * A modal rather than an inline notice, because by the time this renders the
 * user has asked for something and is owed an answer to *that*. It is the one
 * rendering in this folder that interrupts, and `useUpgradeGate` is the only
 * thing that opens it.
 *
 * **One plan, argued for.** The left column is the plan we recommend — the
 * cheapest one that clears the wall they just hit (`recommendedTier`, which
 * Harbor is expected to take over) — with its price and the one button. The
 * right column is what that plan adds, the refused feature first and marked by
 * style alone, so every tile reads the same way. Everything else is one link
 * away on `/plans`, from both columns: *is this the right plan?* is asked on
 * the left and *what else do I get?* on the right, and the same page answers
 * both.
 *
 * **Not everyone reading this can act on it.** A member sees the same plan and
 * price — knowing what the workspace's plan costs is not an owner's privilege —
 * and a line saying whose decision it is in place of the button.
 *
 * Dismissal is always there (✕ and Escape): the answer to "you've used all
 * your campaigns" is often to go and archive one, which is behind this dialog,
 * not beyond it.
 */
export function UpgradeDialog({
  gate,
  mayChange,
  data,
}: {
  gate: UpgradeGate
  /**
   * Whose decision the plan is, when the caller already knows. Left out in the
   * app, where the dialog asks; passed by `/design/entitlement-stoppers`, which
   * has no session and must show both halves side by side.
   */
  mayChange?: boolean
  /**
   * The plan and price list, when the caller already has them. Left out in the
   * app, where they are fetched on open; passed by the design harness, because
   * the stub's paid tiers have no prices yet and the price column is half the
   * design.
   */
  data?: PaywallData
}) {
  const { t } = useTranslation()
  if (gate.entitlement.state !== 'denied') return null

  return (
    <ModalContainer
      isOpen={gate.selling}
      onClose={gate.dismiss}
      label={t('tiers.paywall.label')}
      size="xlarge"
      isContainer
      className="max-h-[92svh] overflow-y-auto"
    >
      {/* The body is a child rather than this component's own markup so that
          the price list is read when the dialog *opens* and not when it mounts.
          Every gated screen keeps one of these on standby, and `useTiers`
          behind each of them would fetch the catalogue behind every lock in the
          app. A modal that is shut renders no children, so no hook runs. */}
      {data ? (
        <Paywall
          gate={gate}
          entitlement={gate.entitlement}
          data={data}
          mayChange={mayChange ?? true}
        />
      ) : (
        <FetchedPaywall
          gate={gate}
          entitlement={gate.entitlement}
          mayChange={mayChange}
        />
      )}
    </ModalContainer>
  )
}

function FetchedPaywall({
  gate,
  entitlement,
  mayChange: told,
}: {
  gate: UpgradeGate
  entitlement: Denied
  mayChange?: boolean
}) {
  const plan = useWorkspacePlan()
  const tiers = useTiers()
  const role = useCanChangePlan()
  const mayChange = told ?? role

  if (!plan.data || tiers.isLoading) {
    return <PaywallSkeleton />
  }
  return (
    <Paywall
      gate={gate}
      entitlement={entitlement}
      // A price list that failed to load is not news worth a sentence here:
      // the dialog falls back to the no-offer answer, which still says what
      // happened and still points at the comparison.
      data={{ plan: plan.data, tiers: tiers.data ?? [] }}
      mayChange={mayChange}
    />
  )
}

function Paywall({
  gate,
  entitlement,
  data,
  mayChange,
}: {
  gate: UpgradeGate
  entitlement: Denied
  data: PaywallData
  mayChange: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const held = data.plan.entitlements
  const offer = recommendedTier(gate.feature, held, data.tiers)

  const toPlans = () => {
    gate.dismiss()
    void navigate({ to: '/plans' })
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <Heading
        feature={gate.feature}
        entitlement={entitlement}
        planName={data.plan.tier.name}
        offerName={offer?.name ?? null}
      />

      {offer ? (
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <OfferColumn
            tier={offer}
            currentName={data.plan.tier.name}
            mayChange={mayChange}
            onUpgrade={toPlans}
            onCompare={toPlans}
            onClose={gate.dismiss}
          />
          <BenefitsColumn
            {...offerBenefits(gate.feature, held, offer)}
            onSeeAll={toPlans}
          />
        </div>
      ) : (
        // Nothing on sale beats what they hold — the top plan, or a key no
        // tier grants more of. No offer is invented; the comparison is.
        <div className="flex flex-col gap-4">
          {!mayChange && <OwnersOnly />}
          <div className="flex flex-wrap gap-2">
            <Button variant="neutral" onClick={gate.dismiss}>
              {t('common.close')}
            </Button>
            <Button variant="ghost" onClick={toPlans}>
              {t('tiers.paywall.comparePlans')}
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── The heading ─────────────────────────────────────────────────────────── */

/**
 * Why the dialog opened, one sentence per metered feature.
 *
 * Whole sentences rather than one with the feature's name slotted in: the name
 * is a heading ("Campaigns") and the sentence wants a noun phrase in the middle
 * of it ("all active campaigns"), which is a different word in every language.
 * A key missing here takes the generic sentence.
 */
const LIMIT_REASON = {
  team_seats: 'tiers.paywall.reasonLimit.team_seats',
  workspaces: 'tiers.paywall.reasonLimit.workspaces',
  connected_accounts: 'tiers.paywall.reasonLimit.connected_accounts',
  active_campaigns: 'tiers.paywall.reasonLimit.active_campaigns',
  plan_runs_per_month: 'tiers.paywall.reasonLimit.plan_runs_per_month',
  quality_reviews_per_post:
    'tiers.paywall.reasonLimit.quality_reviews_per_post',
  posts_total: 'tiers.paywall.reasonLimit.posts_total',
  content_bank_assets: 'tiers.paywall.reasonLimit.content_bank_assets',
  web_page_imports: 'tiers.paywall.reasonLimit.web_page_imports',
  media_storage_bytes: 'tiers.paywall.reasonLimit.media_storage_bytes',
  assistant_multiplier: 'tiers.paywall.reasonLimit.assistant_multiplier',
} as const satisfies Partial<Record<EntitlementKey, string>>

/**
 * The title sells and the description explains. The title names the plan on
 * offer, because that is what the rest of the dialog argues for; the refusal
 * that opened it is the first sentence underneath, then what happens to the
 * work already made — or, for a monthly allowance, when it fills back up,
 * since waiting is often the answer and leaving it out would turn a fact into
 * a pitch. With nothing on sale to offer, the title says so instead and the
 * description points at the comparison.
 */
function Heading({
  feature,
  entitlement,
  planName,
  offerName,
}: {
  feature: EntitlementKey
  entitlement: Denied
  planName: string
  offerName: string | null
}) {
  const { t, i18n } = useTranslation()

  let reason: string
  let consequence: string
  if (entitlement.reason === 'tier') {
    reason = isTierFeatureKey(feature)
      ? t('tiers.paywall.reasonTier', {
          feature: featureLabel(t, feature),
          plan: planName,
        })
      : t('tiers.paywall.reasonTierOther', { plan: planName })
    consequence = t('tiers.paywall.bodyTier')
  } else {
    const key = LIMIT_REASON[feature as keyof typeof LIMIT_REASON]
    reason = key
      ? t(key, { plan: planName })
      : t('tiers.paywall.reasonLimitOther', { plan: planName })
    const resetsAt = entitlement.usage.resetsAt
    consequence = resetsAt
      ? t('tiers.paywall.bodyResets', {
          when: formatDay(resetsAt, i18n.language),
        })
      : t('tiers.paywall.bodyLimit')
  }
  if (!offerName) consequence = t('tiers.paywall.noOffer')

  const title = offerName
    ? t('tiers.paywall.title', { plan: offerName })
    : t('tiers.paywall.titleTop', { plan: planName })

  return (
    <header className="flex flex-col gap-5 pr-8">
      {/* The tile a chosen thing wears elsewhere in this feature. Teal is a
          fill and not ink in this theme, so it colours the mark and nothing
          that has to be read (`docs/colors.md`). */}
      <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-accent">
        <StarIcon size={26} weight="fill" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-medium tracking-tight md:text-[28px] md:leading-tight">
          {title}
        </h2>
        {/* Two whole sentences side by side, each its own catalogue entry. */}
        <p className="max-w-[60ch] text-sm text-tertiary-foreground">
          {reason} {consequence}
        </p>
      </div>
    </header>
  )
}

/* ── The offer ───────────────────────────────────────────────────────────── */

function OfferColumn({
  tier,
  currentName,
  mayChange,
  onUpgrade,
  onCompare,
  onClose,
}: {
  tier: Tier
  /** The plan being left, named in the line under the offered one. */
  currentName: string
  mayChange: boolean
  onUpgrade: () => void
  onCompare: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { month, year } = billingOptions(tier)
  const [interval, setBilling] = useState<'month' | 'year'>('month')
  // The switcher is shown only when both prices exist; otherwise whichever one
  // does is simply the price.
  const both = month !== null && year !== null
  const shown = both ? interval : month ? 'month' : 'year'

  return (
    <section className="flex flex-col gap-2">
      {/* Stretched to the benefit list's height, so the two columns end on
          one line and their links sit level underneath. */}
      <div className="flex flex-1 flex-col gap-6 rounded-lg border border-border p-6">
        {both && (
          <Tabs
            value={interval}
            onValueChange={(value) => setBilling(value as 'month' | 'year')}
          >
            <TabsList
              variant="segmented"
              size="excluded"
              className="grid w-full grid-cols-2"
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
        )}

        <div className="flex flex-col gap-1">
          {/* Data, not copy: a tier's name is whatever the server calls it. */}
          <h3 className="font-display text-lg font-medium tracking-tight">
            {tier.name}
          </h3>
          <p className="text-[13px] text-tertiary-foreground">
            {t('tiers.paywall.planPitch', { current: currentName })}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {shown === 'month' && month && <MonthlyPrice price={month} />}
          {shown === 'year' && year && (
            <YearlyPrice price={year} month={month} />
          )}
          {/* A plan the catalogue has not priced says so. Nothing at all read as
            a card that failed to load, and "€0" would be a promise. */}
          {!month && !year && (
            <p className="font-display text-xl font-medium tracking-tight text-tertiary-foreground">
              {t('tiers.paywall.unpriced')}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {mayChange ? (
            // The one action on this screen worth colouring.
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={onUpgrade}
            >
              <RocketLaunchIcon weight="fill" aria-hidden />
              {t('tiers.paywall.upgradeTo', {
                plan: tier.name.toLocaleUpperCase(),
              })}
            </Button>
          ) : (
            <>
              <OwnersOnly />
              {/* Not the teal one: nothing is being sold to this reader, so
                colouring the way out would make the colour mean "a button". */}
              <Button
                variant="neutral"
                size="lg"
                className="w-full"
                onClick={onClose}
              >
                {t('common.close')}
              </Button>
            </>
          )}
        </div>
      </div>
      <LinkOut onClick={onCompare}>{t('tiers.paywall.comparePlans')}</LinkOut>
    </section>
  )
}

function MonthlyPrice({ price }: { price: TierVersionPrice }) {
  return (
    <>
      <BigPrice amount={price.amount} currency={price.currency} />
      {/* A line's worth of room kept in both states, so flipping the switcher
          does not move the button under the cursor. */}
      <p className="text-[13px] text-tertiary-foreground" aria-hidden>
        &nbsp;
      </p>
    </>
  )
}

function YearlyPrice({
  price,
  month,
}: {
  price: TierVersionPrice
  month: TierVersionPrice | null
}) {
  const { t } = useTranslation()
  const money = useMoney()
  const total = money(price.amount, price.currency)
  const saving = month ? yearlySaving(month, price) : 0
  return (
    <>
      {/* Stated per month, so the two tabs compare like with like; the sum
          that is actually charged is on the line under it. */}
      <BigPrice
        amount={Math.round(price.amount / 12)}
        currency={price.currency}
      />
      <p className="text-[13px] text-tertiary-foreground">
        {saving > 0
          ? t('tiers.paywall.billedYearlySaving', {
              total,
              saving: money(saving, price.currency),
            })
          : t('tiers.paywall.billedYearly', { total })}
      </p>
    </>
  )
}

function BigPrice({ amount, currency }: { amount: number; currency: string }) {
  const money = useMoney()
  return (
    <p className="text-tertiary-foreground">
      <Trans
        i18nKey="tiers.paywall.perMonth"
        values={{ price: money(amount, currency) }}
        components={{
          price: (
            <span className="font-display text-4xl font-medium tracking-tight text-foreground" />
          ),
        }}
      />
    </p>
  )
}

/** Whole units in the tier's own currency — a price list showing "29.00" reads like an invoice. */
function useMoney() {
  const { i18n } = useTranslation()
  return (minor: number, currency: string) =>
    formatNumber(
      toMajorUnits(minor, currency, i18n.language),
      { style: 'currency', currency, maximumFractionDigits: 0 },
      i18n.language,
    )
}

/* ── The benefits ────────────────────────────────────────────────────────── */

function BenefitsColumn({
  primary,
  secondary,
  onSeeAll,
}: {
  primary: TierFeature | null
  secondary: TierFeature[]
  onSeeAll: () => void
}) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-2">
      {/* The tiles share out whatever height the plan card needs, so a tall
          card never leaves a gap under a short list, or the other way round. */}
      <ul className="flex flex-1 flex-col gap-2">
        {primary && <BenefitTile feature={primary} primary />}
        {secondary.map((feature) => (
          <BenefitTile key={feature.key} feature={feature} />
        ))}
      </ul>
      <LinkOut onClick={onSeeAll}>{t('tiers.paywall.seeAllFeatures')}</LinkOut>
    </section>
  )
}

/* ── Small parts ─────────────────────────────────────────────────────────── */

function OwnersOnly() {
  const { t } = useTranslation()
  return (
    <p className="text-[13px] text-tertiary-foreground">
      {t('tiers.ownersOnlyPlan')}
    </p>
  )
}

/** A way to `/plans`, set in the same place under each column so the two read as a pair. */
function LinkOut({
  onClick,
  children,
}: {
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 self-center pt-2 text-[13px] font-medium text-tertiary-foreground hover:text-foreground"
    >
      {children}
      <ArrowRightIcon size={14} aria-hidden />
    </button>
  )
}

/**
 * The dialog's shape while the plan and price list are on their way — at its
 * final height, so nothing grows under the cursor when they answer.
 */
function PaywallSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-10" aria-busy>
      <div className="flex flex-col gap-5">
        <Skeleton className="size-12 rounded-lg" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Skeleton className="h-80 rounded-lg" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
