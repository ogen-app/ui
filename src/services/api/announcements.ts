import { apiJson, apiVoid } from './http'
import { isRecord } from './json'
import type { Announcement } from '@/types/announcements'

/**
 * Operator announcements (CON-230) — the tenant half.
 *
 * Operators write these in Harbor; this surface only reads what is showing and
 * records what the user did with it. Eligibility is entirely the server's: the
 * list is already narrowed to this user in the active workspace, so there is
 * no filtering to do here and nothing to re-derive after a click.
 *
 * The wire is **snake_case** (`cta_label`, `published_at`), whatever the ticket's
 * examples show — the handler's DTO is the contract. Empty optionals are
 * omitted rather than sent as `''`.
 */

const PATH = '/api/announcements'

/** What is showing for this user, newest first. */
export async function listAnnouncements(): Promise<Announcement[]> {
  const rows = await apiJson<unknown>(PATH, 'Unable to load announcements')
  // A banner is never worth crashing the layout over: a body that isn't an array
  // reads as "nothing to announce", and one bad row drops only itself.
  if (!Array.isArray(rows)) return []
  return rows
    .map(parseAnnouncement)
    .filter((row): row is Announcement => row !== null)
}

/** Idempotent; the server keeps the first click. 404 if it stopped showing. */
export function recordAnnouncementClick(id: string): Promise<void> {
  return apiVoid(
    `${PATH}/${encodeURIComponent(id)}/click`,
    'Unable to record that click',
    { method: 'POST' },
  )
}

/** Hides it for this user, in this workspace, for good. Idempotent. */
export function dismissAnnouncement(id: string): Promise<void> {
  return apiVoid(
    `${PATH}/${encodeURIComponent(id)}/dismiss`,
    'Unable to hide that announcement',
    { method: 'POST' },
  )
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The server validates these as absolute `https` on the way in, and this checks
 * again on the way out: the URL lands in an `href`, and a
 * `javascript:` link from a compromised or careless operator is not something
 * the tenant app should be the last line against.
 */
function httpsUrl(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    return new URL(raw).protocol === 'https:' ? raw : null
  } catch {
    return null
  }
}

export function parseAnnouncement(value: unknown): Announcement | null {
  if (!isRecord(value)) return null
  const id = text(value.id)
  const title = text(value.title)
  const body = text(value.body)
  if (!id || (!title && !body)) return null

  const ctaUrl = httpsUrl(value.cta_url)
  const ctaLabel = text(value.cta_label)

  return {
    id,
    title,
    body,
    // Both halves or neither: a label with nowhere to go is a dead button, and
    // a URL with no label has nothing to say.
    cta: ctaUrl && ctaLabel ? { label: ctaLabel, url: ctaUrl } : null,
    publishedAt: text(value.published_at) || null,
    endsAt: text(value.ends_at) || null,
    clicked: value.clicked === true,
  }
}
