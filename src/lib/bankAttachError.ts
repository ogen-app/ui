import type { TFunction } from 'i18next'
import { denialReason } from '@/lib/queryClient'
import { uploadErrorMessage } from '@/lib/uploadError'
import { ApiError } from '@/services/api/errors'

/**
 * Why a content-bank image could not be attached to a post (CON-290), in the
 * reader's language.
 *
 * The endpoint refuses in four vocabularies, and each already has its words
 * somewhere else, so this only picks which: the plan's (402, worded as every
 * other refused write is), the post's lock (409, CON-251), the image service's
 * upload codes (one table, `uploadErrorMessage`, so a file refused here and the
 * same file refused on upload say the same thing), and three of its own — an
 * asset that has gone, a post that has gone, and an asset with no stored image
 * to copy.
 */
/**
 * The endpoint answers 404 for a missing post as well as a missing asset, and
 * says which only in prose — `"post not found"` against `"asset not found"`,
 * no `code` (`post_bank_attachments.go`). So this one case reads the sentence,
 * and anything else that 404s keeps the asset's wording, the likelier of the
 * two: an asset is deleted from another screen, a post from this one. Switch
 * to a code the day the handler sends one.
 */
const POST_NOT_FOUND = /^post not found$/i

export function bankAttachErrorMessage(t: TFunction, error: unknown): string {
  const plan = denialReason(error)
  if (plan) return plan
  if (error instanceof ApiError) {
    if (error.status === 409) return t('posts.media.fromAssets.errors.locked')
    if (error.status === 404) {
      return t(
        POST_NOT_FOUND.test(error.message)
          ? 'posts.media.fromAssets.errors.postGone'
          : 'posts.media.fromAssets.errors.gone',
      )
    }
    if (error.code) {
      return uploadErrorMessage(t, { code: error.code, message: error.message })
    }
    // Not an image, or an image whose file never landed. The picker lists
    // images only, so in practice this is the second.
    if (error.status === 422) return t('posts.media.fromAssets.errors.noFile')
  }
  return error instanceof Error && error.message
    ? error.message
    : t('common.somethingWentWrong')
}
