import { useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { PauseIcon, PlayIcon } from '@phosphor-icons/react'
import { ASSET_KIND_ICON } from '@/components/content/assetKindIcons'
import { cn } from '@/lib'
import { assetKind } from '@/lib/assetKind'
import { formatClock } from '@/lib/assetAnalysis'
import { pageUrlLabel } from '@/lib/webPageUrl'
import type { Asset } from '@/types/content'

type Props = {
  asset: Asset
  /** The page's one `<audio>` — see `useAudioSeek`. Recordings only. */
  audioRef: RefObject<HTMLAudioElement | null>
  onAudioTime: (ms: number) => void
}

/**
 * What the asset *is*, at the top of the left column (CON-366): one picture
 * per kind, so a reader knows what they are looking at before they read a
 * word of it. A PDF's first page edge to edge, a recording's player, a web
 * page's lead image, an image itself — and for the kinds with nothing to
 * picture, a quiet tile with the kind's mark.
 */
export function AssetStage({ asset, audioRef, onAudioTime }: Props) {
  const kind = assetKind(asset)
  if (kind === 'audio') {
    return (
      <AudioStage asset={asset} audioRef={audioRef} onAudioTime={onAudioTime} />
    )
  }
  if (kind === 'pdf' && asset.file?.thumbnail_url) {
    // Column-wide and uncaptioned: the cover is the picture, and the page
    // count is already in the kind line under it.
    return (
      <img
        src={asset.file.thumbnail_url}
        alt=""
        className="block w-full border-b border-quaternary bg-secondary"
      />
    )
  }
  if (kind === 'image') {
    const src = asset.file?.normalized_url ?? asset.file?.url
    if (src) {
      return (
        <img
          src={src}
          alt={asset.alt_text}
          className="block max-h-[480px] w-full bg-secondary object-contain"
        />
      )
    }
  }
  if (kind === 'page') {
    const hero = asset.images?.[0]?.url
    return hero ? (
      <img
        src={hero}
        alt=""
        className="block aspect-[16/9] w-full bg-secondary object-cover"
      />
    ) : (
      <Tile
        asset={asset}
        caption={asset.source_url ? pageUrlLabel(asset.source_url) : null}
      />
    )
  }
  return <Tile asset={asset} caption={fileExtension(asset)} />
}

function Tile({ asset, caption }: { asset: Asset; caption: string | null }) {
  const Icon = ASSET_KIND_ICON[assetKind(asset)]
  return (
    <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 bg-secondary text-tertiary-foreground">
      <Icon className="size-12" weight="light" aria-hidden />
      {caption && (
        <span className="max-w-[80%] truncate text-xs font-medium uppercase tracking-wide">
          {caption}
        </span>
      )}
    </div>
  )
}

/** "XLSX" from "q3-numbers.xlsx" — what a document tile says it is. */
function fileExtension(asset: Asset): string | null {
  const name = asset.file?.original_name ?? ''
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1) : null
}

const BARS = 56

/**
 * A recording, on a dark stage: a waveform and a player of our own.
 *
 * The waveform is decoration rather than the file's — drawing the real one
 * means decoding the whole recording in the browser before anything shows —
 * so it is seeded from the asset's id: the same recording always looks the
 * same, and two recordings never look alike. It does carry one true thing:
 * how far through the player is.
 */
function AudioStage({ asset, audioRef, onAudioTime }: Props) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const [now, setNow] = useState(0)
  const [duration, setDuration] = useState(0)
  const bars = useMemo(() => waveform(asset.id, BARS), [asset.id])
  const progress = duration > 0 ? now / duration : 0
  const src = asset.file?.url

  const toggle = () => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play().catch(() => {
        // Autoplay refused or an undecodable format; the button stays "play".
      })
    } else {
      el.pause()
    }
  }

  return (
    <div className="flex w-full flex-col gap-8 bg-primary-foreground px-8 pt-10 pb-8 text-primary">
      <div className="flex h-24 items-center gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span
            key={i}
            className={cn(
              'w-[3px] flex-1 rounded-full',
              i / BARS < progress ? 'bg-primary' : 'bg-primary/35',
            )}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
      {src ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            aria-label={
              playing
                ? t('assetInsights.player.pause')
                : t('assetInsights.player.play')
            }
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          >
            {playing ? (
              <PauseIcon weight="fill" className="size-5" />
            ) : (
              <PlayIcon weight="fill" className="size-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={now}
            onChange={(e) => {
              const el = audioRef.current
              if (el) el.currentTime = Number(e.target.value)
            }}
            aria-label={t('assetInsights.player.seek')}
            className="h-1 flex-1 cursor-pointer accent-current"
          />
          <span className="shrink-0 text-xs tabular-nums text-primary/80">
            {formatClock(now)} / {formatClock(duration)}
          </span>
          <audio
            ref={audioRef}
            src={src}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => {
              setNow(e.currentTarget.currentTime)
              onAudioTime(e.currentTarget.currentTime * 1000)
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-primary/70">{t('content.audio.missing')}</p>
      )}
    </div>
  )
}

/** Bar heights in [0.2, 1], stable for a seed. */
function waveform(seed: string, count: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    const r = ((h >>> 0) % 1000) / 1000
    // A slow swell under the noise, so it reads as speech rather than static.
    const swell = 0.55 + 0.45 * Math.sin((i / count) * Math.PI * 3 + r)
    out.push(0.2 + 0.8 * Math.min(1, r * 0.6 + swell * 0.5))
  }
  return out
}
