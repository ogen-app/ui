import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { i18next, loadLocaleResources } from '@/i18n'
import type { Idea } from '@/lib/ideas'
import { IdeaRow } from './IdeaRow'
import { IdeaCapture } from './IdeaCapture'

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

    expect(screen.getByLabelText('Sí')).toBeInTheDocument()
    expect(screen.getByLabelText('Ahora no')).toBeInTheDocument()
    expect(screen.getByLabelText('No')).toBeInTheDocument()

    // The words that used to be literals in the component. Their absence is
    // half the assertion: a hard-coded "Not now" would satisfy every positive
    // check above while proving nothing at all.
    expect(screen.queryByLabelText('Not now')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Yes')).not.toBeInTheDocument()
  })

  it('offers the horizons rather than picking one, and dates the answer from them', async () => {
    const onDecide = vi.fn()
    renderRow(idea(), { onDecide })

    await userEvent.click(screen.getByLabelText('Ahora no'))
    // "Not now" is not an answer until it says how long — so the menu is the
    // control, and there is no default a click could fall back on.
    await userEvent.click(screen.getByText('Recuérdamelo en un mes'))

    expect(onDecide).toHaveBeenCalledWith('later', '2026-10-17T09:00:00.000Z')
    expect(screen.queryByText('Ask me in a month')).not.toBeInTheDocument()
  })
})

describe("a decided idea's record in Spanish", () => {
  it('joins its history and says when a postponement comes back', () => {
    renderRow(
      idea({
        verdict: 'later',
        decidedAt: '2026-09-10T09:00:00Z',
        remindAt: '2026-10-17T09:00:00Z',
      }),
      { expanded: true },
    )

    expect(screen.getByText(/Anotada el/)).toBeInTheDocument()
    expect(screen.getByText(/Vuelve el/)).toBeInTheDocument()
    expect(screen.queryByText(/Comes back on/)).not.toBeInTheDocument()

    // The way back out of a pile, named rather than drawn: the undo is the
    // reason saying no is cheap.
    expect(
      screen.getByLabelText('Devolver a las pendientes de decidir'),
    ).toBeInTheDocument()
  })
})

describe('capture in Spanish', () => {
  it('prompts and files without leaving the field', async () => {
    const onCapture = vi.fn()
    render(<IdeaCapture onCapture={onCapture} />, { wrapper: QueryWrapper })

    const field = screen.getByPlaceholderText('¿Qué podríamos crear?')
    expect(screen.queryByPlaceholderText('What could we make?')).toBeNull()

    await userEvent.type(field, '  Una serie de desmontajes  {Enter}')
    expect(onCapture).toHaveBeenCalledWith('Una serie de desmontajes')
    // Cleared and still focused: ideas arrive in bursts and the second one is
    // usually already half-written when the first lands.
    expect(field).toHaveValue('')
    expect(field).toHaveFocus()
  })
})
