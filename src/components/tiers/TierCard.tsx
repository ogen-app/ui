import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { CheckFatIcon, RocketLaunchIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { cardHighlights, grant, type CardGain } from '@/lib/upgradeOffer'
import { cn } from '@/lib'
import { TierPrice } from './TierPrice'
import type { Tier } from '@/types/tiers'

type Props = {
  tier: Tier
  /**
   * The card to this one's left, which its checklist is written against —
   * "Everything in Pro, plus:" — or null for the first.
   */
  previous: Tier | null
  /** Whether this is the plan the page puts forward (`recommendedPlan`). */
  recommended: boolean
  /** Whether this is the tier the workspace holds right now. */
  current: boolean
  /** Whether this is the tier the workspace has already been moved onto. */
  scheduled: boolean
  /**
   * Whether this reader may choose at all (CON-232).
   *
   * False takes the button off **every** card, which is why it is safe: the
   * screen then reads as the comparison it also is, and the one sentence under
   * the heading says whose decision it is. A card with a hole where its
   * neighbours have a control is read as broken; a page of cards with no
   * controls is read as a price list.
   */
  mayChoose: boolean
  onChoose: (tier: Tier) => void
  busy: boolean
}

/**
 * One plan: its name, its price, a short checklist and the button.
 *
 * **No figures on the card.** It says what the plan adds and the comparison
 * under the cards says how much — a card that carried every limit was a table
 * cut into three, and read as one.
 *
 * The recommended plan sits in a frame of the sweep with the word on its top
 * edge; the frame reaches past the body rather than taking room from it.
 *
 * The current tier keeps its button, disabled, rather than losing it. A card
 * with a hole where every other card has a control is read as broken before it
 * is read as "this one is yours". Calling off a scheduled change is *not* here:
 * it belongs beside the sentence that announced it.
 */
export function TierCard({
  tier,
  previous,
  recommended,
  current,
  scheduled,
  mayChoose,
  onChoose,
  busy,
}: Props) {
  const { t } = useTranslation()
  const { plus, gains } = cardHighlights(tier, previous)
  const lines =
    plus && previous
      ? gains.map((gain) => ({ id: gain.key, text: gainLine(t, gain) }))
      : CAPABILITY_LINES.map((id) => ({
          id,
          text: t(`tiers.capabilities.${id}`),
        }))

  return (
    // Every column starts a band's height down, so the white bodies — and the
    // buttons at their feet — sit on the same lines whether or not a card is
    // framed. The frame is drawn *outside* the body rather than around it:
    // wrapping the body would make the recommended one narrower and shorter
    // than its neighbours, which is exactly the misalignment this avoids.
    <div className="relative flex flex-col pt-9">
      {recommended && (
        <div
          aria-hidden
          className="absolute -inset-x-1 -bottom-1 top-0 rounded-lg bg-linear-120 from-sweep-from to-sweep-to"
        />
      )}
      {recommended && (
        <p className="absolute inset-x-0 top-0 flex h-9 items-center px-5 text-xs font-medium tracking-wider text-primary">
          {t('tiers.recommended')}
        </p>
      )}
      <section
        className={cn(
          'relative flex grow flex-col gap-6 rounded-lg border bg-primary p-6 min-w-0',
          recommended ? 'border-transparent' : 'border-border',
        )}
      >
        <header className="flex flex-col gap-4 min-w-0">
          {/* Not a catalogue key and not translated: a tier's name is data, and
              today it is a title-cased slug because the payload carries no name
              at all — see `nameFromSlug` in `services/api/entitlements.ts`. */}
          <h3 className="font-display text-3xl font-medium tracking-tight min-w-0 truncate">
            {tier.name}
          </h3>
          <p className="flex min-h-11 items-baseline gap-1.5 text-sm text-tertiary-foreground">
            <TierPrice tier={tier} size="large" />
          </p>
        </header>

        <div className="flex flex-col gap-3 min-w-0">
          {plus && previous && (
            <p className="text-sm font-medium">
              {t('tiers.everythingIn', { name: previous.name })}
            </p>
          )}
          <ul className="flex flex-col gap-2.5 min-w-0">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex items-start gap-2.5 text-sm min-w-0"
              >
                <CheckFatIcon
                  size={12}
                  weight="fill"
                  className="mt-1 shrink-0 text-positive"
                  aria-hidden
                />
                <span className="min-w-0">{line.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Choosing is the act on this page that spends money, so every
            CHOOSE is the filled sweep. The plan already held keeps an outlined
            button that is disabled without looking it: greyed out, it read as
            a plan that could not be had rather than the one you have. */}
        {mayChoose && (
          <div className="mt-auto">
            {current || scheduled ? (
              <Button
                variant="outline"
                className="w-full justify-center"
                disabled
              >
                {current
                  ? t('tiers.currentPlanButton')
                  : t('tiers.scheduledBadge')}
              </Button>
            ) : (
              <Button
                variant="sweep"
                className="w-full justify-center"
                disabled={busy}
                onClick={() => onChoose(tier)}
                aria-label={t('tiers.chooseNamed', { name: tier.name })}
              >
                <RocketLaunchIcon weight="fill" aria-hidden />
                {t('tiers.choose')}
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * What the first card says: what the product does, whatever the plan allows.
 * Every plan has these, which is why they are copy rather than a reading of
 * the allowances — and why a later card never repeats them.
 */
const CAPABILITY_LINES = [
  'voice',
  'strategy',
  'store',
  'publish',
  'quality',
  'analytics',
] as const

/**
 * One gain over the card before, with no number in it. Seats are worded by
 * where they start: a plan whose predecessor seats one person is the first
 * that lets you invite anybody at all.
 */
function gainLine(t: TFunction, { key, from }: CardGain): string {
  if (key === 'team_seats' && grant(from) > 1) {
    return t('tiers.gain.team_seats_more')
  }
  return t(`tiers.gain.${key}`)
}
