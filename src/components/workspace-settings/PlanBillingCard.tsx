import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowSquareOutIcon, SealCheckIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { formatDay } from '@/components/entitlements/parts'
import { usePlanStatement } from '@/hooks/usePlanStatement'
import type {
  BillingAccount,
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
  /** The plan read failed. Kept apart from `!tier` so the two can differ. */
  planFailed?: boolean
  onManage: () => void
  managing?: boolean
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
  planFailed = false,
  onManage,
  managing = false,
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
          />
        </SettingsRow>

        {mayManage ? (
          <SettingsRow
            title={t('tiers.paymentMethod')}
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
                    at full strength; everything under it is explanation. */}
                <PaymentLine subscription={subscription} />
                {/* The answer to "where do I change my VAT number" — a question
                    this card will be asked, and whose answer is a place rather
                    than a field. */}
                <p>{t('tiers.providerHolds')}</p>
                {/* Permanent, not an Explainer: a card headed "Plan & billing"
                    that cannot bill implies a payment relationship that does
                    not exist, and that is not something to hide behind a note
                    somebody may have dismissed months ago. It also says what
                    the dead button above is waiting for, and both go on the
                    same day — the one the claim stops being true. */}
                {!billing?.portal && <p>{t('tiers.billingMock')}</p>}
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
}: {
  tier: TierSnapshot | undefined
  subscription: BillingSubscription | null
  planFailed?: boolean
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
  const secondLine = planFailed
    ? t('tiers.planLoadFailed')
    : tier?.scheduled || !ending
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
          {subscription && <StatusTag status={subscription.status} />}
          <span>{secondLine}</span>
        </span>
        {failureLine && (
          <span className="text-sm text-secondary-foreground">
            {failureLine}
          </span>
        )}
      </span>
      <div className="ml-auto shrink-0 pl-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/plans">{t('tiers.changePlan')}</Link>
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
  const { t } = useTranslation()
  const tone = 'text-primary-foreground'

  if (!subscription) return <p className={tone}>{t('tiers.noSubscription')}</p>
  if (!subscription.card)
    return <p className={tone}>{t('tiers.cardWithProvider')}</p>
  return (
    <p className={tone}>
      {/* The brand is the provider's own lowercase token ("visa"), so the
          capital is a display choice and stays out of the string. */}
      <span className="capitalize">{subscription.card.brand}</span>{' '}
      {t('tiers.cardEnding', { last4: subscription.card.last4 })}
    </p>
  )
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
  } as const

  const key = status in keys ? keys[status as keyof typeof keys] : null
  if (!key) return null
  return (
    <span className="inline-flex shrink-0 items-center rounded-[2px] border border-tertiary bg-secondary px-1.5 py-1 text-primary-foreground">
      {t(key)}
    </span>
  )
}
