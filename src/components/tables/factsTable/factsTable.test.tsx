import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BrandFact } from '@/components/brand/facts'
import { FactsTable } from './index'

const FACT: BrandFact = {
  id: 'f1',
  statement: 'The pool is heated to 29°C',
  subject: 'us',
  kind: 'measured',
  source: '',
  addedAt: '2026-03-02',
  checkedAt: '',
  expiresAt: '',
}

describe('FactsTable ticks (CON-472)', () => {
  it('draws the tick column when given a selection — the table only draws columns it names', () => {
    render(
      <FactsTable
        facts={[FACT]}
        today="2026-04-21"
        onEdit={() => {}}
        onRemove={() => {}}
        selection={{ ticked: new Set(), toggle: vi.fn(), toggleAll: vi.fn() }}
      />,
    )
    expect(
      screen.getByRole('checkbox', { name: 'Select every fact shown' }),
    ).toBeTruthy()
  })

  it('has no tick column without one', () => {
    render(
      <FactsTable
        facts={[FACT]}
        today="2026-04-21"
        onEdit={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('leaves room after the last row for the selection bar while facts are ticked (CON-486)', () => {
    const body = (ticked: string[]) => {
      const { container, unmount } = render(
        <FactsTable
          facts={[FACT]}
          today="2026-04-21"
          onEdit={() => {}}
          onRemove={() => {}}
          selection={{
            ticked: new Set(ticked),
            toggle: vi.fn(),
            toggleAll: vi.fn(),
          }}
        />,
      )
      // The rows' box: its height is the rows' and whatever follows them.
      const box = [...container.querySelectorAll<HTMLElement>('div.relative')]
        .map((el) => el.style.height)
        .find((h) => h.endsWith('px'))
      unmount()
      return box
    }
    const without = parseFloat(body([]) ?? '0')
    const withBar = parseFloat(body(['f1']) ?? '0')
    expect(withBar - without).toBe(64)
  })
})
