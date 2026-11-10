/**
 * The analytics dashboard's address (CON-463): its period, platforms and
 * campaign as search params, named as the endpoints name them — `window` or
 * `from` + `to`, `platform` (the pages' comma list for a repeated key) and
 * `campaign_id`. Being the address is what lets the assistant set them
 * (`set_window`) and put them back, and a link carry them.
 */
export type AnalyticsSearch = {
  /** A relative span — `7d`, `12w`, `6mo`. Ignored with `from` and `to`. */
  window?: string
  /** Inclusive `YYYY-MM-DD`; only with `to`. */
  from?: string
  /** Inclusive `YYYY-MM-DD`; only with `from`. */
  to?: string
  /** Zernio slugs, comma-separated; absent is every platform. */
  platform?: string
  campaign_id?: string
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const SPAN = /^\d{1,3}(d|w|mo)$/
const SLUG = /^[a-z0-9_-]{1,40}$/

/**
 * Reads the address, dropping what the endpoints would refuse: half a range,
 * a malformed span, an unknown-looking slug. A dropped value falls back to the
 * dashboard's default rather than failing the page.
 */
export function validateAnalyticsSearch(
  raw: Record<string, unknown>,
): AnalyticsSearch {
  const out: AnalyticsSearch = {}
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const from = text(raw.from)
  const to = text(raw.to)
  if (DAY.test(from) && DAY.test(to) && from <= to) {
    out.from = from
    out.to = to
  } else if (SPAN.test(text(raw.window))) {
    out.window = text(raw.window)
  }
  const platforms = text(raw.platform)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => SLUG.test(s))
  if (platforms.length > 0) out.platform = [...new Set(platforms)].join(',')
  const campaign = text(raw.campaign_id)
  if (campaign) out.campaign_id = campaign
  return out
}

/** The platforms the address names; empty for every one. */
export function searchPlatforms(search: AnalyticsSearch): string[] {
  return search.platform ? search.platform.split(',') : []
}

/**
 * An analytics window as the address. `keepPeriod` is the address's own period
 * when the window's dates are only that period resolved — so "show me
 * LinkedIn" leaves "last 28 days" a preset instead of pinning its dates.
 */
export function searchFromWindow(
  window: {
    from?: string
    to?: string
    platforms?: string[]
    campaignId?: string
  },
  keepPeriod?: Pick<AnalyticsSearch, 'window' | 'from' | 'to'>,
): AnalyticsSearch {
  const out: AnalyticsSearch = keepPeriod
    ? { ...keepPeriod }
    : window.from && window.to
      ? { from: window.from, to: window.to }
      : {}
  if (window.platforms && window.platforms.length > 0) {
    out.platform = window.platforms.join(',')
  }
  if (window.campaignId) out.campaign_id = window.campaignId
  return validateAnalyticsSearch(out)
}
