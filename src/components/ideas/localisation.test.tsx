import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import type { Idea } from '@/lib/ideas'
import { DeleteIdeasDialog } from './DeleteIdeasDialog'
import { IdeaRow } from './IdeaRow'
import { IdeaCapture } from './IdeaCapture'
import { IdeasSidebarItem } from './IdeasSidebarItem'

/** The rail's row reads the server's undecided count; here, a fixed answer. */
const undecided = vi.hoisted(() => ({ count: 0 }))

vi.mock('@/hooks/useIdeaList', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useIdeaList')>()),
  useUndecidedIdeaCount: () => undecided.count,
}))

/**
 * The ideas module in a language that is not English.
 *
 * The point of the conversion, asserted the only way it can honestly be: by
 * rendering in Spanish and reading what comes out. Every other test on this
 * module runs in English, where a literal left in a component and a catalogue
 * entry are the same string — this is the one that can tell them apart, which
 * is why it also asserts that the English words are *gone*.
 *
 * Spanish is gated off in `i18n/config.ts` and this does not care: the gate is
 * on the entry points that choose a locale, never on i18next itself.
 */

const NOW = new Date('2026-09-17T09:00:00Z')

function idea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: 'a',
    title: 'Un desmontaje de nuestra propia incorporación',
    note: '',
    campaignId: null,
    verdict: null,
    createdAt: '2026-09-01T09:00:00Z',
    createdBy: null,
    decidedAt: null,
    decidedBy: null,
    remindAt: null,
    ...overrides,
  }
}

function renderRow(
  subject: Idea,
  props: Partial<Parameters<typeof IdeaRow>[0]> = {},
) {
  return render(
    <IdeaRow
      idea={subject}
      now={NOW}
      expanded={false}
      onToggle={() => {}}
      onDecide={() => {}}
      onUndecide={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      {...props}
    />,
    { wrapper: QueryWrapper },
  )
}

beforeAll(async () => {
  await loadLocaleResources('es')
  await i18next.changeLanguage('es')
})

afterAll(async () => {
  await i18next.changeLanguage('en')
})

describe('an undecided idea in Spanish', () => {
  it('names its three answers from the catalogue', () => {
    renderRow(idea())

    expect(screen.getByLabelText('En marcha')).toBeInTheDocument()
    expect(screen.getByLabelText('En el cajón')).toBeInTheDocument()
    expect(screen.getByLabelText('Apartar')).toBeInTheDocument()

    // The words that used to be literals in the component. Their absence is
    // half the assertion: a hard-coded "In the drawer" would satisfy every positive
    // check above while proving nothing at all.
    expect(screen.queryByLabelText('In the drawer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Making')).not.toBeInTheDocument()
  })

  it('offers the horizons rather than picking one, and dates the answer from them', async () => {
    const onDecide = vi.fn()
    renderRow(idea(), { onDecide })

    await userEvent.click(screen.getByLabelText('En el cajón'))
    // "In the drawer" is not an answer until it says how long — so the menu is the
    // control, and there is no default a click could fall back on.
    await userEvent.click(screen.getByText('Recuérdamelo en un mes'))

    expect(onDecide).toHaveBeenCalledWith('later', '2026-10-17T09:00:00.000Z')
    expect(screen.queryByText('Ask me in a month')).not.toBeInTheDocument()
  })
})

describe("a decided idea's record in Spanish", () => {
  it('names its writer and says when a postponement comes back', () => {
    renderRow(
      idea({
        verdict: 'later',
        authorName: 'Alex Lane',
        decidedAt: '2026-09-10T09:00:00Z',
        remindAt: '2026-10-17T09:00:00Z',
      }),
      { expanded: true },
    )

    expect(screen.getByText(/Escrita por Alex Lane/)).toBeInTheDocument()
    expect(screen.getByText(/Vuelve a la mesa el/)).toBeInTheDocument()
    expect(screen.queryByText(/Comes back on/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Written by/)).not.toBeInTheDocument()

    // The way back out of a pile, named rather than drawn: the undo is the
    // reason saying no is cheap.
    expect(
      screen.getByRole('button', {
        name: 'Devolverla a la mesa',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'ELIMINAR IDEA' }),
    ).toBeInTheDocument()
  })
})

describe('an analysed idea in Spanish', () => {
  it('names its source, and says when the document is gone', async () => {
    const analysed = idea({
      origin: 'asset_analysis',
      fitScore: 78,
      sources: ['p. 5'],
      angle: 'El gancho',
      sourceAsset: {
        id: 'asset1',
        title: 'Manual de apicultura',
        kind: 'pdf',
        pageCount: 7,
        durationMs: null,
        domain: null,
        reading: null,
      },
    })
    await renderWithProviders(
      <ul>
        <IdeaRow
          idea={analysed}
          now={NOW}
          expanded
          onToggle={() => {}}
          onDecide={() => {}}
          onUndecide={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </ul>,
      { path: '/ideas' },
    )

    expect(screen.getByText('Fuente')).toBeInTheDocument()
    expect(
      screen.getByText(/7 páginas · leída para el espacio de trabajo/),
    ).toBeInTheDocument()
    expect(screen.getByText('Abrir la fuente')).toBeInTheDocument()
    // The chip opens the document at the page it cites.
    expect(screen.getByRole('link', { name: 'p. 5' })).toHaveAttribute(
      'href',
      expect.stringContaining('at=p.+5'),
    )
    expect(screen.queryByText('Source')).not.toBeInTheDocument()
    expect(screen.queryByText('Open source')).not.toBeInTheDocument()
  })

  it('says so when its document has been deleted', () => {
    renderRow(idea({ origin: 'asset_analysis', sourceAsset: null }))
    expect(screen.getByText('Documento eliminado')).toBeInTheDocument()
    expect(screen.queryByText('Document deleted')).not.toBeInTheDocument()
  })
})

describe('deleting an idea in Spanish', () => {
  it('names the one idea and keeps the capitals', () => {
    render(
      <DeleteIdeasDialog
        count={1}
        title="Cera"
        isOpen
        onClose={() => {}}
        onConfirm={() => {}}
        deleting={false}
      />,
    )
    expect(screen.getByText('¿Eliminar «Cera»?')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'CONSERVAR IDEA' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Delete/)).not.toBeInTheDocument()
  })
})

describe('capture in Spanish', () => {
  it('prompts, hints and files without leaving the field', async () => {
    const onCapture = vi.fn()
    render(<IdeaCapture onCapture={onCapture} />, { wrapper: QueryWrapper })

    const field = screen.getByRole('textbox', { name: 'Anota una idea' })
    // One of the prompts, picked per visit — always a Spanish one.
    const prompts = Object.values(
      i18next.getResource('es', 'translation', 'ideas.capture.prompt'),
    )
    expect(prompts).toContain(field.getAttribute('placeholder'))
    expect(screen.getByText(/para guardarla/)).toBeInTheDocument()
    expect(screen.queryByText(/to keep it/)).toBeNull()

    await userEvent.type(field, '  Una serie de desmontajes  {Enter}')
    expect(onCapture).toHaveBeenCalledWith(
      'Una serie de desmontajes',
      '',
      expect.anything(),
    )
    // Cleared and still focused: ideas arrive in bursts and the second one is
    // usually already half-written when the first lands.
    expect(field).toHaveValue('')
    expect(field).toHaveFocus()
  })

  it('does not keep anything on the Return that confirms a composition', () => {
    const onCapture = vi.fn()
    render(<IdeaCapture onCapture={onCapture} />, { wrapper: QueryWrapper })
    const field = screen.getByRole('textbox', { name: 'Anota una idea' })
    fireEvent.change(field, { target: { value: '東京のホテル' } })
    // Safari's: the composition has ended, and the key reports 229.
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 })
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('keeps a longer thought as the idea and its note', async () => {
    const onCapture = vi.fn()
    render(<IdeaCapture onCapture={onCapture} />, { wrapper: QueryWrapper })
    const field = screen.getByRole('textbox', { name: 'Anota una idea' })

    await userEvent.type(field, 'Desayunos de hotel{Shift>}{Enter}{/Shift}')
    expect(onCapture).not.toHaveBeenCalled()
    expect(screen.getByText(/para otra línea/)).toBeInTheDocument()

    await userEvent.type(field, 'Cada viernes de primavera{Enter}')
    expect(onCapture).toHaveBeenCalledWith(
      'Desayunos de hotel',
      'Cada viernes de primavera',
      expect.anything(),
    )
  })
})

describe("the rail's Ideas row in Spanish", () => {
  it('counts what is still a question, and says so', async () => {
    undecided.count = 2

    await renderWithProviders(<IdeasSidebarItem isActive={false} />, {
      path: '/ideas',
    })

    // The undecided pile, not the backlog's size.
    const chip = screen.getByLabelText('2 ideas sobre la mesa')
    expect(chip).toHaveTextContent('2')
    expect(screen.queryByLabelText('2 undecided ideas')).not.toBeInTheDocument()
  })
})
