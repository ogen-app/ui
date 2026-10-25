import type { ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowSquareOutIcon, SealCheckIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { formatDay } from '@/components/entitlements/parts'
import { usePlanStatement } from '@/hooks/usePlanStatement'
import { formatNumber } from '@/lib/intl'
import { toMajorUnits } from '@/lib/tierPrice'
import type {
  BillingAccount,
  BillingPrice,
  BillingStatus,
  BillingSubscription,
} from '@/types/billing'
import type { TierSnapshot } from '@/types/entitlements'

type Props = {
  /** Undefined while the plan is in flight — the card says nothing, not "Free". */
  tier: TierSnapshot | undefined
  /** Undefined for a member, who never makes the request. */
  billing: BillingAccount | undefined
  mayManage: boolean
  /**
   * Whether this reader may move the workspace onto another plan (CON-232).
   *
   * A separate answer from `mayManage` even though both are "are you an owner"
   * today — see `canChangePlan`. It changes the word on the button rather than
   * removing it: the comparison is worth reading whoever is reading it, and a
   * member who cannot choose is exactly the person who wants to know what
   * choosing would get them before they go and ask.
   */
  mayChange: boolean
  /** The plan read failed. Kept apart from `!tier` so the two can differ. */
  planFailed?: boolean
  /**
   * The billing read failed — including 503, billing switched off on this
   * deployment. Kept apart from `billing === undefined`, which is also what a
   * member (who never asks) and a read still in flight look like.
   */
  billingFailed?: boolean
  onManage: () => void
  managing?: boolean
  /**
   * Calls off a scheduled downgrade by choosing the tier already held — one
   * endpoint, so nothing can disagree with it (CON-325). Absent, the card
   * offers nothing to keep.
   */
  onKeepPlan?: () => void
  keeping?: boolean
  /**
   * A tester's workspace (CON-402): never billed. The card keeps its shape and
   * says so — a tag and one sentence on the plan, and the payment row without
   * its button, its sandbox tag or a card line. `subscription: null,
   * portal: false` means "nothing to pay" here, not "never bought".
   */
  complimentary?: boolean
}

/**
 * Plan & billing, on Workspace Settings (CON-232) — the whole of it, on one
 * card.
 *
 * **There is no billing screen behind this, and there shouldn't be.** Ogen
 * sells through Lemon Squeezy as merchant of record, so the payment method, the
 * billing address, the tax id, the invoices and the cancellation all live in
 * their hosted portal — validated against the record they bill and legally
 * answerable for it. What is left for us to state is a plan, a card's last four
 * and one sentence naming where the rest is; a page of that is a page of white
 * space with two buttons on it. So the card says it, and the two things you can
 * do from here sit on it: change plan, which is ours, and manage billing, which
 * is theirs.
 *
 * The plan's second sentence is the reason the card exists at all. A scheduled
 * downgrade is something you agreed to weeks ago and have forgotten, and
 * Workspace Settings is where somebody goes when they are wondering why a limit
 * moved. It is also why there is no "Scheduled" chip: the sentence already says
 * a change is coming, and says *which* change and *when* — a chip beside it
 * repeats the least useful third of that.
 *
 * Every state is props, none of it fetched, so `/design/plan-billing` can put
 * the lot on one page. The wiring lives in `PlanSection`.
 */
export function PlanBillingCard({
  tier,
  billing,
  mayManage,
  mayChange,
  planFailed = false,
  billingFailed = false,
  onManage,
  managing = false,
  onKeepPlan,
  keeping = false,
  complimentary = false,
}: Props) {
  const { t } = useTranslation()
  const subscription = billing?.subscription ?? null

  return (
    <SettingsCard title={t('tiers.billingTitle')}>
      <ul className="flex flex-col divide-y divide-border">
        <SettingsRow>
          <PlanBanner
            tier={tier}
            subscription={subscription}
            planFailed={planFailed}
            mayChange={mayChange}
            onKeepPlan={onKeepPlan}
            keeping={keeping}
            complimentary={complimentary}
          />
        </SettingsRow>

        {mayManage && complimentary ? (
          // Nothing to manage and nothing charged, so neither the portal door
          // nor the sandbox tag — only why no card is needed, and what happens
          // if that changes.
          <SettingsRow
            title={t('tiers.paymentMethod')}
            description={t('tiers.comp.payment')}
          />
        ) : mayManage ? (
          <SettingsRow
            title={t('tiers.paymentMethod')}
            badges={
              // Lemon Squeezy's sandbox: nothing on this card is really
              // charged. Beside the payment row rather than the plan, because
              // it qualifies the money, not what the workspace may do.
              billing?.testMode ? (
                <span className="inline-flex shrink-0 items-center rounded-[2px] border border-tertiary bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                  {t('tiers.sandbox')}
                </span>
              ) : null
            }
            actions={
              // Present and dead rather than absent while billing is unwired:
              // the row is about a thing that has a management screen, and
              // hiding the button until the endpoint lands would make its
              // arrival look like a new feature rather than a connected one.
              <Button
                variant="ghost"
                size="sm"
                onClick={onManage}
                disabled={!billing?.portal}
                loading={managing}
              >
                {t('tiers.managePortal')}
                <ArrowSquareOutIcon />
              </Button>
            }
            description={
              <>
                {/* The state of the thing the row is named after, so it is read
                    at full strength; everything under it is explanation. A
                    failed read says so here — and says it instead of "nothing
                    is being charged", which is what a missing subscription
                    would otherwise read as, and which nobody checked. */}
                {billingFailed ? (
                  <p className="text-primary-foreground">
                    {t('tiers.billingUnavailable')}
                  </p>
                ) : (
                  <PaymentLine subscription={subscription} />
                )}
                {/* The answer to "where do I change my VAT number" — a question
                    this card will be asked, and whose answer is a place rather
                    than a field. */}
                <p>{t('tiers.providerHolds')}</p>
                {/* Permanent, not an Explainer: it says why MANAGE above is
                    dead — nothing at the provider to manage yet — and that is
                    not something to hide behind a dismissed note. */}
                {billing && !billing.portal && <p>{t('tiers.noPortal')}</p>}
              </>
            }
          />
        ) : (
          <SettingsRow
            title={t('tiers.paymentMethod')}
            description={t('tiers.ownersOnly')}
          />
        )}
      </ul>
    </SettingsCard>
  )
}

/**
 * The plan itself: what the workspace is on, what happens to it next, and the
 * way to change it.
 *
 * The same framed card a campaign's type gets, and for the same reason — this
 * is a chosen thing rather than a field, so it is drawn as the choice with the
 * way to change it inside the frame. See `CampaignTypeCard`; if a third of
 * these appears, the two should become one component.
 *
 * Exported for `/design/plan-billing`, which varies this alone across a dozen
 * plans and provider states without redrawing the payment row each time.
 */
export function PlanBanner({
  tier,
  subscription,
  planFailed = false,
  mayChange,
  onKeepPlan,
  keeping = false,
  complimentary = false,
}: {
  tier: TierSnapshot | undefined
  subscription: BillingSubscription | null
  planFailed?: boolean
  mayChange: boolean
  onKeepPlan?: () => void
  keeping?: boolean
  complimentary?: boolean
}) {
  const { t, i18n } = useTranslation()
  const { headline, timing } = usePlanStatement(tier)

  /**
   * One second line, chosen in order of what happens next.
   *
   * **A subscription that is ending outranks the plan's renewal date**, and
   * they are usually the *same day*: a cancelled subscription keeps `renewsAt`
   * on the tier — it is still the boundary — while the provider has already
   * said there will be no invoice. Printing both gave "It auto-renews in 8
   * days, on August 31. Access ends on August 31.", which promises a renewal
   * that is not coming and then contradicts it in the same breath.
   *
   * A scheduled tier change still outranks both: it is a decision the user
   * made, and it says what they will be on afterwards.
   *
   * The tense comes off the provider's status, never off comparing the date to
   * the clock — a wrong system clock must not be able to reword this.
   */
  const ending = subscription?.endsAt ?? null
  // The free month (CON-328): "Free until 21 November, then $49 / month". From
  // the plan read's `trial_ends_at`, which is set only while the provider says
  // `on_trial` — never from comparing a date with the clock.
  const trialEnds = tier?.trialEndsAt ?? null
  const trialPrice = subscription?.price
    ? priceText(t, subscription.price, i18n.language)
    : null
  const secondLine = planFailed
    ? t('tiers.planLoadFailed')
    : complimentary
      ? // No renewal and no change pending: a comped plan has no clock.
        t('tiers.comp.sentence')
      : tier?.scheduled
        ? timing
        : trialEnds
          ? trialPrice
            ? t('tiers.freeUntil', {
                when: formatDay(trialEnds, i18n.language),
                price: trialPrice,
              })
            : t('tiers.freeUntilBare', {
                when: formatDay(trialEnds, i18n.language),
              })
          : !ending
            ? timing
            : t(
                subscription?.status === 'expired'
                  ? 'tiers.accessEnded'
                  : 'tiers.accessEnds',
                {
                  when: formatDay(ending, i18n.language),
                },
              )

  /**
   * A third line, for the two statuses that are a problem to be *solved* rather
   * than a state to be known.
   *
   * The tag names what happened and the second line says what happens to the
   * plan; neither says what to do about it, and for a failed payment that is
   * the only part the reader wants. The other tagged states don't get one —
   * cancelled, paused and expired are decisions somebody made, and the second
   * line already gives them their date.
   *
   * The two are worded apart because the provider means different things by
   * them: `past_due` is still being retried, so the honest instruction is to
   * wait unless it keeps failing; `unpaid` has run out of retries, so it is on
   * the customer now. Telling somebody to go and fix a card the provider is
   * about to charge successfully is how a card gets changed for no reason.
   */
  const failureLine =
    subscription?.status === 'past_due'
      ? t('tiers.paymentRetrying')
      : subscription?.status === 'unpaid'
        ? t('tiers.paymentStopped')
        : null

  return (
    <div className="flex items-center gap-3 rounded-md border border-quaternary px-4 py-4 min-w-0">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
        <SealCheckIcon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-base font-medium">
          {headline ?? '—'}
        </span>
        {/* `items-baseline`, not `items-center`: the tag and the sentence are
            one line of prose with a box drawn round part of it, and centring a
            padded box against text sits it a pixel or two high — the kind of
            misalignment you see without being able to name. */}
        <span className="flex flex-wrap items-baseline gap-2 text-sm text-secondary-foreground">
          {complimentary ? (
            <Tag>{t('tiers.comp.tag')}</Tag>
          ) : (
            subscription && <StatusTag status={subscription.status} />
          )}
          <span>{secondLine}</span>
        </span>
        {failureLine && (
          <span className="text-sm text-secondary-foreground">
            {failureLine}
          </span>
        )}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-1 pl-3">
        {/* A scheduled downgrade can be called off from where it is stated.
            Only a downgrade: an upgrade waiting for its date is good news,
            and nothing on the API schedules one today anyway. */}
        {mayChange &&
          onKeepPlan &&
          tier?.scheduled?.direction === 'downgrade' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onKeepPlan}
              loading={keeping}
            >
              {t('tiers.keepPlan', {
                name: tier.name.toLocaleUpperCase(i18n.language),
              })}
            </Button>
          )}
        {/* The same door, named for what is behind it for this reader. A
            member sent to a screen of CHANGE buttons that do nothing would
            conclude the app is broken; one sent to read the plans finds
            exactly what the word promised. */}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/plans">
            {mayChange ? t('tiers.changePlan') : t('tiers.seePlans')}
          </Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * The card on file — or, when we haven't been told which, where it is.
 *
 * At full strength rather than in the row's grey, because it is the answer to
 * the question the row asks; the sentences under it are context for it.
 *
 * None of the three says a payment method is *missing*. A live subscription has
 * one by definition — it is renewing — so "no payment method on file" under a
 * plan somebody is paying for reads as *we lost your card*, which is both
 * alarming and untrue. What we actually don't have is a copy of it.
 */
function PaymentLine({
  subscription,
}: {
  subscription: BillingSubscription | null
}) {
  const { t, i18n } = useTranslation()
  const tone = 'text-primary-foreground'

  if (!subscription) return <p className={tone}>{t('tiers.noSubscription')}</p>
  // What it costs, net — Lemon Squeezy adds VAT for the buyer's country, so a
  // bare figure would be smaller than the invoice (CON-328).
  const price = subscription.price ? (
    <span className="text-tertiary-foreground">
      {' · '}
      {t('tiers.priceExclVat', {
        price: priceText(t, subscription.price, i18n.language),
      })}
    </span>
  ) : null
  if (!subscription.card)
    return (
      <p className={tone}>
        {t('tiers.cardWithProvider')}
        {price}
      </p>
    )
  return (
    <p className={tone}>
      {/* The brand is the provider's own lowercase token ("visa"), so the
          capital is a display choice and stays out of the string. */}
      <span className="capitalize">{subscription.card.brand}</span>{' '}
      {t('tiers.cardEnding', { last4: subscription.card.last4 })}
      {price}
    </p>
  )
}

/** "$49 / month", in the active language and the provider's currency. */
function priceText(t: TFunction, price: BillingPrice, locale: string): string {
  const amount = formatNumber(
    toMajorUnits(price.amount, price.currency, locale),
    { style: 'currency', currency: price.currency },
    locale,
  )
  return t(price.period === 'year' ? 'tiers.perYear' : 'tiers.perMonth', {
    price: amount,
  })
}

/**
 * What the provider says about the subscription, when that is worth saying.
 *
 * The Content Bank's row tag rather than `Chip` — a chip is a control-sized
 * pill and this is data, sitting inside a sentence. It takes the second line's
 * type so the two read as one line, and only the surface (two steps of the grey
 * ramp, a hairline, barely any radius) marks it off. Its text is a step
 * stronger than the sentence around it: a bordered box in exactly the
 * surrounding grey reads as a rendering accident.
 */
function StatusTag({ status }: { status: BillingStatus }) {
  const { t } = useTranslation()

  // Built per render, not at module scope: a `const` map holding translated
  // copy freezes whichever language loaded first. Nothing is said about the
  // healthy states — "Active" beside "auto-renews on the 22nd" is noise, and
  // the tag is worth the room only when something is wrong.
  const keys = {
    past_due: 'tiers.statusPastDue',
    cancelled: 'tiers.statusCancelled',
    paused: 'tiers.statusPaused',
    expired: 'tiers.statusExpired',
    unpaid: 'tiers.statusUnpaid',
    on_trial: 'tiers.statusOnTrial',
  } as const

  const key = status in keys ? keys[status as keyof typeof keys] : null
  if (!key) return null
  return <Tag>{t(key)}</Tag>
}

/** The tag's surface, shared by the provider's states and Beta access. */
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[2px] border border-tertiary bg-secondary px-1.5 py-1 text-primary-foreground">
      {children}
    </span>
  )
}
