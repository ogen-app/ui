import { createContext, useContext } from 'react'

/**
 * The one player a recording's page has (CON-366).
 *
 * The two-column asset page draws the player in the left column's stage, and
 * three things on the right want to drive it: the transcript's lines, a
 * commitment's time chip and an idea's source chip. One `<audio>` element for
 * all of them, rather than one each, so "play from 12:03" moves the player the
 * reader can see instead of starting a second, invisible one.
 */
export type AudioSeek = {
  /** Plays from `seconds` in. */
  seek: (seconds: number) => void
  /** Where the player is, in ms, or null before it has played. */
  nowMs: number | null
}

export const AudioSeekContext = createContext<AudioSeek | null>(null)

/** The page's player, or null on a page that has none. */
export function useAudioSeek(): AudioSeek | null {
  return useContext(AudioSeekContext)
}
