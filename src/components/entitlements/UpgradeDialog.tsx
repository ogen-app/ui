import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { StarIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { ModalContainer } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { FeatureValue } from '@/components/tiers/TierFeatureList'
import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useTiers } from '@/hooks/useTiers'
import { useCanChangePlan } from '@/hooks/useWorkspaces'
import {
  featureLabel,
  featureValue,
  isTierFeatureKey,
  type TierFeatureKey,
} from '@/lib/tierFeatures'
import { UpgradeCallout } from './UpgradeCallout'
import type { UpgradeGate } from './useUpgradeGate'
import type { Entitlement } from '@/types/entitlements'

type Denied = Extract<Entitlement, { state: 'denied' }>

/**
 * What a sold denial looks like when the user has already clicked.
 *
 * A modal rather than an inline notice, because by the time this renders the
 * user has asked for something and is owed an answer to *that* — not a message
 * that appears somewhere else on the screen for them to go and find. It is the
 * one rendering in this folder that interrupts, and `useUpgradeGate` is the
 * only thing that opens it.
 *
 * It answers in three parts, which is the whole shape of the thing: an offer at
 * the top, **where you stand** in the middle, and a way out along the bottom.
 * The middle is `UpgradeCallout` unchanged, so the sentence read here is the one
 * that would be read inline — it is handed no `onUpgrade`, because a dialog
 * answers itself along its bottom edge and not in the body.
 *
 * **It names the feature and says what the plans do about it.** The gate
 * carries its key, so the block under the callout is one row of the price list:
 * the same feature, one line per purchasable plan, rendered by the same
 * component the plan screen uses. That is the question somebody stopped by a
 * limit is actually asking — *would paying fix this, and by how much* — and it
 * is the difference between an offer and an advertisement. A key with no row on
 * that table (`assistant_multiplier`, whose allowance is a token budget we have
 * decided never to print) simply gets no block; nothing is invented for it.
 *
 * **Not everyone reading this can act on it.** A member sees the same offer and
 * the same numbers — knowing what the workspace's plan costs them is not an
 * owner's privilege — and then one button that closes, with a line saying whose
 * decision it is. Sending them to `/plans` to find every control inert is the
 * version of this that wastes their time and teaches them the app is broken.
 *
 * **Where SEE PLANS goes is decided here, once.** Every call site sells the
 * same plan screen, so knowing its address is not eleven screens' business.
 *
 * Dismissal is a real choice, spelled out. A modal offering only the way
 * forward reads as a toll gate, and the answer to "you've used all 3" is often
 * to go and delete one — which is behind this dialog, not beyond it.
 */
export function UpgradeDialog({
  gate,
  format,
  hideUsage,
  mayChange,
}: {
  gate: UpgradeGate
  /** Both passed straight to the callout — see `UpgradeCallout`. */
  format?: (value: number) => string
  hideUsage?: boolean
  /**
   * Whose decision the plan is, when the caller already knows.
   *
   * Left out everywhere in the app — eleven call sites each fetching a role to
   * hand to the same dialog is eleven chances to disagree about it, so the
   * dialog asks. It is a prop at all for the reason `PlanBillingCard` takes its
   * role as one: `/design/entitlement-stoppers` has no session and no API, and
   * both halves of this dialog have to be lookable at side by side.
   */
  mayChange?: boolean
}) {
  const { t } = useTranslation()
  if (gate.entitlement.state !== 'denied') return null

  return (
    <ModalContainer
      isOpen={gate.selling}
      onClose={gate.dismiss}
      label={t('tiers.pitchTitle')}
      size="default"
      showCloseButton={false}
      isContainer
    >
      {/* The body is a child rather than this component's own markup so that
          the price list is read when the dialog *opens* and not when it mounts.
          Every gated screen keeps one of these on standby, and `useTiers` behind
          each of them would fetch the catalogue behind every lock in the app —
          which is the one thing `useTiers` is documented not to do. A modal that
          is shut renders no children, so the hooks below never run. */}
      <Pitch
        gate={gate}
        entitlement={gate.entitlement}
        format={format}
        hideUsage={hideUsage}
        mayChange={mayChange}
      />
    </ModalContainer>
  )
}

function Pitch({
  gate,
  entitlement,
  format,
  hideUsage,
  mayChange: told,
}: {
  gate: UpgradeGate
  entitlement: Denied
  format?: (value: number) => string
  hideUsage?: boolean
  mayChange?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const role = useCanChangePlan()
  const mayChange = told ?? role
  // Narrowed rather than asserted: the gate's key is every feature the app can
  // ask about, and the price list is the narrower set that has a heading.
  const feature = isTierFeatureKey(gate.feature) ? gate.feature : null

  return (
    <div className="flex flex-col">
      <header className="flex items-start gap-3 px-6 pt-6 pb-5">
        {/* The tile a chosen thing wears elsewhere in this feature — see
            `PlanBanner` and `CampaignTypeCard`. Teal is a fill and not ink in
            this theme, so it colours the mark and nothing that has to be read
            (`docs/colors.md`). */}
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-accent">
          <StarIcon size={22} weight="fill" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-lg font-medium tracking-tight">
            {t('tiers.pitchTitle')}
          </h2>
          {feature && (
            <p className="text-sm text-tertiary-foreground">
              {featureLabel(t, feature)}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-5 px-6 pb-6">
        <UpgradeCallout
          entitlement={entitlement}
          format={format}
          hideUsage={hideUsage}
        />
        {feature && <PlanOffers feature={feature} />}
        {/* Under the offer rather than in place of it: the numbers above are
            worth reading whoever is reading them, and this is the one fact that
            changes what to do next. */}
        {!mayChange && (
          <p className="text-[13px] text-tertiary-foreground">
            {t('tiers.ownersOnlyPlan')}
          </p>
        )}
      </div>

      <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">
        {mayChange ? (
          <>
            <Button variant="ghost" onClick={gate.dismiss}>
              {t('tiers.notNow')}
            </Button>
            {/* The one action on this screen worth colouring, which is what
                the `accent` variant is for — and why the way out beside it is
                a ghost rather than a second filled button. */}
            <Button
              variant="accent"
              onClick={() => {
                gate.dismiss()
                void navigate({ to: '/plans' })
              }}
            >
              {t('tiers.seePlans')}
            </Button>
          </>
        ) : (
          // One button, and deliberately not the teal one: nothing here is
          // being sold to this reader, so colouring the way out would make the
          // colour mean "a button". `neutral` is the filled weight that reads
          // as an object on a white modal — `default` is white on white.
          <Button variant="neutral" onClick={gate.dismiss}>
            {t('common.close')}
          </Button>
        )}
      </footer>
    </div>
  )
}

/**
 * One row of the price list, for the feature that just stopped somebody.
 *
 * Every purchasable plan and what it grants of this one key — the plan screen's
 * own `FeatureValue`, so "25 per month" is worded here exactly as it is worded
 * there. The plan the workspace holds is marked when it appears, which it often
 * will not: `GET /api/public/pricing` publishes only what can be bought, and a
 * grandfathered version is not in it.
 *
 * Silent rather than apologetic when the list is missing. The callout above has
 * already said what happened; a plan comparison that failed to load is not news
 * worth a sentence in a dialog somebody wants to leave.
 */
function PlanOffers({ feature }: { feature: TierFeatureKey }) {
  const { t } = useTranslation()
  const tiers = useTiers()
  const plan = useWorkspacePlan()

  const offered = (tiers.data ?? []).filter((tier) => tier.purchasable)
  if (!tiers.isLoading && offered.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-medium">
        {t('tiers.pitchPlans', { feature: featureLabel(t, feature) })}
      </h3>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
        {tiers.isLoading
          ? // Placeholders rather than nothing: the dialog is already open by
            // the time this answers, and a box that grows a table under the
            // cursor is worse than one that is briefly quiet.
            [0, 1, 2].map((row) => (
              <li
                key={row}
                className="flex items-center justify-between gap-4 px-3 py-2"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </li>
            ))
          : offered.map((tier) => (
              <li
                key={tier.id}
                className="flex items-baseline justify-between gap-4 px-3 py-2 text-[13px]"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  {/* Data, not copy: a tier's name is whatever the server
                      calls it — see `TierCard`. */}
                  <span className="truncate">{tier.name}</span>
                  {tier.id === plan.data?.tier.id && (
                    // Marked, not sized like a control: a `Chip` at its own
                    // padding is taller than the row it sits in and makes one
                    // line of the table a different height from the rest.
                    <Chip
                      variant="muted"
                      className="rounded-[3px] px-1.5 py-0 text-[11px]"
                    >
                      {t('tiers.currentBadge')}
                    </Chip>
                  )}
                </span>
                <span className="shrink-0 font-medium">
                  <FeatureValue
                    featureKey={feature}
                    value={featureValue(tier.entitlements[feature])}
                  />
                </span>
              </li>
            ))}
      </ul>
    </section>
  )
}
