import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { AssetIngestState } from '@/components/content/AssetIngestState'
import { AssetTitle } from '@/components/content/AssetTitle'
import {
  useAudioStatus,
  useAudioTranscript,
  useRerunAudio,
} from '@/hooks/useContent'
import { cn } from '@/lib'
import { isTerminalStatus } from '@/lib/assetStatus'
import { ingestFailureMessage } from '@/lib/uploadError'
import type { Asset, AudioStatus, TranscriptEntry } from '@/types/content'

type Props = {
  asset: Asset
  onTitleChange: (title: string) => void
  onDirty: () => void
}

/**
 * A recording: the file to listen to, and what was said in it (CON-282).
 *
 * The transcript is read-only for the reason a PDF's text is (CON-312): it is
 * what the audio service heard, the chunks the assistant cites are timed
 * against it, and the server refuses a changed `content`. So the ways to
 * change it are the service's own — retry the parts that failed, or
 * transcribe the whole thing again.
 *
 * **Clicking a line plays from it.** The labels are the server's "M:SS–M:SS",
 * and a transcript whose timestamps don't do anything asks the reader to scrub
 * for the moment by hand. The line being played is marked as it goes by.
 */
export function AssetAudioView({ asset, onTitleChange, onDirty }: Props) {
  const { t } = useTranslation()
  const settled = isTerminalStatus(asset.status)
  const run = useAudioStatus(asset.id)
  const transcript = useAudioTranscript(asset.id, {
    enabled: settled && asset.status !== 'failed',
  })
  const rerun = useRerunAudio(asset.id)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [nowMs, setNowMs] = useState<number | null>(null)

  const seek = (entry: TranscriptEntry) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = entry.start_ms / 1000
    void el.play().catch(() => {
      // Autoplay refused, or a format this browser can't decode. The seek
      // stands; the play button is right there.
    })
  }

  const failedParts =
    run.data?.segments.filter((segment) => segment.status === 'failed')
      .length ?? 0
  const entries = (transcript.data ?? []).filter(
    (entry) => entry.text.trim() !== '',
  )

  // Offered once the run has stopped, whichever way. Retry only when there is
  // something to retry — the server answers 409 otherwise.
  const actions = settled && (
    <div className="flex flex-wrap justify-center gap-2">
      {failedParts > 0 && (
        <Button
          variant="outline"
          onClick={() => rerun.mutate('retry')}
          loading={rerun.isPending && rerun.variables === 'retry'}
          disabled={rerun.isPending}
        >
          <ArrowsClockwiseIcon />
          <span>{t('content.audio.retry', { count: failedParts })}</span>
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => rerun.mutate('reextract')}
        loading={rerun.isPending && rerun.variables === 'reextract'}
        disabled={rerun.isPending}
      >
        <span>{t('content.audio.reextract')}</span>
      </Button>
    </div>
  )

  return (
    <div className="flex w-content flex-col gap-8 bg-primary px-10 py-8">
      <AssetTitle
        initialTitle={asset.title}
        onChange={onTitleChange}
        onDirty={onDirty}
      />

      {asset.file?.url ? (
        <audio
          ref={audioRef}
          src={asset.file.url}
          controls
          preload="metadata"
          onTimeUpdate={(e) => setNowMs(e.currentTarget.currentTime * 1000)}
          className="w-full"
        >
          {/* Only reached by a browser with no <audio> at all. */}
          {t('content.audio.noPlayer')}
        </audio>
      ) : (
        <p className="text-sm text-tertiary-foreground">
          {t('content.audio.missing')}
        </p>
      )}

      {!settled ? (
        <>
          <AssetIngestState asset={asset} />
          <RunProgress run={run.data ?? null} />
        </>
      ) : asset.status === 'failed' ? (
        <AssetIngestState
          asset={{
            ...asset,
            // The run's reason is the more specific of the two when the asset
            // carries none of its own.
            failure_code:
              asset.failure_code ?? run.data?.extraction.failure_code,
            failure_reason:
              asset.failure_reason ?? run.data?.extraction.failure_reason,
          }}
        >
          {actions}
        </AssetIngestState>
      ) : (
        <div className="flex flex-col gap-4">
          {asset.status === 'partial' && (
            <p className="text-sm text-warning">
              {run.data
                ? ingestFailureMessage(t, run.data.extraction) + ' '
                : ''}
              {t('content.audio.partial')}
            </p>
          )}
          <h2 className="text-sm font-medium text-foreground">
            {t('content.audio.transcript')}
          </h2>
          {transcript.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner tone="onSurface" className="w-24" />
            </div>
          ) : transcript.isError ? (
            <p className="text-sm text-destructive">
              {t('content.audio.loadFailed')}
            </p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-tertiary-foreground">
              {t('content.audio.empty')}
            </p>
          ) : (
            <ol className="flex flex-col">
              {entries.map((entry) => {
                const playing =
                  nowMs !== null &&
                  nowMs >= entry.start_ms &&
                  nowMs < entry.end_ms
                return (
                  <li key={`${entry.start_ms}-${entry.end_ms}`}>
                    <button
                      type="button"
                      onClick={() => seek(entry)}
                      aria-label={t('content.audio.playFrom', {
                        time: entry.label,
                      })}
                      aria-current={playing || undefined}
                      className={cn(
                        'flex w-full gap-4 px-2 py-2 text-left transition-colors hover:bg-secondary',
                        playing && 'bg-secondary',
                      )}
                    >
                      <span className="w-24 shrink-0 text-xs tabular-nums text-tertiary-foreground">
                        {entry.label}
                      </span>
                      <span
                        className={cn(
                          'text-sm leading-6',
                          entry.is_speech
                            ? 'text-foreground'
                            : 'italic text-tertiary-foreground',
                        )}
                      >
                        {entry.text}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * How far the run is, under the spinner — the one thing the asset's own
 * `processing` can't say about a recording that takes minutes.
 */
function RunProgress({ run }: { run: AudioStatus | null }) {
  const { t } = useTranslation()
  if (!run) return null
  const { extraction, segments } = run
  if (extraction.status === 'transcribing' && segments.length > 0) {
    const done = segments.filter((segment) => segment.status === 'done').length
    return (
      <p className="text-center text-xs text-tertiary-foreground">
        {t('content.audio.progress', { done, total: segments.length })}
      </p>
    )
  }
  if (extraction.status === 'normalizing') {
    return (
      <p className="text-center text-xs text-tertiary-foreground">
        {t('content.audio.normalizing')}
      </p>
    )
  }
  return null
}
