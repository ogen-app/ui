import { useFeatureFlag } from '@/config/featureFlags'
import type { UploadOptions } from '@/lib/assetStatus'

/**
 * What the upload surface currently accepts.
 *
 * One hook rather than three components each reaching for the flag, because
 * the picker's `accept`, the limits line under it and the per-file validation
 * have to agree: a file the drop zone offered and the list then rejected reads
 * as a bug in the app rather than a rule about the file.
 *
 * `uploadStore` deliberately does *not* use this — it is outside React and
 * reads `isFeatureEnabled` directly, which is the same answer.
 */
export function useUploadOptions(): UploadOptions {
  return { images: useFeatureFlag('content-bank-images') }
}
