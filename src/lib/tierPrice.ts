import type { TierVersionPrice } from '@/types/entitlements'

/**
 * Which of a tier version's price rows a card shows (CON-243).
 *
 * A version is priced as a *list*: one row per currency, per billing interval,
 * and optionally per country. A plan card has room for one line, so something
 * has to choose — and the choosing is here rather than inside the card because
 * it is a rule with a reason, not a `[0]`.
 *
 * Three rules, in order:
 *
 * 1. **Never a country-specific row.** Those exist to be selected by something
 *    that knows where the customer is, and the client does not: it knows a
 *    browser locale, which is a language preference and not a jurisdiction.
 *    Showing a Spanish speaker in Berlin the Argentine price would be wrong in
 *    the way that matters — the number would not be what they are charged. The
 *    default row (`countryCode: null`) is the one the seller publishes to
 *    everyone, so it is the one that is safe to publish here.
 * 2. **Monthly over yearly.** A monthly figure is the smaller of the two and the
 *    one every comparison table leads with; a version priced only yearly still
 *    gets its line, worded for the year.
 * 3. **Wire order otherwise.** Which *currency* to show is the server's decision
 *    and not one the client can improve on — it has no exchange rates, no
 *    billing address, and no way to know which of them the checkout will use.
 *    Taking the first is at least stable between renders.
 *
 * Null when the version has no default price at all, which is the answer for the
 * internal tier (`prices: null` on the wire) and for a tier whose pricing has
 * not been decided. The card omits the line: saying nothing about money is
 * honest, and saying "$0" is not.
 */
export function displayPrice(
  prices: readonly TierVersionPrice[],
): TierVersionPrice | null {
  const published = prices.filter((price) => price.countryCode === null)
  return (
    published.find((price) => price.interval === 'month') ??
    published[0] ??
    null
  )
}

/**
 * A `net_minor` amount as the number a person would say.
 *
 * **The divisor is not always 100.** `net_minor` is minor units, and how many of
 * them make one unit is a property of the currency: two for EUR and USD, none at
 * all for JPY and KRW, three for KWD and BHD. Dividing by 100 everywhere would
 * price Ogen at a hundredth of its yen figure — the kind of wrong that looks
 * plausible on screen and is caught by nobody without a Japanese customer.
 *
 * `Intl` already holds that table, so it is asked rather than copied here: a
 * hand-written list of exponents is one more thing to keep in step with ISO
 * 4217. The locale only affects how the digits would be *written* and not how
 * many there are, but it is passed through so the lookup happens in the same
 * language the caller will format in.
 */
export function toMajorUnits(
  minor: number,
  currency: string,
  locale: string,
): number {
  let digits = 2
  try {
    const resolved = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).resolvedOptions()
    digits = resolved.maximumFractionDigits ?? digits
  } catch {
    // A currency code `Intl` will not accept — the server sending something
    // malformed, which is not worth throwing a plan screen away over. Two
    // decimals is the overwhelming majority and the same guess the old code made
    // unconditionally.
  }
  return minor / 10 ** digits
}
