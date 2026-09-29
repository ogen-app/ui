import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryWrapper } from '@/test/queryWrapper'
import type { Asset, AudioStatus, TranscriptEntry } from '@/types/content'

const api = vi.hoisted(() => ({
  getAudioStatus: vi.fn(),
  getAudioTranscript: vi.fn(),
  retryAudio: vi.fn(),
  reextractAudio: vi.fn(),
}))
vi.mock('@/services/api/content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/content')>()),
  ...api,
}))

const { AssetAudioView } = await import('./AssetAudioView')

const asset = (over: Partial<Asset>): Asset => ({
  id: 'aud1',
  title: 'Product update',
  content: '',
  status: 'ready',
  type: 'AUDIO',
  alt_text: '',
  tag_ids: [],
  tags: [],
  created_by: 'u1',
  created_at: '2026-09-28T00:00:00Z',
  updated_at: '2026-09-28T00:00:00Z',
  file: {
    id: 'f1',
    original_name: 'update.m4a',
    mime_type: 'audio/mp4',
    size_bytes: 1024,
    url: 'https://bucket.example/update.m4a',
    width: 0,
    height: 0,
    is_animated: false,
  },
  ...over,
})

const run = (
  status: AudioStatus['extraction']['status'],
  segments: AudioStatus['segments'] = [],
): AudioStatus => ({
  extraction: {
    id: 'x1',
    asset_id: 'aud1',
    status,
    source_duration_ms: 60_000,
    segment_count: segments.length,
  },
  segments,
})

const segment = (index: number, status: 'pending' | 'done' | 'failed') => ({
  id: `s${index}`,
  index,
  start_ms: index * 30_000,
  end_ms: (index + 1) * 30_000,
  status,
  retry_count: 0,
})

const line = (over: Partial<TranscriptEntry>): TranscriptEntry => ({
  start_ms: 0,
  end_ms: 5_000,
  label: '0:00–0:05',
  text: '',
  confidence: 0.9,
  language: 'en',
  is_speech: true,
  ...over,
})

function renderView(a: Asset) {
  return render(
    <QueryWrapper>
      <AssetAudioView asset={a} onTitleChange={() => {}} onDirty={() => {}} />
    </QueryWrapper>,
  )
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset()
  api.getAudioStatus.mockResolvedValue(run('complete'))
  api.getAudioTranscript.mockResolvedValue([])
})

describe('AssetAudioView', () => {
  it('plays the recording and shows the transcript under its timestamps', async () => {
    api.getAudioTranscript.mockResolvedValue([
      line({ text: 'Welcome back.' }),
      line({
        start_ms: 65_000,
        end_ms: 70_000,
        label: '1:05–1:10',
        text: 'Pricing changes next week.',
      }),
    ])
    const { container } = renderView(asset({}))

    expect(container.querySelector('audio')).toHaveAttribute(
      'src',
      'https://bucket.example/update.m4a',
    )
    expect(
      await screen.findByText('Pricing changes next week.'),
    ).toBeInTheDocument()
    expect(screen.getByText('1:05–1:10')).toBeInTheDocument()
  })

  it('plays from the line that was clicked', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    api.getAudioTranscript.mockResolvedValue([
      line({
        start_ms: 65_000,
        end_ms: 70_000,
        label: '1:05–1:10',
        text: 'Later.',
      }),
    ])
    const { container } = renderView(asset({}))

    fireEvent.click(
      await screen.findByRole('button', { name: 'Play from 1:05–1:10' }),
    )
    expect(container.querySelector('audio')!.currentTime).toBe(65)
    expect(play).toHaveBeenCalled()
    play.mockRestore()
  })

  it('reports how far a run has got while it is still transcribing', async () => {
    api.getAudioStatus.mockResolvedValue(
      run('transcribing', [segment(0, 'done'), segment(1, 'pending')]),
    )
    renderView(asset({ status: 'processing' }))

    expect(screen.getByText('Reading this file')).toBeInTheDocument()
    expect(
      await screen.findByText('Transcribed 1 of 2 parts'),
    ).toBeInTheDocument()
    expect(api.getAudioTranscript).not.toHaveBeenCalled()
  })

  it('offers a retry of just the parts that failed', async () => {
    api.getAudioStatus.mockResolvedValue(
      run('partial', [segment(0, 'done'), segment(1, 'failed')]),
    )
    api.retryAudio.mockResolvedValue(undefined)
    renderView(asset({ status: 'partial' }))

    const retry = await screen.findByRole('button', {
      name: 'Retry the failed part',
    })
    fireEvent.click(retry)
    await waitFor(() => expect(api.retryAudio).toHaveBeenCalledWith('aud1'))
  })

  it('says why a failed recording failed, and offers to transcribe it again', async () => {
    renderView(
      asset({
        status: 'failed',
        failure_code: 'duration_exceeded',
        failure_reason: 'audio is 95 min, over the 60 min limit for your plan',
      }),
    )

    expect(
      screen.getByText(
        'This recording is over the 60-minute limit for your plan.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Transcribe again' }),
    ).toBeInTheDocument()
  })
})
