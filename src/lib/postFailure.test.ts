import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { postFailureMessage } from './postFailure'

const t = i18next.t.bind(i18next)

describe('postFailureMessage', () => {
  it('words the reproduced CON-200 failure and keeps what the service said', () => {
    expect(
      postFailureMessage(
        t,
        'zernio_retry_rejected: zernio: HTTP 404: Post not found',
      ),
    ).toEqual({
      summary: t('posts.failure.retryRejected'),
      detail: 'zernio: HTTP 404: Post not found',
      line: t('posts.failure.retryRejectedAlone'),
    })
  })

  it('drops the prose where the code already says it all', () => {
    expect(
      postFailureMessage(
        t,
        'account_selection_required: 2 instagram accounts connected; select one before publishing',
      ),
    ).toEqual({
      summary: t('posts.failure.chooseAccount'),
      detail: null,
      line: t('posts.failure.chooseAccount'),
    })
  })

  it('tells a partial publish from a refused one', () => {
    expect(postFailureMessage(t, 'zernio_terminal: partial').summary).toBe(
      t('posts.failure.partial'),
    )
    expect(postFailureMessage(t, 'zernio_terminal: failed').summary).toBe(
      t('posts.failure.networkRefused'),
    )
  })

  it('says one thing for both ways the integration can be missing', () => {
    const disabled = postFailureMessage(t, 'integration_disabled: x')
    const noProfile = postFailureMessage(t, 'no_profile: y')
    expect(disabled).toEqual(noProfile)
    expect(disabled.summary).toBe(t('posts.failure.notSetUp'))
  })

  it('shows a code this build predates whole, under a generic sentence', () => {
    expect(postFailureMessage(t, 'brand_new_code: something odd')).toEqual({
      summary: t('posts.failure.unknown'),
      detail: 'brand_new_code: something odd',
      line: t('posts.failure.unknownAlone'),
    })
  })

  it('never leaves a lead-in with nothing after it', () => {
    for (const reason of [
      'zernio_rejected: ',
      'zernio_rejected:   ',
      'zernio_rejected',
      'zernio_retry_rejected: \n',
    ]) {
      const failure = postFailureMessage(t, reason)
      expect(failure.detail).toBeNull()
      expect(failure.summary).toBe(failure.line)
      expect(failure.summary).not.toMatch(/:$/)
    }
    expect(postFailureMessage(t, 'zernio_rejected:  ').summary).toBe(
      t('posts.failure.rejectedAlone'),
    )
  })

  it('gives every code a one-line form that is a whole sentence', () => {
    for (const reason of [
      'zernio_rejected: bad media',
      'zernio_retry_rejected: zernio: HTTP 404: Post not found',
      'brand_new_code: something odd',
      'no_account_connected: none',
      'zernio_terminal: partial',
    ]) {
      expect(postFailureMessage(t, reason).line).not.toMatch(/:$/)
    }
  })
})
