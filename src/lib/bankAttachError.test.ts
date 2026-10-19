import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { ApiError, EntitlementError } from '@/services/api/errors'
import { bankAttachErrorMessage } from './bankAttachError'

const t = i18next.t.bind(i18next)

describe('bankAttachErrorMessage', () => {
  it('words a locked post by its status, whatever the body said', () => {
    expect(
      bankAttachErrorMessage(t, new ApiError(409, 'post is published')),
    ).toBe(t('posts.media.fromAssets.errors.locked'))
  })

  it('says an asset that has gone has gone', () => {
    expect(
      bankAttachErrorMessage(t, new ApiError(404, 'asset not found')),
    ).toBe(t('posts.media.fromAssets.errors.gone'))
  })

  it('says a post that has gone has gone, not the image', () => {
    expect(bankAttachErrorMessage(t, new ApiError(404, 'post not found'))).toBe(
      t('posts.media.fromAssets.errors.postGone'),
    )
  })

  it('words an image-service refusal as the same refusal on upload', () => {
    expect(
      bankAttachErrorMessage(
        t,
        new ApiError(422, 'image is corrupt', 'invalid_file'),
      ),
    ).toBe(t('uploads.errors.invalid'))
  })

  it('reads a bare 422 as an image with nothing stored', () => {
    expect(
      bankAttachErrorMessage(
        t,
        new ApiError(422, 'image asset has no stored file'),
      ),
    ).toBe(t('posts.media.fromAssets.errors.noFile'))
  })

  it('gives a plan refusal the reason every refused write gets', () => {
    const denial = new EntitlementError(402, 'Unable to add this image', {
      reason: 'limit',
      feature: 'media_storage_bytes',
      limit: null,
      current: null,
    })
    expect(bankAttachErrorMessage(t, denial)).toBe(t('tiers.deniedLimitFlat'))
  })

  it('falls back to the message of anything else', () => {
    expect(bankAttachErrorMessage(t, new Error('Network down'))).toBe(
      'Network down',
    )
  })
})
