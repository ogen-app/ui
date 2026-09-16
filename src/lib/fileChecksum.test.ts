import { describe, expect, it } from 'vitest'
import { sha256Hex } from './fileChecksum'

describe('sha256Hex', () => {
  /*
   * A published vector, not a round trip through this same function: the whole
   * value of the digest is that it is the one the Go side computes over the
   * same bytes, so "it agrees with itself" proves nothing.
   */
  it('is SHA-256, lower-case hex', async () => {
    await expect(sha256Hex(new File(['abc'], 'a.png'))).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('hashes the bytes and not the name', async () => {
    const [one, two] = await Promise.all([
      sha256Hex(new File(['same'], 'first.png')),
      sha256Hex(new File(['same'], 'second.png')),
    ])
    expect(one).toBe(two)
  })
})
