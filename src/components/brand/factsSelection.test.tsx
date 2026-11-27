import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useViewContextStore } from '@/stores/viewContextStore'
import { FactsLedger } from './FactsSection'
import type { BrandFact } from './facts'

// jsdom lays nothing out, so the table's virtualiser would draw no rows: draw
// them all, as a tall enough viewport would.
vi.mock('@tanstack/react-virtual', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-virtual')>()),
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 48,
        size: 48,
        end: (index + 1) * 48,
        lane: 0,
      })),
    getTotalSize: () => count * 48,
    measureElement: () => {},
  }),
}))

function fact(id: string, statement: string): BrandFact {
  return {
    id,
    statement,
    subject: 'us',
    kind: 'measured',
    source: '',
    addedAt: '2026-03-02',
    checkedAt: '',
    expiresAt: '',
  }
}

const FACTS = [
  fact('f1', 'The pool is heated to 29°C'),
  fact('f2', 'Breakfast is served until eleven'),
]

async function show(onRemove = vi.fn(async () => {})) {
  await renderWithProviders(
    <SidebarProvider>
      <FactsLedger facts={FACTS} onSave={async () => {}} onRemove={onRemove} />
    </SidebarProvider>,
  )
  return onRemove
}

const tick = (statement: string) =>
  fireEvent.click(
    screen.getByRole('checkbox', { name: `Select “${statement}”` }),
  )

describe('the facts ledger’s selection (CON-486)', () => {
  beforeEach(() => {
    useViewContextStore.setState({ request: null, page: null })
  })

  it('puts the selection in the search’s place, and gives it back on Clear', async () => {
    // The line is the selection while anything is ticked, as on the other
    // lists — so no search can hide a tick that would still go to the
    // assistant.
    await show()
    tick('The pool is heated to 29°C')
    expect(useViewContextStore.getState().page?.selection).toMatchObject({
      kind: 'fact',
      ids: ['f1'],
    })
    expect(screen.getByText('1 fact selected')).toBeTruthy()
    expect(screen.queryByLabelText('Search the facts ledger')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Search the facts ledger')).toBeTruthy()
    expect(useViewContextStore.getState().page?.selection).toBeUndefined()
  })

  it('asks before the trash removes a fact, naming it', async () => {
    const onRemove = await show()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove “The pool is heated to 29°C”',
      }),
    )
    expect(onRemove).not.toHaveBeenCalled()
    expect(
      screen.getByText('Remove “The pool is heated to 29°C”?'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove fact' }))
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('f1'))
  })

  it('removes the ticked facts from the bar, asking first with the count', async () => {
    const onRemove = await show()
    tick('The pool is heated to 29°C')
    tick('Breakfast is served until eleven')
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.getByText('Remove 2 facts?')).toBeTruthy()
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove 2 facts' }))
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(2))
    expect(onRemove).toHaveBeenCalledWith('f1')
    expect(onRemove).toHaveBeenCalledWith('f2')
  })
})
