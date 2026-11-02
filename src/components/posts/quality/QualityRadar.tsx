import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { formatList } from '@/lib/intl'
import {
  QUALITY_DIMENSIONS,
  RADAR_RINGS,
  dimensionLabel,
  formatDelta,
  lowestDimension,
  radarPoint,
  radarScore,
  scoreDelta,
  type RadarCorner,
} from '@/lib/postQuality.ts'
import type { PostEvaluation, QualityDimensionKey } from '@/types/quality'
import { RadarGuide } from './RadarGuide.tsx'

/**
 * The four dimensions as a square web (CON-440).
 *
 * With four axes a spiderweb is a square turned on its corner, so the
 * dimensions sit on the diagonals and the vertical centre line splits the
 * chart into the writing (left) and its fit for the channel (right). The rings
 * are `scoreBand`'s thresholds, which is what lets the band be read off the
 * chart without its colour.
 *
 * The web is SVG; the corner labels are HTML laid over it. They are buttons —
 * each opens its dimension's reasons — and they hold catalogue copy that wraps
 * differently per language, neither of which SVG text does well.
 */

/** The drawing's own coordinate space; the SVG scales to the rail's width. */
const W = 352
const H = 272
const CX = W / 2
const CY = H / 2
/** Half the outer ring's side: where a 10 lands. */
const REACH = 88
/** Room between a corner of the web and its label. */
const LABEL_GAP = 12

function points(
  evaluation: PostEvaluation,
  reach: number,
  cx: number,
  cy: number,
): string {
  return QUALITY_DIMENSIONS.flatMap((meta) => {
    const d = evaluation.result?.[meta.key]
    // A dimension missing from the payload is a shape we don't understand;
    // drawing a zero would assert a score the model never gave.
    if (!d) return []
    const p = radarPoint(meta.corner, d.score, reach)
    return [`${cx + p.x},${cy + p.y}`]
  }).join(' ')
}

/** A square ring at `score` on the 0–10 scale, as a rect. */
function ring(score: number, reach: number, cx: number, cy: number) {
  const half = (score / 10) * reach
  return { x: cx - half, y: cy - half, width: half * 2, height: half * 2 }
}

export function QualityRadar({
  evaluation,
  previous,
  platformName,
  onSelectDimension,
}: {
  evaluation: PostEvaluation
  /** The run this one replaced; drawn dashed, and the source of the changes. */
  previous: PostEvaluation | null
  platformName: string | null
  onSelectDimension: (key: QualityDimensionKey) => void
}) {
  const { t } = useTranslation()
  const lowest = lowestDimension(evaluation)
  const outer = ring(10, REACH, CX, CY)
  const good = ring(RADAR_RINGS[1], REACH, CX, CY)

  // The chart's accessible name: every score joined the way the language
  // joins a list, then which one is lowest. The visible labels say the same
  // thing, but a screen reader meets the image first.
  const summary = [
    t('posts.quality.radar.scores', {
      scores: formatList(
        QUALITY_DIMENSIONS.flatMap((meta) => {
          const d = evaluation.result?.[meta.key]
          return d
            ? [
                t('posts.quality.radar.scoreItem', {
                  dimension: dimensionLabel(t, meta.key),
                  score: d.score,
                }),
              ]
            : []
        }),
      ),
    }),
    lowest
      ? t('posts.quality.radar.lowest', {
          dimension: dimensionLabel(t, lowest),
        })
      : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="flex flex-col gap-3">
      <div className="relative grid grid-cols-2 gap-4 pr-8">
        <span className="text-right font-grotesk text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary-foreground">
          {t('posts.quality.radar.writing')}
        </span>
        <span className="truncate font-grotesk text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary-foreground">
          {platformName
            ? t('posts.quality.radar.channel', { platform: platformName })
            : t('posts.quality.radar.channelGeneric')}
        </span>
        <div className="absolute top-1/2 right-0 -translate-y-1/2">
          <RadarGuide platformName={platformName} />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={summary}
        >
          {/* The good zone: the band between the 8 ring and the edge. */}
          <path
            d={`M${outer.x} ${outer.y}h${outer.width}v${outer.height}h${-outer.width}Z M${good.x} ${good.y}h${good.width}v${good.height}h${-good.width}Z`}
            fillRule="evenodd"
            className="fill-positive/10"
          />
          <rect {...outer} fill="none" className="stroke-border" />
          {RADAR_RINGS.map((score) => (
            <rect
              key={score}
              {...ring(score, REACH, CX, CY)}
              fill="none"
              className="stroke-quaternary-foreground"
            />
          ))}
          {QUALITY_DIMENSIONS.map((meta) => {
            const end = radarPoint(meta.corner, 10, REACH)
            return (
              <line
                key={meta.key}
                x1={CX}
                y1={CY}
                x2={CX + end.x}
                y2={CY + end.y}
                className="stroke-border"
              />
            )
          })}
          <line
            x1={CX}
            y1={outer.y - 14}
            x2={CX}
            y2={outer.y + outer.height + 14}
            strokeDasharray="1 3"
            className="stroke-tertiary-foreground"
          />

          {previous && (
            <polygon
              points={points(previous, REACH, CX, CY)}
              fill="none"
              strokeWidth={1.25}
              strokeDasharray="4 3"
              strokeLinejoin="round"
              className="stroke-tertiary-foreground"
            />
          )}
          <polygon
            points={points(evaluation, REACH, CX, CY)}
            strokeWidth={1.75}
            strokeLinejoin="round"
            className="fill-foreground/[0.07] stroke-foreground"
          />
          {QUALITY_DIMENSIONS.map((meta) => {
            const d = evaluation.result?.[meta.key]
            if (!d) return null
            const p = radarPoint(meta.corner, d.score, REACH)
            return (
              <rect
                key={meta.key}
                x={CX + p.x - 3.5}
                y={CY + p.y - 3.5}
                width={7}
                height={7}
                className="fill-foreground"
              />
            )
          })}

          {RADAR_RINGS.map((score) => {
            const r = ring(score, REACH, CX, CY)
            return (
              <text
                key={score}
                x={r.x + 3}
                y={CY + 3}
                // Haloed in the surface colour so the number stays legible
                // where an edge of the shape crosses it.
                style={{ paintOrder: 'stroke' }}
                strokeWidth={3}
                strokeLinejoin="round"
                className="fill-tertiary-foreground stroke-primary text-[9.5px]"
              >
                {score}
              </text>
            )
          })}
        </svg>

        {QUALITY_DIMENSIONS.map((meta) => {
          const d = evaluation.result?.[meta.key]
          if (!d) return null
          return (
            <CornerLabel
              key={meta.key}
              corner={meta.corner}
              name={dimensionLabel(t, meta.key)}
              score={d.score}
              delta={scoreDelta(evaluation, previous, meta.key)}
              lowest={lowest === meta.key}
              onSelect={() => onSelectDimension(meta.key)}
            />
          )
        })}
      </div>

      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary-foreground">
        {previous && (
          <>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-[1.75px] w-4 bg-foreground" />
              {t('posts.quality.radar.legendNow')}
            </li>
            <li className="flex items-center gap-1.5">
              <svg aria-hidden width="16" height="2" className="shrink-0">
                <line
                  x1="0"
                  y1="1"
                  x2="16"
                  y2="1"
                  strokeWidth={1.25}
                  strokeDasharray="4 3"
                  className="stroke-tertiary-foreground"
                />
              </svg>
              {t('posts.quality.radar.legendBefore')}
            </li>
          </>
        )}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 bg-positive/10" />
          {t('posts.quality.radar.legendGood')}
        </li>
      </ul>
    </section>
  )
}

function CornerLabel({
  corner,
  name,
  score,
  delta,
  lowest,
  onSelect,
}: {
  corner: RadarCorner
  name: string
  score: number
  delta: number | null
  lowest: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const left = corner === 'nw' || corner === 'sw'
  const end = radarPoint(corner, 10, REACH)
  // Beside its corner of the outer ring, centred on it vertically, in the
  // drawing's percentages so it tracks the SVG as the rail resizes.
  const style: CSSProperties = {
    top: `${((CY + end.y) / H) * 100}%`,
    ...(left
      ? { right: `${((W - (CX + end.x - LABEL_GAP)) / W) * 100}%` }
      : { left: `${((CX + end.x + LABEL_GAP) / W) * 100}%` }),
    width: `${((CX - REACH - LABEL_GAP - 4) / W) * 100}%`,
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={t('posts.quality.radar.corner', {
        dimension: name,
        score,
      })}
      style={style}
      className={cn(
        'absolute flex -translate-y-1/2 cursor-pointer flex-col px-1 py-0.5 hover:bg-tertiary focus-visible:outline-2 focus-visible:outline-border-primary',
        left ? 'items-end text-right' : 'items-start text-left',
      )}
    >
      <span
        className={cn(
          'text-xs',
          lowest
            ? 'font-semibold text-foreground'
            : 'text-secondary-foreground',
        )}
      >
        {name}
      </span>
      <span className="tabular-nums">
        <span
          className={cn(
            'font-display text-xl text-foreground',
            lowest ? 'font-bold' : 'font-medium',
          )}
        >
          {radarScore(score)}
        </span>
        <span className="text-xs text-tertiary-foreground">
          {t('posts.quality.outOfTen')}
        </span>
        {delta !== null && delta !== 0 && (
          <span className="ml-1 text-xs font-medium text-secondary-foreground">
            {formatDelta(delta)}
          </span>
        )}
      </span>
    </button>
  )
}

/**
 * The radar at glyph size, for the checks bar. Unlabelled on purpose: the
 * score list beside it names every corner, and at 80px the labels would
 * crowd out the shape, which is the only thing a glyph this small can say.
 */
export function QualityRadarMini({
  evaluation,
  previous,
  className,
}: {
  evaluation: PostEvaluation
  previous: PostEvaluation | null
  className?: string
}) {
  const size = 80
  const c = size / 2
  const reach = 36
  const outer = ring(10, reach, c, c)
  const good = ring(RADAR_RINGS[1], reach, c, c)
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className={cn('size-20 shrink-0', className)}
    >
      <path
        d={`M${outer.x} ${outer.y}h${outer.width}v${outer.height}h${-outer.width}Z M${good.x} ${good.y}h${good.width}v${good.height}h${-good.width}Z`}
        fillRule="evenodd"
        className="fill-positive/10"
      />
      <rect {...outer} fill="none" className="stroke-border" />
      {RADAR_RINGS.map((score) => (
        <rect
          key={score}
          {...ring(score, reach, c, c)}
          fill="none"
          className="stroke-quaternary-foreground"
        />
      ))}
      {previous && (
        <polygon
          points={points(previous, reach, c, c)}
          fill="none"
          strokeDasharray="3 2"
          className="stroke-tertiary-foreground"
        />
      )}
      <polygon
        points={points(evaluation, reach, c, c)}
        strokeWidth={1.5}
        strokeLinejoin="round"
        className="fill-foreground/[0.07] stroke-foreground"
      />
    </svg>
  )
}

/**
 * Which corner of the radar a dimension is: a small square with that corner
 * filled. Lets a list of scores point at the shape without repeating it.
 */
export function CornerGlyph({ corner }: { corner: RadarCorner }) {
  const x = corner === 'nw' || corner === 'sw' ? 0 : 5
  const y = corner === 'nw' || corner === 'ne' ? 0 : 5
  return (
    <svg aria-hidden viewBox="0 0 10 10" className="size-2.5 shrink-0">
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        fill="none"
        className="stroke-quaternary-foreground"
      />
      <rect x={x} y={y} width="5" height="5" className="fill-foreground" />
    </svg>
  )
}
