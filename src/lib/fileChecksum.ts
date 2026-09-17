/**
 * The SHA-256 of a file's bytes, lower-case hex.
 *
 * The same digest the server dedupes image uploads by (`imageprobe.Probe`
 * computes it over the bytes it stores), which is the only reason this exists:
 * it lets the upload modal say "you already have this" *before* the upload
 * rather than leaving the reader to work it out from nothing happening.
 *
 * Images only, and that is not a shortcut — the server dedupes nothing else.
 * A PDF's `asset_files` row carries no checksum, so the same PDF uploaded twice
 * really does produce two documents, and warning about it would be wrong.
 *
 * The whole file goes through memory, which is why the caller hashes after
 * `validateUploadFile` has passed it: the image cap is 10 MB, so the worst case
 * is a 10 MB buffer and a few tens of milliseconds. Never hash a file that
 * failed validation — the cap is what makes this cheap.
 *
 * `crypto.subtle` needs a secure context. localhost and https both are, so in
 * practice it is always there; the caller still treats a rejection as "no
 * answer" rather than an error worth showing, because a missing warning is a
 * missing convenience and not a failure.
 */
export async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
