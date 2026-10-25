import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { CheckIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/intl'
import { cn } from '@/lib/styles'
import { toMajorUnits } from '@/lib/tierPrice'
import { billingOptions } from '@/lib/upgradeOffer'
import {
  TIER_FEATURE_ORDER,
  featureLabel,
  featureValue,
  formatStorage,
  isByteKey,
  type TierFeatureKey,
  type TierFeatureValue,
} from '@/lib/tierFeatures'
import type { TierVersionPrice, UsageReset } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

/**
 * What a column's button does, decided by the page — which knows the plan in
 * force, the reader's role and whether there is a subscription — and drawn
 * here.
 */
export type LedgerAction =
  /** Nothing to press: the reader cannot choose (a member). */
  | { kind: 'none' }
  /** Present and dead, with the reason as its label. */
  | { kind: 'held' | 'scheduled' | 'unavailable' }
  /** Buys or moves to this tier. `freeMonth` changes the label only. */
  | { kind: 'choose'; freeMonth: boolean }
  /**
   * Moves a complimentary workspace to this tier, free and at once (CON-402).
   * No price is involved, so it needs none to be pressable.
   */
  | { kind: 'switch' }

/**
 * The line above the price, in small capitals. `freeWhileTesting` stands in
 * for the price as well: a complimentary workspace is shown no money at all.
 */
export type LedgerLabel =
  'chargedToday' | 'freeMonthThen' | 'current' | 'freeWhileTesting' | null

export type LedgerColumn = {
  tier: Tier
  action: LedgerAction
  label: LedgerLabel
}

type Props = {
  columns: readonly LedgerColumn[]
  interval: TierVersionPrice['interval']
  /** The tier drawn inverted. Null draws none — there is no popular plan. */
  popularTierId: string | null
  /** The column whose button takes focus on arrival (`?plan=`). */
  focusTierId: string | null
  onChoose: (tier: Tier, price: TierVersionPrice | null) => void
  busy: boolean
}

/**
 * The plans as one ledger (CON-328): a column per tier, and under every column
 * the *same* allowances in the *same* rows, so a row reads across.
 *
 * That is the design's whole point, and the reason this replaced a row of
 * cards with a comparison table under them: the cards each told their own
 * story ("Everything in Starter, plus…") and the table told the comparison, so
 * the page said everything twice and made the reader do the joining. Here the
 * figure sits at the end of its row, in Plex Mono, with a dash for what a tier
 * does not include.
 *
 * The rows are the catalogue's own keys, in `TIER_FEATURE_ORDER`, kept only
 * where at least one tier on offer states something — so a feature nobody
 * decided to charge for does not fill the page with ticks. No per-tier copy is
 * written anywhere: the catalogue has no tagline field, and a table of them
 * keyed on a tier slug goes blank for the first tier published without telling
 * this build.
 *
 * One column is inverted — the plan most people should start on, by the same
 * rule the upgrade dialog uses (`recommendedPlan`). Its button is the page's
 * one teal fill; every other choice is the ink one.
 */
export function PlanLedger({
  columns,
  interval,
  popularTierId,
  focusTierId,
  onChoose,
  busy,
}: Props) {
  const { t } = useTranslation()
  const rows = TIER_FEATURE_ORDER.filter((key) =>
    columns.some(({ tier }) => key in tier.entitlements),
  )
  const style = { '--columns': columns.length } as CSSProperties

  return (
    <div
      className="grid grid-cols-1 border border-border md:grid-cols-[repeat(var(--columns),minmax(0,1fr))]"
      style={style}
    >
      {columns.map((column) => (
        <Column
          key={column.tier.id}
          column={column}
          rows={rows}
          interval={interval}
          popular={column.tier.tierId === popularTierId}
          focus={column.tier.tierId === focusTierId}
          onChoose={onChoose}
          busy={busy}
          t={t}
        />
      ))}
    </div>
  )
}

function Column({
  column: { tier, action, label },
  rows,
  interval,
  popular,
  focus,
  onChoose,
  busy,
  t,
}: {
  column: LedgerColumn
  rows: readonly TierFeatureKey[]
  interval: TierVersionPrice['interval']
  popular: boolean
  focus: boolean
  onChoose: Props['onChoose']
  busy: boolean
  t: TFunction
}) {
  const price = billingOptions(tier)[interval]
  // The inverted column swaps its whole palette rather than tinting: ink
  // surface, white type, and rules a step lighter than the surface.
  const sub = popular ? 'text-quinary-foreground' : 'text-secondary-foreground'
  const rule = popular ? 'border-primary-foreground-elevated' : 'border-border'

  return (
    <section
      aria-label={tier.name}
      className={cn(
        'flex min-w-0 flex-col',
        popular
          ? 'bg-primary-foreground text-primary'
          : 'bg-primary text-primary-foreground',
        'border-border [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-t-0 md:[&:not(:first-child)]:border-l',
      )}
    >
      <header className={cn('flex flex-col gap-2 border-b p-7', rule)}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-medium tracking-tight min-w-0 truncate">
            {/* A tier's name is data, not copy — see `TierVersion.name`. */}
            {tier.name}
          </h2>
          {popular && (
            <span className="shrink-0 rounded-[2px] border border-primary-foreground-elevated px-2 py-1 text-[11px] font-medium leading-none tracking-[0.1em]">
              {t('tiers.ledger.mostPopular')}
            </span>
          )}
        </div>
      </header>

      <div className={cn('flex flex-col gap-6 border-b p-7', rule)}>
        <div className="flex flex-col gap-3">
          <p
            className={cn(
              'min-h-4 text-[11px] font-medium leading-4 tracking-[0.1em]',
              sub,
            )}
          >
            {label ? t(LABEL_KEY[label]) : null}
          </p>
          {label !== 'freeWhileTesting' && (
            <Price price={price} interval={interval} sub={sub} t={t} />
          )}
        </div>
        <ColumnButton
          tier={tier}
          action={action}
          price={price}
          popular={popular}
          focus={focus}
          onChoose={onChoose}
          busy={busy}
          t={t}
        />
      </div>

      <div className="flex grow flex-col p-7 pt-6">
        <p
          className={cn(
            'pb-3 text-[11px] font-medium leading-4 tracking-[0.1em]',
            sub,
          )}
        >
          {t('tiers.ledger.allowances')}
        </p>
        <dl className="flex flex-col">
          {rows.map((key) => (
            <div
              key={key}
              className={cn(
                'flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0',
                popular
                  ? 'border-primary-foreground-elevated'
                  : 'border-tertiary',
              )}
            >
              <dt className={cn('min-w-0 text-[13px]', sub)}>
                {featureLabel(t, key)}
              </dt>
              <dd className="shrink-0 text-right">
                <Allowance
                  featureKey={key}
                  value={featureValue(tier.entitlements[key])}
                  popular={popular}
                  t={t}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

const LABEL_KEY = {
  chargedToday: 'tiers.ledger.chargedToday',
  freeMonthThen: 'tiers.ledger.freeMonthThen',
  current: 'tiers.ledger.currentLabel',
  freeWhileTesting: 'tiers.ledger.freeWhileTesting',
} as const

/**
 * The figure, and one line under it that says how it is billed, net.
 *
 * Yearly is shown as its monthly equivalent so the three columns compare like
 * for like, with the year's total under it — the number the invoice will
 * carry. Decimals only where the division leaves some.
 */
function Price({
  price,
  interval,
  sub,
  t,
}: {
  price: TierVersionPrice | null
  interval: TierVersionPrice['interval']
  sub: string
  t: TFunction
}) {
  const { i18n } = useTranslation()
  if (!price) {
    return <p className="font-display text-5xl font-light leading-none">—</p>
  }
  const locale = i18n.language
  const major = toMajorUnits(price.amount, price.currency, locale)
  const money = (value: number) =>
    formatNumber(
      value,
      {
        style: 'currency',
        currency: price.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      },
      locale,
    )
  const perMonth = interval === 'year' ? major / 12 : major
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-1.5">
        <span className="font-display text-5xl font-light leading-none tracking-tight">
          {money(Math.round(perMonth * 100) / 100)}
        </span>
        <span className={cn('text-sm', sub)}>{t('tiers.ledger.perMonth')}</span>
      </p>
      <p className={cn('text-[13px]', sub)}>
        {interval === 'year'
          ? t('tiers.ledger.billedYearly', { total: money(major) })
          : t('tiers.ledger.billedMonthly')}
      </p>
    </div>
  )
}

function ColumnButton({
  tier,
  action,
  price,
  popular,
  focus,
  onChoose,
  busy,
  t,
}: {
  tier: Tier
  action: LedgerAction
  price: TierVersionPrice | null
  popular: boolean
  focus: boolean
  onChoose: Props['onChoose']
  busy: boolean
  t: TFunction
}) {
  const { i18n } = useTranslation()
  if (action.kind === 'none') return null
  const className = 'w-full justify-center'
  if (action.kind === 'switch') {
    return (
      <Button
        variant="defaultInverted"
        size="xl"
        className={className}
        disabled={busy}
        autoFocus={focus}
        onClick={() => onChoose(tier, null)}
        aria-label={t('tiers.switchNamed', { name: tier.name })}
      >
        {t('tiers.ledger.switchNamed', {
          name: tier.name.toLocaleUpperCase(i18n.language),
        })}
      </Button>
    )
  }
  if (action.kind !== 'choose' || !price) {
    const key =
      action.kind === 'held'
        ? 'tiers.ledger.currentPlan'
        : action.kind === 'scheduled'
          ? 'tiers.ledger.scheduled'
          : 'tiers.ledger.unavailable'
    return (
      <Button
        variant="outline"
        size="xl"
        className={cn(
          className,
          popular && 'border-primary-foreground-elevated text-primary',
        )}
        disabled
      >
        {t(key)}
      </Button>
    )
  }
  return (
    <Button
      variant={popular ? 'accent' : 'defaultInverted'}
      size="xl"
      className={className}
      disabled={busy}
      autoFocus={focus}
      onClick={() => onChoose(tier, price)}
      aria-label={t('tiers.chooseNamed', { name: tier.name })}
    >
      {action.freeMonth
        ? t('tiers.ledger.startFreeMonth')
        : t('tiers.ledger.chooseNamed', {
            name: tier.name.toLocaleUpperCase(i18n.language),
          })}
    </Button>
  )
}

/** One cell at the end of a row: a figure, a word, a tick or a dash. */
function Allowance({
  featureKey,
  value,
  popular,
  t,
}: {
  featureKey: TierFeatureKey
  value: TierFeatureValue
  popular: boolean
  t: TFunction
}) {
  const { i18n } = useTranslation()
  if (value.kind === 'included') {
    return (
      <>
        <CheckIcon size={14} weight="bold" className="inline" aria-hidden />
        <span className="sr-only">{t('tiers.included')}</span>
      </>
    )
  }
  if (value.kind === 'excluded') {
    return (
      <>
        <span
          aria-hidden
          className={
            popular ? 'text-secondary-foreground' : 'text-quinary-foreground'
          }
        >
          —
        </span>
        <span className="sr-only">{t('tiers.excluded')}</span>
      </>
    )
  }
  if (value.kind === 'unlimited') {
    return (
      <span className="text-[13px] font-medium">{t('tiers.unlimited')}</span>
    )
  }
  const write = (amount: number) => formatNumber(amount, {}, i18n.language)
  const written = isByteKey(featureKey)
    ? formatStorage(value.limit, write)
    : write(value.limit)
  return (
    <span className="font-mono text-sm font-medium">
      {t(limitKey(value.reset), { value: written })}
    </span>
  )
}

function limitKey(reset: UsageReset | null) {
  switch (reset) {
    case 'monthly':
      return 'tiers.limitMonth' as const
    case 'total':
      return 'tiers.limitTotal' as const
    case 'per_post':
      return 'tiers.limitPost' as const
    default:
      return 'tiers.limitFlat' as const
  }
}
