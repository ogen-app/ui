import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { i18next, loadLocaleResources } from '@/i18n'
import { PostFailureNotice } from './PostFailureNotice'

const REASON = 'zernio_retry_rejected: zernio: HTTP 404: Post not found'

describe('PostFailureNotice', () => {
  it('says why a failed post failed', () => {
    render(
      <PostFailureNotice post={{ status: 'failed', failure_reason: REASON }} />,
    )
    expect(
      screen.getByText(
        'The publishing service refused to submit this post again. It said:',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('zernio: HTTP 404: Post not found'),
    ).toBeInTheDocument()
  })

  it('says nothing once the post has moved on, though the reason stays on the row', () => {
    const { container } = render(
      <PostFailureNotice
        post={{ status: 'scheduled', failure_reason: REASON }}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('says nothing about a failure the server gave no reason for', () => {
    const { container } = render(
      <PostFailureNotice post={{ status: 'failed' }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('speaks Spanish when the app does', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      render(
        <PostFailureNotice
          post={{
            status: 'failed',
            failure_reason: 'no_account_connected: no active account',
          }}
        />,
      )
      expect(
        screen.getByText(/No hay ninguna cuenta conectada para esta red/),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(/No account is connected/),
      ).not.toBeInTheDocument()
      expect(screen.queryByText(/no active account/)).not.toBeInTheDocument()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
