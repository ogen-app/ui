import { describe, expect, it } from 'vitest'

import { displayPrice, toMajorUnits } from './tierPrice'
import type { TierVersionPrice } from '@/types/entitlements'

/**
 * Which price a card shows, and how the number is read.
 *
 * Both halves fail quietly. A country-specific row picked by accident shows a
 * figure nobody will be charged; a wrong minor-unit divisor is off by a factor
 * of a hundred and still looks like a price.
 */

function price(over: Partial<TierVersionPrice> = {}): TierVersionPrice {
  return {
    amount: 4900,
    currency: 'EUR',
    interval: 'month',
    countryCode: null,
    ...over,
  }
}

describe('displayPrice', () => {
  it('has nothing to show for a version with no prices', () => {
    // The internal tier, and any tier whose pricing is undecided. The card omits
    // the line rather than printing zero.
    expect(displayPrice([])).toBeNull()
  })

  it('takes the monthly row over the yearly one', () => {
    const monthly = price()
    const yearly = price({ amount: 49000, interval: 'year' })
    expect(displayPrice([yearly, monthly])).toBe(monthly)
  })

  it('still shows a version priced only by the year', () => {
    const yearly = price({ interval: 'year' })
    expect(displayPrice([yearly])).toBe(yearly)
  })

  it('never shows a country-specific row', () => {
    // The client knows a browser language, which is not a jurisdiction. Showing
    // a price the checkout will not charge is worse than showing the default.
    const local = price({ amount: 3900, countryCode: 'PL' })
    const published = price()
    expect(displayPrice([local, published])).toBe(published)
  })

  it('shows nothing rather than a local price when only local rows exist', () => {
    expect(displayPrice([price({ countryCode: 'PL' })])).toBeNull()
  })

  it('leaves the choice of currency to the server, taking the first', () => {
    // There is no exchange rate, billing address or checkout hint on this side
    // to choose with, so wire order is the only stable answer.
    const eur = price()
    const usd = price({ currency: 'USD', amount: 5400 })
    expect(displayPrice([eur, usd])).toBe(eur)
  })
})

describe('toMajorUnits', () => {
  it('divides a two-decimal currency by a hundred', () => {
    expect(toMajorUnits(4900, 'EUR', 'en')).toBe(49)
  })

  it('does not divide a currency with no minor unit', () => {
    // The failure this exists for: 7900 yen shown as ¥79. Plausible on screen,
    // and caught by nobody without a Japanese customer.
    expect(toMajorUnits(7900, 'JPY', 'en')).toBe(7900)
  })

  it('divides a three-decimal currency by a thousand', () => {
    expect(toMajorUnits(15000, 'KWD', 'en')).toBe(15)
  })

  it('reads the same number whatever language it will be written in', () => {
    // How many minor units make a unit is a property of the currency; the locale
    // only decides how the digits are drawn.
    expect(toMajorUnits(4900, 'EUR', 'es')).toBe(
      toMajorUnits(4900, 'EUR', 'en'),
    )
  })

  it('falls back to two decimals for a code Intl will not accept', () => {
    // A malformed currency is not worth throwing a plan screen away over, and
    // two decimals is the overwhelming majority.
    expect(toMajorUnits(4900, 'not-a-currency', 'en')).toBe(49)
  })

  it('keeps zero at zero', () => {
    expect(toMajorUnits(0, 'EUR', 'en')).toBe(0)
  })
})
