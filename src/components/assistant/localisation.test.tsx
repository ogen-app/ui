import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { describeTool, stepDetail, stepLabel } from '@/lib/assistantTools'
import type { AssistantStep } from '@/types/assistant'
import { AssistantComposer } from './AssistantComposer'
import { AssistantReply } from './AssistantReply'
import { ResultCard } from './ResultCard'
import { ThreadEmptyState } from './ThreadEmptyState'

/**
 * The assistant in a language that is not English — the only way to tell a
 * catalogued string from a literal left in a component, since in English the
 * two render the same.
 */

beforeAll(async () => {
  await loadLocaleResources('es')
  await i18next.changeLanguage('es')
})

afterAll(async () => {
  await i18next.changeLanguage('en')
})

function step(changes: Partial<AssistantStep>): AssistantStep {
  return {
    id: 's',
    kind: 'tool',
    startedAt: 0,
    endedAt: null,
    ...changes,
  }
}

describe('assistant in Spanish', () => {
  it('words the empty thread and its starters', () => {
    render(<ThreadEmptyState kind="campaign" onPick={() => {}} />, {
      wrapper: QueryWrapper,
    })
    expect(
      screen.getByText('Planifica la campaña y llénala de publicaciones.'),
    ).toBeTruthy()
    expect(screen.getByText('Generar un plan de contenido')).toBeTruthy()
    expect(screen.queryByText('Generate a content plan')).toBeNull()
    expect(
      screen.queryByText('Plan the campaign and fill it with posts.'),
    ).toBeNull()
  })

  it('words a result card', () => {
    render(
      <ResultCard
        details={{
          postsReview: {
            checked: 3,
            total: 4,
            capped: false,
            findings: [{ severity: 'high', issue: 'Off-brief.' }],
          },
          redistribute: { postsUpdated: 2, phaseCount: 1 },
        }}
      />,
    )
    expect(screen.getByText('Comprobadas 3 de 4 publicaciones')).toBeTruthy()
    expect(screen.getByText('1 desviación')).toBeTruthy()
    expect(screen.getByText('alta')).toBeTruthy()
    expect(
      screen.getByText('Nueva fecha para 2 publicaciones en 1 fase.'),
    ).toBeTruthy()
    expect(screen.queryByText(/Checked 3 of 4/)).toBeNull()
    expect(screen.queryByText(/Re-dated/)).toBeNull()
  })

  it('writes counts as the language writes numbers', () => {
    render(
      <ResultCard
        details={{
          postsReview: {
            checked: 12000,
            total: 15000,
            capped: false,
            findings: [],
          },
        }}
      />,
    )
    expect(
      screen.getByText('Comprobadas 12.000 de 15.000 publicaciones'),
    ).toBeTruthy()
  })

  it('words the footer and the timeline', () => {
    render(
      <AssistantReply
        threadId="campaign:c1"
        turn={{
          id: 't',
          role: 'assistant',
          content: 'Listo.',
          action: 'edited',
          saveVersion: true,
          steps: [step({ endedAt: 15000, tool: 'listAssets' })],
          startedAt: 0,
          endedAt: 15000,
        }}
      />,
    )
    expect(screen.getByText(/Publicación actualizada/)).toBeTruthy()
    expect(screen.getByText('Versión guardada')).toBeTruthy()
    expect(screen.getByText(/Trabajó durante/)).toBeTruthy()
    expect(screen.queryByText('Post updated')).toBeNull()
    expect(screen.queryByText(/Worked for/)).toBeNull()
  })

  it('words the composer controls', () => {
    render(<AssistantComposer onSend={() => true} />)
    expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeTruthy()
    expect(screen.getByLabelText('Enviar mensaje')).toBeTruthy()
  })

  it('words steps at render time, from the tool and its input', () => {
    const t = i18next.t
    expect(stepLabel(t, step({ kind: 'plan' }))).toBe('Analizando la petición')
    expect(
      describeTool(t, 'generatePosts', { platformId: 'Threads' }, 'done'),
    ).toBe('Añadidas publicaciones para Threads')
    expect(
      describeTool(
        t,
        'getAssetChunks',
        { assetId: 'a1', chunkIds: ['1', '2'] },
        'running',
      ),
    ).toBe('Leyendo 2 fragmentos de recurso a1')
    expect(stepDetail(t, step({ generated: 3 }))).toBe('3 generadas')
    // A known sub-flow stage is translated; one this build predates is
    // humanised rather than hidden.
    expect(stepDetail(t, step({ progress: 'resolveTargets' }))).toBe(
      'destinos resueltos',
    )
    expect(stepDetail(t, step({ progress: 'rankByReach' }))).toBe(
      'rank by reach',
    )
    // A tool this build has no words for yet is spelled out from its name.
    expect(describeTool(t, 'brandNewTool', undefined, 'done')).toBe(
      'Brand new tool',
    )
  })
})
