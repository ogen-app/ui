import { describe, expect, it } from 'vitest'
import { frameAspect } from './frames.ts'

describe('frameAspect', () => {
  it('gives the vertical formats a 9:16 frame', () => {
    expect(frameAspect('reel', 1)).toBeCloseTo(9 / 16)
    expect(frameAspect('short', 16 / 9)).toBeCloseTo(9 / 16)
    expect(frameAspect('story', 1)).toBeCloseTo(9 / 16)
  })

  it('leaves every other post type on the feed default', () => {
    expect(frameAspect('image-post', 1)).toBe(1)
    expect(frameAspect('video', 1.91)).toBe(1.91)
    // Before a type is picked there is no post type at all.
    expect(frameAspect('', 1.91)).toBe(1.91)
  })

  // Facebook draws a lone image at its own shape, and a vertical override has
  // to be able to say "no shape" rather than defaulting to something square.
  it('passes an absent default through untouched', () => {
    expect(frameAspect('image-post')).toBeUndefined()
    expect(frameAspect('reel')).toBeCloseTo(9 / 16)
  })
})
