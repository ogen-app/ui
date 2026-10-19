/**
 * Presigned GET URLs expire 15 minutes after the response is built
 * (`PresignedURLTTL` in the Go handler). Anything that renders one — an
 * attachment's thumbnail, a post's `cover_url` — refetches comfortably inside
 * that window, so an image in a long session never starts 403-ing.
 */
export const PRESIGN_REFRESH_MS = 10 * 60 * 1000
