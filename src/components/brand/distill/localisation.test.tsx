import { render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { useBrandDistillStore } from '@/stores/brandDistillStore'
import type { DistillRun } from '@/types/brandDistill'
import { ReadingScreen } from './ReadingScreen'
import { SavedCard } from './SavedCard'

/**
 * A brand read (CON-400) in Spanish — the only way to prove its screens read
 * the catalogue, since in English a literal and an entry are the same string.
 */

beforeAll(async () => {
  await loadLocaleResources('es')
  await i18next.changeLanguage('es')
})

afterAll(async () => {
  await i18next.changeLanguage('en')
})

afterEach(() => useBrandDistillStore.setState({ saved: null }))

const READING: DistillRun = {
  id: 'r1',
  status: 'collecting',
  parentRunId: null,
  childRunId: null,
  website: { url: 'https://acme-roasters.com', mapped: true, pagesFound: 84 },
  sources: [
    {
      assetId: 'a1',
      title: 'Acme',
      type: 'URL',
      role: 'website',
      status: 'ready',
      url: 'https://acme-roasters.com/',
      truncated: false,
    },
    {
      assetId: 'a2',
      title: 'Terms',
      type: 'URL',
      role: 'website',
      status: 'pending',
      url: 'https://acme-roasters.com/terms-of-sale',
      truncated: false,
    },
    {
      assetId: 'a3',
      title: 'Dial in',
      type: 'URL',
      role: 'website',
      status: 'skipped_quota',
      url: 'https://acme-roasters.com/journal/how-to-dial-in',
      truncated: false,
    },
  ],
  answers: [],
  proposal: null,
  failure: null,
  createdBy: null,
  createdAt: '2026-10-22T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
  finishedAt: null,
  committedAt: null,
}

describe('a brand read in Spanish', () => {
  it('draws the reading checklist and its pages from the catalogue', () => {
    render(<ReadingScreen run={READING} />)
    expect(screen.getByText('Buscando las páginas')).toBeInTheDocument()
    expect(screen.getByText('Leyendo las páginas')).toBeInTheDocument()
    expect(screen.getByText('84 encontradas, 3 elegidas')).toBeInTheDocument()
    expect(screen.getByText('inicio')).toBeInTheDocument()
    expect(screen.getByText('leyendo')).toBeInTheDocument()
    expect(
      screen.getByText('por encima de tu límite de páginas'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Finding the pages')).not.toBeInTheDocument()
    expect(screen.queryByText('over your page limit')).not.toBeInTheDocument()
  })

  it('words the saved receipt in Spanish', () => {
    useBrandDistillStore.setState({
      saved: {
        runId: 'r1',
        source: { route: 'website', label: 'acme-roasters.com' },
        result: {
          applied: {
            voices: [{ proposalId: 'v1', id: '1' }],
            audiences: [],
            guardrails: [],
            facts: [
              { proposalId: 'f1', id: '2' },
              { proposalId: 'f2', id: '3' },
            ],
          },
          skipped: [{ proposalId: 'f3', reason: 'duplicate' }],
        },
      },
    })
    render(<SavedCard />)
    expect(screen.getByText('Guardado en tus Fundamentos')).toBeInTheDocument()
    expect(
      screen.getByText(
        '1 voz y 2 datos, leído de acme-roasters.com. 1 dato ya estaba en tu registro, así que se dejó como estaba.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Saved to your Foundation'),
    ).not.toBeInTheDocument()
  })
})
