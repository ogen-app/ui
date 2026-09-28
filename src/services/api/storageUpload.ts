/**
 * PUTs a file to a presigned storage URL — the middle step of every upload
 * whose bytes never pass through the API: a post's video (CON-148) and a
 * Content-Bank recording (CON-282).
 *
 * XHR rather than fetch, for upload progress. `withCredentials` stays off on
 * purpose — the URL carries its own signature, and sending cookies to the
 * storage origin both breaks the signature on some providers and needs a CORS
 * `Allow-Credentials` we should not require.
 *
 * `headers` are the ones the signature was minted over, and must be sent
 * exactly: a Content-Type that differs from the signed one is a 403 from the
 * bucket. The audio presign returns them; the video path sends the type it
 * declared.
 */
export function putToStorage(
  url: string,
  file: File,
  opts: {
    headers: Record<string, string>
    onProgress?: (percent: number) => void
    signal?: AbortSignal
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url, true)
    for (const [key, value] of Object.entries(opts.headers)) {
      xhr.setRequestHeader(key, value)
    }
    // No timeout: this is the one request that can legitimately run for many
    // minutes on a slow link, and the presigned URL's own expiry already
    // bounds it. `signal` remains the way to give up.

    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        // The body is storage-provider XML, not our error envelope; surfacing
        // it verbatim would be noise.
        reject(
          new StorageUploadError(
            `Storage rejected the upload of ${file.name} (${xhr.status})`,
          ),
        )
        return
      }
      resolve()
    }
    xhr.onerror = () =>
      reject(
        new StorageUploadError(
          `Network error uploading ${file.name}. If this persists, the storage bucket may not allow uploads from this origin.`,
        ),
      )
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'))

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort()
        return
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.send(file)
  })
}

/**
 * The storage PUT failed — refused by the bucket, or never answered. The
 * second is what a bucket without CORS for this origin looks like from here:
 * the browser hides the response and reports a network error.
 */
export class StorageUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageUploadError'
  }
}
