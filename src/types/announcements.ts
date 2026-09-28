/**
 * An operator-authored banner (CON-230), as `GET /api/announcements` delivers
 * it: already filtered to this user in this workspace — published, in its
 * window, targeted at the workspace's tier or groups, and not dismissed.
 *
 * The optional parts are `null` rather than the server's `''`/omitted, so a
 * renderer can't mistake an empty string for a value.
 *
 * The wire's `image_url`/`image_alt` are deliberately not read: the app shows
 * announcements as a one-line ribbon, which has no room for a picture.
 */
export type Announcement = {
  id: string
  title: string
  body: string
  /** Only ever an absolute `https:` URL — anything else is dropped on parse. */
  cta: { label: string; url: string } | null
  publishedAt: string | null
  endsAt: string | null
  /** This user has clicked the CTA before. Display only. */
  clicked: boolean
}
