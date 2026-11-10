import { describe, expect, it } from 'vitest'
import type { PlatformView } from '@/lib/platformDictionary'
import { focusedAccount } from './platformFocus'

function view(
  zernioId: string,
  accounts: { id: string; is_active: boolean }[],
) {
  return {
    info: { zernioId },
    connectedPublishers: [{ accounts }],
  } as unknown as PlatformView
}

const instagram = view('instagram', [
  { id: 'ig1', is_active: true },
  { id: 'ig2', is_active: false },
])
const linkedin = view('linkedin', [{ id: 'li1', is_active: true }])

describe('focusedAccount', () => {
  it('finds the account named', () => {
    expect(focusedAccount([instagram, linkedin], { accountId: 'li1' })).toEqual(
      { view: linkedin, accountId: 'li1' },
    )
  })

  it('falls back to the platform’s broken account', () => {
    expect(
      focusedAccount([instagram, linkedin], {
        accountId: 'unknown',
        platform: 'instagram',
      }),
    ).toEqual({ view: instagram, accountId: 'ig2' })
  })

  it('singles out nothing it can’t find', () => {
    expect(focusedAccount([linkedin], { platform: 'tiktok' })).toBeUndefined()
    expect(focusedAccount([linkedin], undefined)).toBeUndefined()
  })
})
