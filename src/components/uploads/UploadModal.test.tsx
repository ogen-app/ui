import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { sha256Hex } from '@/lib/fileChecksum'
import type { Asset, AssetFile } from '@/types/content'
import { UploadModal } from './UploadModal'

/**
 * Recognising a file the workspace already has, before it is uploaded.
 *
 * The server answers a byte-identical image with the asset it already holds
 * (CON-246 R-Dedup) — no new row, and not even a changed timestamp on the old
 * one — so an upload of a duplicate is indistinguishable from an upload that
 * did nothing. These assert the warning that makes that outcome legible, and
 * the two places it must stay quiet: a kind the server does not dedupe, and
 * bytes it has never seen.
 */

const BYTES = 'the same picture'

function imageAsset(title: string, checksum: string): Asset {
  return {
    id: 'a1',
    title,
    content: '',
    status: 'ready',
    type: 'IMG',
    alt_text: '',
    tag_ids: [],
    tags: [],
    file: {
      id: 'f1',
      original_name: 'logo.png',
      mime_type: 'image/png',
      size_bytes: 16,
      width: 10,
      height: 10,
      is_animated: false,
      checksum_sha256: checksum,
    } satisfies AssetFile,
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

/** Seeds `GET /api/content-bank/assets` with whatever the workspace holds. */
function bank(assets: Asset[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(assets), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
}

async function stage(file: File) {
  await renderWithProviders(
    <UploadModal isOpen onClose={() => {}} campaignId={null} />,
  )
  const input = document.querySelector('input[type="file"]')
  await userEvent.upload(input as HTMLInputElement, file, {
    applyAccept: false,
  })
}

beforeEach(() => {
  bank([])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a staged image already in the workspace', () => {
  it('names the document it would resolve to', async () => {
    bank([imageAsset('Brand logo', await sha256Hex(new File([BYTES], 'x')))])

    // A different filename entirely: the name is not what the server compares,
    // which is exactly why this is worth saying out loud. Filed under "Brand
    // logo", dropped again as a screenshot.
    await stage(new File([BYTES], 'Screenshot 2026-09-14.png'))

    expect(
      await screen.findByText('Already in the content bank as "Brand logo"'),
    ).toBeInTheDocument()
  })

  it('warns rather than refuses — the file is still staged', async () => {
    bank([imageAsset('Brand logo', await sha256Hex(new File([BYTES], 'x')))])
    await stage(new File([BYTES], 'logo-again.png'))

    await screen.findByText(/Already in the content bank/)
    expect(screen.getByRole('button', { name: 'UPLOAD (1)' })).toBeEnabled()
  })
})

describe('what it stays quiet about', () => {
  it('says nothing about bytes the workspace has not seen', async () => {
    bank([imageAsset('Brand logo', await sha256Hex(new File([BYTES], 'x')))])
    await stage(new File(['a different picture'], 'other.png'))

    await screen.findByText('other.png')
    expect(
      screen.queryByText(/Already in the content bank/),
    ).not.toBeInTheDocument()
  })

  /*
   * Only images carry a checksum and only images are deduped — a PDF uploaded
   * twice really does become two documents, so warning about it would be a
   * promise the server does not keep.
   */
  it('says nothing about a PDF, which the server does not dedupe', async () => {
    bank([imageAsset('Brand logo', await sha256Hex(new File([BYTES], 'x')))])
    await stage(new File([BYTES], 'report.pdf'))

    await screen.findByText('report.pdf')
    expect(
      screen.queryByText(/Already in the content bank/),
    ).not.toBeInTheDocument()
  })
})
