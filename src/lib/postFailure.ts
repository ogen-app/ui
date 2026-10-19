import type { TFunction } from 'i18next'

/**
 * Why a post failed to publish, in the reader's language (CON-200).
 *
 * The server stores one string, `<code>: <message>` — the submit worker's
 * `terminal(…, "zernio_rejected", err.Error())` and the status poller's
 * `"zernio_terminal: " + status`. The code is stable and decides the sentence;
 * the message is Go prose and is shown beneath it only where it says something
 * the sentence cannot — what the publishing service itself answered. Where the
 * code already says it all (an account problem), the prose would only restate
 * it in English, so it is dropped.
 *
 * A code this build predates falls back to a generic sentence with the whole
 * string as its detail: the worst case is untranslated prose, never a wrong
 * explanation — the rule `lib/uploadError` follows for the same reason.
 *
 * Where the detail carries the explanation, `summary` is a lead-in ("It
 * said:") that only reads as finished with the detail under it. So a
 * lead-in is used only when there is a detail to follow it — an empty message
 * gets the sentence on its own — and `line` is always that standalone sentence,
 * for a place with room for one line and no detail (the daily report's rows).
 */
export type PostFailure = {
  /** Shown above `detail`; a lead-in ending in a colon whenever one follows. */
  summary: string
  /** What the service answered, verbatim, or `null` when nothing is worth showing. */
  detail: string | null
  /** One complete sentence that stands without `detail`. */
  line: string
}

export function postFailureMessage(t: TFunction, reason: string): PostFailure {
  const split = reason.indexOf(': ')
  const code = split > 0 ? reason.slice(0, split) : reason
  const message = split > 0 ? reason.slice(split + 2).trim() : ''

  switch (code) {
    case 'no_account_connected':
      return only(t('posts.failure.noAccount'))
    case 'account_selection_required':
      return only(t('posts.failure.chooseAccount'))
    case 'account_unavailable':
      return only(t('posts.failure.accountGone'))
    case 'account_platform_mismatch':
      return only(t('posts.failure.accountMismatch'))
    case 'zernio_duplicate_content':
      return only(t('posts.failure.duplicate'))
    case 'zernio_rejected':
      return saying(
        t('posts.failure.rejected'),
        t('posts.failure.rejectedAlone'),
        message,
      )
    case 'zernio_retry_rejected':
      return saying(
        t('posts.failure.retryRejected'),
        t('posts.failure.retryRejectedAlone'),
        message,
      )
    case 'zernio_terminal':
      return only(
        message === 'partial'
          ? t('posts.failure.partial')
          : t('posts.failure.networkRefused'),
      )
    case 'missing_platform':
      return only(t('posts.failure.noPlatform'))
    case 'unsupported_platform':
      return only(t('posts.failure.unsupported'))
    case 'integration_disabled':
    case 'no_profile':
      return only(t('posts.failure.notSetUp'))
  }
  return saying(
    t('posts.failure.unknown'),
    t('posts.failure.unknownAlone'),
    reason.trim(),
  )
}

function only(summary: string): PostFailure {
  return { summary, detail: null, line: summary }
}

/** A lead-in when there is something for it to lead into, else the sentence alone. */
function saying(leadIn: string, alone: string, detail: string): PostFailure {
  return detail
    ? { summary: leadIn, detail, line: alone }
    : { summary: alone, detail: null, line: alone }
}
