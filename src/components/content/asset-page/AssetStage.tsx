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
  // A picture whose object will not load — gone from storage, or a bucket
  // that will not serve it — falls back to the tile, never the browser's
  // broken-image glyph. Keyed by URL, so a fresh one gets its own try.
  const [failed, setFailed] = useState<string | null>(null)
  const usable = (src: string | null | undefined): src is string =>
    !!src && src !== failed
  const onError = (src: string) => () => setFailed(src)

  if (kind === 'audio') {
    return (
      <AudioStage asset={asset} audioRef={audioRef} onAudioTime={onAudioTime} />
    )
  }
  const cover = asset.file?.thumbnail_url
  if (kind === 'pdf' && usable(cover)) {
    // Column-wide and uncaptioned: the cover is the picture, and the page
    // count is already in the kind line under it.
    return (
      <img
        src={cover}
        alt=""
        onError={onError(cover)}
        className="block w-full border-b border-quaternary bg-secondary"
      />
    )
  }
  if (kind === 'image') {
    const src = asset.file?.normalized_url ?? asset.file?.url
    if (usable(src)) {
      return (
        <img
          src={src}
          alt={asset.alt_text}
          onError={onError(src)}
          className="block max-h-[480px] w-full bg-secondary object-contain"
        />
      )
    }
  }
  if (kind === 'page') {
    const hero = asset.images?.[0]?.url
    const domain = asset.source_url ? pageUrlLabel(asset.source_url) : null
    return usable(hero) ? (
      <div className="relative">
        <img
          src={hero}
          alt=""
          onError={onError(hero)}
          className="block aspect-[16/9] w-full bg-secondary object-cover"
        />
        {domain && (
          // Where the picture is from, on the picture: a page's lead image
          // says little until you know whose page it is.
          <span className="absolute bottom-3 left-3 max-w-[80%] truncate rounded-full bg-primary-foreground/80 px-2.5 py-1 text-xs font-medium text-primary">
            {domain}
          </span>
        )}
      </div>
    ) : (
      <Tile asset={asset} caption={domain} />
    )
  }
  if (kind === 'text') {
    const lines = noteLines(asset.content)
    if (lines.length > 0) return <NoteTile lines={lines} />
  }
  return (
    <Tile
      asset={asset}
      caption={fileExtension(asset)}
      name={asset.file?.original_name}
    />
  )
}

/**
 * A note's first lines, small, on its tile — the opening of the text says
 * more about a note than any mark could.
 */
function NoteTile({ lines }: { lines: string[] }) {
  return (
    <div className="relative flex aspect-[16/9] w-full flex-col gap-1.5 overflow-hidden bg-secondary px-8 py-6">
      {lines.map((line, i) => (
        <p
          key={i}
          className={cn(
            'truncate text-xs text-secondary-foreground',
            i === 0 && 'font-semibold text-foreground',
          )}
        >
          {line}
        </p>
      ))}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-secondary" />
    </div>
  )
}

/** The note's first non-empty lines, with Markdown marks stripped. */
function noteLines(content: string): string[] {
  return content
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s*(#{1,6}\s+|[-*+]\s+|>\s?|\d+\.\s+)/, '')
        .replace(/[*_`]/g, '')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 7)
}

function Tile({
  asset,
  caption,
  name,
}: {
  asset: Asset
  caption: string | null
  /** The file's own name, under the format. */
  name?: string
}) {
  const Icon = ASSET_KIND_ICON[assetKind(asset)]
  return (
    <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 bg-secondary text-tertiary-foreground">
      <Icon className="size-12" weight="light" aria-hidden />
      {caption && (
        <span className="max-w-[80%] truncate text-xs font-medium uppercase tracking-wide">
          {caption}
        </span>
      )}
      {name && <span className="max-w-[80%] truncate text-xs">{name}</span>}
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
    // Space plays and pauses, the arrows step five seconds — on the stage as a
    // whole, so the keys work wherever focus sits inside it.
    <div
      tabIndex={-1}
      onKeyDown={(e) => {
        const el = audioRef.current
        const tag = (e.target as HTMLElement).tagName
        // The scrubber has its own keys, and the play button its own space.
        if (!el || tag === 'INPUT') return
        if (e.key === ' ' && tag !== 'BUTTON') {
          e.preventDefault()
          toggle()
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault()
          el.currentTime = Math.max(
            0,
            el.currentTime + (e.key === 'ArrowRight' ? 5 : -5),
          )
        }
      }}
      className="flex w-full flex-col gap-8 bg-primary-foreground px-8 pt-10 pb-8 text-primary outline-none"
    >
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
