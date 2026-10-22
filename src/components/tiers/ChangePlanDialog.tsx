import { useTranslation } from 'react-i18next'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { formatDay } from '@/components/entitlements/parts'
import { formatNumber } from '@/lib/intl'
import { toMajorUnits } from '@/lib/tierPrice'
import type { TierSnapshot, TierVersionPrice } from '@/types/entitlements'
import type { Tier } from '@/types/tiers'

type Props = {
  /** The tier being moved to. */
  target: Tier
  price: TierVersionPrice | null
  /** What the workspace is on now — for the free month and the 409 wording. */
  held: TierSnapshot
  /**
   * The server refused with 409 `trial_upgrade_unavailable`: the dialog stays
   * open and says so, rather than closing on a toast that names a date nobody
   * can then see.
   */
  blocked: boolean
  busy: boolean
  onConfirm: () => void
  onClose: () => void
  onManage: () => void
}

/**
 * Confirming a plan change on a workspace that already pays (CON-328).
 *
 * A checkout needs no confirmation — Lemon Squeezy's own page is one. An
 * in-place change does: it is charged, or scheduled, the moment the server
 * answers, and the one thing the reader cannot know from the price list is
 * what *this* click costs them now.
 *
 * Which way the change goes is not said here, because only the server ranks
 * tiers (`direction` arrives on the plan afterwards and the toast states it).
 * What *is* said, because it is certain: during the free month any change ends
 * it and charges today — the server never grants another tier free.
 */
export function ChangePlanDialog({
  target,
  price,
  held,
  blocked,
  busy,
  onConfirm,
  onClose,
  onManage,
}: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const name = target.name
  const onTrial = held.trialEndsAt !== null

  if (blocked) {
    return (
      <ModalContainer
        isOpen
        onClose={onClose}
        title={t('tiers.changeDialog.blockedTitle')}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm">
            {held.trialEndsAt
              ? t('tiers.changeDialog.blockedBody', {
                  name: held.name,
                  when: formatDay(held.trialEndsAt, locale),
                })
              : t('tiers.changeDialog.blockedBodyBare', { name: held.name })}
          </p>
          <p className="text-[13px] text-tertiary-foreground">
            {t('tiers.changeDialog.nothingCharged', { name: held.name })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onManage}>
              {t('tiers.managePortal')}
              <ArrowSquareOutIcon />
            </Button>
            <Button variant="defaultInverted" onClick={onClose}>
              {t('tiers.changeDialog.ok')}
            </Button>
          </div>
        </div>
      </ModalContainer>
    )
  }

  const amount = price
    ? t(price.interval === 'year' ? 'tiers.perYear' : 'tiers.perMonth', {
        price: formatNumber(
          toMajorUnits(price.amount, price.currency, locale),
          { style: 'currency', currency: price.currency },
          locale,
        ),
      })
    : null

  return (
    <ModalContainer
      isOpen
      onClose={onClose}
      title={t('tiers.changeDialog.title', { name })}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm">
          {onTrial
            ? t('tiers.changeDialog.trialBody', {
                name: held.name,
                target: name,
              })
            : t('tiers.changeDialog.body')}
        </p>
        {amount && (
          <div className="flex items-baseline justify-between gap-4 rounded-md bg-secondary px-4 py-3">
            <span className="text-[13px] text-tertiary-foreground">{name}</span>
            <span className="text-sm font-medium">
              {t('tiers.priceExclVat', { price: amount })}
            </span>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('tiers.changeDialog.cancel')}
          </Button>
          <Button variant="defaultInverted" onClick={onConfirm} loading={busy}>
            {t('tiers.changeDialog.confirm', {
              name: name.toLocaleUpperCase(locale),
            })}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
