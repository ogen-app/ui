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
 */
export function postFailureMessage(
  t: TFunction,
  reason: string,
): { summary: string; detail: string | null } {
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
      return { summary: t('posts.failure.rejected'), detail: message || null }
    case 'zernio_retry_rejected':
      return {
        summary: t('posts.failure.retryRejected'),
        detail: message || null,
      }
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
  return { summary: t('posts.failure.unknown'), detail: reason.trim() || null }
}

function only(summary: string) {
  return { summary, detail: null }
}
