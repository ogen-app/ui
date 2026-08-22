import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowSquareOutIcon, SealCheckIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { formatDay } from '@/components/entitlements/parts'
import { useFeatureFlag } from '@/config/featureFlags'
import { useBilling, useBillingPortal } from '@/hooks/useBilling'
import { usePlanStatement } from '@/hooks/usePlanStatement'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { canManageBilling } from '@/types/workspace'
import { toast } from '@/stores/toastStore'
import type { BillingStatus, BillingSubscription } from '@/types/billing'

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
 * The second sentence of the plan row is the reason the card exists at all. A
 * scheduled downgrade is something you agreed to weeks ago and have forgotten,
 * and Workspace Settings is where somebody goes when they are wondering why a
 * limit moved.
 */
export function PlanSection() {
  const { t, i18n } = useTranslation()
  const gated = useFeatureFlag('workspace-tiers')
  const workspace = useWorkspace()
  const plan = useWorkspacePlan()
  const billing = useBilling()
  const portal = useBillingPortal()
  const { headline, timing } = usePlanStatement(plan.data?.tier)

  /**
   * Opens the provider's portal in a new tab.
   *
   * The blank tab is opened *inside* the click, before the request: a
   * `window.open` that happens after an `await` has lost the user gesture and
   * is blocked by Safari and by strict pop-up settings. `opener` is cleared
   * because a tab opened this way can otherwise reach back into the app — and
   * a link that has to keep its handle can't be opened with `noopener`, which
   * returns null.
   */
  const openPortal = () => {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    portal.mutate(undefined, {
      onSuccess: ({ url }) => {
        if (tab) tab.location.href = url
        else window.location.assign(url)
      },
      onError: () => {
        tab?.close()
        toast.error(t('tiers.portalFailed'))
      },
    })
  }

  // Nothing at all with the flag off — not an empty card. See CLAUDE.md: the
  // off-branch has to leave the app exactly as it was before tiers existed.
  if (!gated) return null

  // The billing half is owner-only, on the server as well as here. A member
  // gets the sentence they are entitled to and an explanation, not a row that
  // stays empty because a request was made that was never theirs.
  const mayManage = workspace ? canManageBilling(workspace.role) : false
  const subscription = billing.data?.subscription ?? null

  return (
    <SettingsCard title={t('tiers.billingTitle')}>
      <ul className="flex flex-col divide-y divide-border">
        <SettingsRow>
          {/* The same framed card a campaign's type gets, and for the same
              reason: this is a chosen thing rather than a field, so it is drawn
              as the choice with the way to change it inside the frame. See
              `CampaignTypeCard` — if a third of these appears, the two should
              become one component. */}
          <div className="flex items-center gap-3 rounded-md border border-quaternary px-4 py-4 min-w-0">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
              <SealCheckIcon className="size-6" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-base font-medium">{headline ?? '—'}</span>
                {plan.data?.tier.scheduled && (
                  <Chip variant="muted">{t('tiers.scheduledBadge')}</Chip>
                )}
                {subscription && <StatusChip status={subscription.status} />}
              </span>
              <span className="text-sm text-secondary-foreground">
                {timing}
                {plan.isError && t('tiers.planLoadFailed')}
                {subscription?.endsAt &&
                  ` ${t('tiers.accessEnds', { when: formatDay(subscription.endsAt, i18n.language) })}`}
              </span>
            </span>
            <div className="ml-auto shrink-0 pl-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/plans">{t('tiers.changePlan')}</Link>
              </Button>
            </div>
          </div>
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
                onClick={openPortal}
                disabled={!billing.data?.portal}
                loading={portal.isPending}
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
                {!billing.data?.portal && <p>{t('tiers.billingMock')}</p>}
              </>
            }
          />
        ) : (
          <SettingsRow title={t('tiers.paymentMethod')} description={t('tiers.ownersOnly')} />
        )}
      </ul>
    </SettingsCard>
  )
}

/**
 * The card on file, or the fact that there isn't one.
 *
 * At full strength rather than in the row's grey, because it is the answer to
 * the question the row asks; the sentences under it are context for it.
 */
function PaymentLine({ subscription }: { subscription: BillingSubscription | null }) {
  const { t } = useTranslation()
  const tone = 'text-primary-foreground'

  if (!subscription) return <p className={tone}>{t('tiers.noSubscription')}</p>
  if (!subscription.card) return <p className={tone}>{t('tiers.noCard')}</p>
  return (
    <p className={tone}>
      {/* The brand is the provider's own lowercase token ("visa"), so the
          capital is a display choice and stays out of the string. */}
      <span className="capitalize">{subscription.card.brand}</span>{' '}
      {t('tiers.cardEnding', { last4: subscription.card.last4 })}
    </p>
  )
}

function StatusChip({ status }: { status: BillingStatus }) {
  const { t } = useTranslation()

  // Built per render, not at module scope: a `const` map holding translated
  // copy freezes whichever language loaded first. Nothing is said about the
  // healthy states — "Active" beside "auto-renews on the 22nd" is noise, and
  // the chip is worth the room only when something is wrong.
  const keys = {
    past_due: 'tiers.statusPastDue',
    cancelled: 'tiers.statusCancelled',
    paused: 'tiers.statusPaused',
    expired: 'tiers.statusExpired',
    unpaid: 'tiers.statusUnpaid',
  } as const

  const key = status in keys ? keys[status as keyof typeof keys] : null
  if (!key) return null
  return <Chip variant="muted">{t(key)}</Chip>
}
