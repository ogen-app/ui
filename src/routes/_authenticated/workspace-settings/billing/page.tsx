import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowSquareOutIcon, CaretLeftIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SettingsRow } from '@/components/workspace-settings/SettingsRow'
import { formatDay } from '@/components/entitlements/parts'
import { useBilling, useBillingPortal } from '@/hooks/useBilling'
import { usePlanStatement } from '@/hooks/usePlanStatement'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { canManageBilling } from '@/types/workspace'
import { toast } from '@/stores/toastStore'
import type { BillingStatus, BillingSubscription } from '@/types/billing'

/**
 * `/workspace-settings/billing` — Plan & billing (CON-232).
 *
 * **This screen is a report and a door.** Ogen sells through Lemon Squeezy as
 * merchant of record, so the payment method, the billing address, the tax id,
 * the invoices and the cancellation all live in their hosted portal — which is
 * validated against the record they bill and legally answerable for it. This
 * page states what is true and opens that door; it does not re-collect any of
 * it. A second address field here would be one that can disagree with the
 * invoice, and a card field would be a compliance surface we have no reason to
 * own. See `services/api/billing.ts`.
 *
 * So there are exactly two things to do from here: change plan, which is ours,
 * and manage billing, which is theirs.
 */
export function BillingPage() {
  const { t, i18n } = useTranslation()
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

  if (!workspace || plan.isLoading) {
    return (
      <BillingFrame>
        <PageLoader />
      </BillingFrame>
    )
  }

  // Everything below the plan is owner-only, on the server as well as here. A
  // member gets the sentence they are entitled to and an explanation, not an
  // error screen from a request that was never theirs to make.
  const mayManage = canManageBilling(workspace.role)

  if (plan.isError || !plan.data) {
    return (
      <BillingFrame>
        <PageError header={t('tiers.planLoadFailed')} />
      </BillingFrame>
    )
  }

  const subscription = billing.data?.subscription ?? null

  return (
    <BillingFrame>
      <SettingsCard
        title={t('tiers.planTitle')}
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link to="/plans">{t('tiers.changePlan')}</Link>
          </Button>
        }
      >
        <ul>
          <SettingsRow
            title={headline ?? '—'}
            badges={
              <>
                {plan.data.tier.scheduled && (
                  <Chip variant="muted">{t('tiers.scheduledBadge')}</Chip>
                )}
                {subscription && <StatusChip status={subscription.status} />}
              </>
            }
            description={
              <>
                {timing && <p>{timing}</p>}
                {subscription?.endsAt && (
                  <p>
                    {t('tiers.accessEnds', {
                      when: formatDay(subscription.endsAt, i18n.language),
                    })}
                  </p>
                )}
              </>
            }
          />
        </ul>
      </SettingsCard>

      {mayManage ? (
        <SettingsCard
          title={t('tiers.billingSectionTitle')}
          actions={
            billing.data?.portal && (
              <Button
                variant="secondary"
                size="sm"
                onClick={openPortal}
                loading={portal.isPending}
              >
                {t('tiers.managePortal')}
                <ArrowSquareOutIcon />
              </Button>
            )
          }
        >
          <ul>
            <SettingsRow
              title={t('tiers.paymentMethod')}
              description={<PaymentLine subscription={subscription} />}
            />
            <SettingsRow
              title={t('tiers.handledByProvider')}
              description={
                <>
                  {/* The list is the answer to "where do I change my VAT
                      number" — a question this screen will be asked, and whose
                      answer is a place rather than a field. */}
                  <p>{t('tiers.providerHolds')}</p>
                  {!billing.data?.portal && <p>{t('tiers.portalMissing')}</p>}
                </>
              }
            />
          </ul>
        </SettingsCard>
      ) : (
        <SettingsCard title={t('tiers.billingSectionTitle')}>
          <ul>
            <SettingsRow description={t('tiers.ownersOnly')} />
          </ul>
        </SettingsCard>
      )}
    </BillingFrame>
  )
}

/** The card on file, or the fact that there isn't one. */
function PaymentLine({ subscription }: { subscription: BillingSubscription | null }) {
  const { t } = useTranslation()

  if (!subscription) return <p>{t('tiers.noSubscription')}</p>
  if (!subscription.card) return <p>{t('tiers.noCard')}</p>
  return (
    <p>
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

function BillingFrame({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <PageContainer variant="fullFlex">
      <div className="flex h-0 grow flex-col overflow-y-auto">
        <PageHeader
          title={t('tiers.billingTitle')}
          fadeOnScroll
          back={
            <Button variant="headerIcon" size="excluded" asChild aria-label={t('tiers.planBack')}>
              <Link to="/workspace-settings">
                <CaretLeftIcon className="size-5" />
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col gap-8 px-3 pb-10 pt-4 lg:px-6">
          <p className="mx-auto w-full max-w-content px-6 text-sm text-tertiary-foreground">
            {/* Permanent, not an Explainer: a page headed "Plan & billing" that
                cannot bill implies a payment relationship that does not exist,
                and that is not something to hide behind a note somebody may
                have dismissed months ago. */}
            {t('tiers.billingMock')}
          </p>
          {children}
        </div>
      </div>
    </PageContainer>
  )
}
