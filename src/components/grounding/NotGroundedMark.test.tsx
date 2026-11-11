import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { NotGroundedMark } from './NotGroundedMark'

describe('NotGroundedMark (CON-469)', () => {
  afterEach(async () => {
    await i18next.changeLanguage('en')
  })

  it('marks only work written from general knowledge', () => {
    const { container, rerender } = render(<NotGroundedMark mode="grounded" />)
    expect(container).toBeEmptyDOMElement()
    // A post nobody generated is unknown, never "not grounded".
    rerender(<NotGroundedMark mode={null} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<NotGroundedMark mode={undefined} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<NotGroundedMark mode="exploratory" />)
    expect(screen.getByText('Not grounded')).toBeVisible()
  })

  it('keeps the words for assistive tech and the pointer when compact', () => {
    render(<NotGroundedMark mode="exploratory" compact />)
    const words = screen.getByText('Not grounded')
    expect(words).toHaveClass('sr-only')
    expect(words.parentElement).toHaveAttribute('title', 'Not grounded')
  })

  it('is worded from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    render(<NotGroundedMark mode="exploratory" />)
    expect(screen.getByText('Sin fuentes')).toBeVisible()
    expect(screen.queryByText('Not grounded')).not.toBeInTheDocument()
  })
})
