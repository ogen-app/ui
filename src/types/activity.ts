/**
 * The daily report, as the server sends it (CON-285).
 *
 * Wire shapes, snake_case and unmassaged, the same as `AppNotification`: these
 * are read straight off `GET /api/activity/report/:date` and
 * `GET /api/activity/reports`, and renaming fields on the way in only hides
 * which half of a mismatch is wrong.
 *
 * The report used to be computed here, from the campaign summaries the
 * Campaigns list fetches anyway — CON-225 §5 specified it that way, and the
 * reason was the day boundary: the server had no way to know the reader's local
 * midnight. CON-285 reversed that decision and answered the boundary by asking
 * for it, so every call carries an IANA `tz` and the arithmetic is the
 * server's. What the client gained by the trade is the two things the summaries
 * projection could not reach — *who* created a post and *why* one failed.
 */

/** A per-platform tally. `platform_id` is a catalogue sqid, not a network name. */
export type ActivityChannelCount = {
  platform_id: string
  count: number
}

/** A per-author tally. `user_id` is a membership id in the active workspace. */
export type ActivityAuthorCount = {
  user_id: string
  count: number
}

/**
 * One post that did not go out, with enough to link to it and say why.
 *
 * `status` is `failed` or `not_published` — the report counts both in one
 * bucket because the reader's question is the same for either, and keeps the
 * distinction per row for anyone who opens it.
 *
 * `failure_reason` is the server's own prose (`"zernio_terminal: rejected"`),
 * composed in Go and not a code we can translate — the same shape as an upload
 * refusal and the `title` on a notification. It is shown verbatim or not at
 * all.
 */
export type ActivityFailedPost = {
  post_id: string
  platform_id: string
  status: string
  failure_reason: string
}

/** One local day, in full. */
export type ActivityReport = {
  /** The day this is about, `YYYY-MM-DD`, in `tz`. */
  date: string
  /** The zone the day was cut by — echoed back, so the report can say it. */
  tz: string
  published: {
    total: number
    by_channel: ActivityChannelCount[]
  }
  failed: {
    total: number
    by_channel: ActivityChannelCount[]
    posts: ActivityFailedPost[]
  }
  created: {
    posts_total: number
    /** How many of them were given a date, rather than left an unplanned draft. */
    scheduled_total: number
    by_author: ActivityAuthorCount[]
  }
  campaigns_created: {
    total: number
    campaign_ids: string[]
  }
}

/**
 * One day's headline totals — a row in the feed, without fetching the day.
 *
 * Only days with something on them are listed; a quiet day is absent rather
 * than zeroed, which is what keeps the feed from carrying a row per silent
 * weekend. Opening one of those days directly still renders (the detail
 * endpoint answers a zeroed 200), so a link to a quiet day is not a dead end.
 */
export type ActivityReportSummary = {
  date: string
  published_total: number
  failed_total: number
  created_total: number
  campaigns_created_total: number
}
