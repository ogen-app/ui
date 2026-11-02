import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18next, loadLocaleResources } from '@/i18n'
import type { PostEvaluation, QualityDimension } from '@/types/quality'
import { PostQualityPanelView } from './PostQualityPanelView'
import { QualityInlineSummary } from './QualityInlineSummary'

/**
 * The quality panel in a language that is not English (CON-440).
 *
 * In English a literal left in a component and a catalogue entry are the same
 * string, so this is the only test that can tell a converted panel from an
 * unconverted one: render in Spanish and check both that the Spanish copy is
 * there and that the English words that used to be literals are not.
 */

function dimension(score: number, weight: number): QualityDimension {
  return {
    score,
    verdict: 'Valoración.',
    suggestions: [
      {
        dimension: 'delivery',
        severity: 'high',
        span: '[ai playground]',
        advice: 'Borra la etiqueta interna del título.',
      },
    ],
    weight,
    contribution: score * weight * 10,
  }
}

const EVALUATION: PostEvaluation = {
  id: 'e1',
  post_id: 'p1',
  platform_id: 'li',
  platform_post_type: 'text-post',
  caption_scoped: true,
  overall_pct: 63,
  result: {
    correctness: dimension(6, 0.2),
    clarity: dimension(7, 0.2),
    engagement: dimension(7, 0.35),
    delivery: dimension(5, 0.25),
  },
  model_id: 'm',
  input_hash: 'h',
  created_at: '2026-11-02T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
}

beforeAll(async () => {
  await loadLocaleResources('es')
  await i18next.changeLanguage('es')
})

afterAll(async () => {
  await i18next.changeLanguage('en')
})

describe('quality panel in Spanish', () => {
  it('renders the rail without its English literals', async () => {
    render(
      <PostQualityPanelView
        assessment={EVALUATION}
        platformName="LinkedIn"
        loading={false}
        unavailable={false}
        loadError={null}
        onReload={vi.fn()}
        onAssess={vi.fn()}
        assessing={false}
        steps={[]}
        cached={false}
        assessError={null}
      />,
    )

    expect(screen.getByText('Aceptable')).toBeInTheDocument()
    expect(screen.getByText('Corrige primero')).toBeInTheDocument()
    expect(screen.getByText('Por qué estas puntuaciones')).toBeInTheDocument()
    expect(screen.getByText('Encaje con LinkedIn')).toBeInTheDocument()
    expect(
      screen.getByText('Interacción es lo que más pesa en este formato.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Precisión 6, Claridad 7, Interacción 7 y Encaje con el canal 5. Encaje con el canal es la más baja.',
      }),
    ).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: 'Cómo leer el radar' }),
    )
    expect(screen.getByText('Anillos en 5 y 8')).toBeInTheDocument()

    for (const english of [
      'Fix first',
      'Why these scores',
      'Reading the radar',
      'Accuracy',
      'Channel fit',
      'weighs most',
      'The writing',
    ]) {
      expect(screen.queryByText(new RegExp(english))).not.toBeInTheDocument()
    }
  })

  it('renders the checks-bar digest without its English literals', () => {
    render(
      <QualityInlineSummary assessment={EVALUATION} onOpenPanel={vi.fn()} />,
    )
    expect(
      screen.getByRole('button', { name: 'Ver las 4 sugerencias' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Corrige primero')).toBeInTheDocument()
    for (const english of ['Fix first', 'See all', 'Accuracy']) {
      expect(screen.queryByText(new RegExp(english))).not.toBeInTheDocument()
    }
  })
})
