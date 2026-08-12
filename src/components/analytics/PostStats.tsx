import { useState } from 'react'
import { CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { DecayCurve } from './charts'
import { InsightLine } from './ComparisonSections'
import { Basis } from './shell'
import { formatMeasure, measureMeta } from './format'
import type { PostMaturity, PostStatsData } from './types'

/**
 * A post's own numbers, as a section of the post rather than a screen.
 *
 * It sits below the notes and the content because that is the order of the
 * page's importance while a post is being worked on, and it stays collapsed
 * until it has something to say — an expanded block of dashes on every draft
 * would train people to scroll past the one place the numbers eventually
 * appear.
 *
 * The percentile is the point. "1,240 impressions" is unreadable without a
 * frame of reference; "better than 88% of your posts" is legible to someone
 * who has never opened an analytics screen in their life, and it works from
 * week two rather than needing an industry benchmark nobody has.
 */
export function PostStats({
  data,
  defaultOpen,
}: {
  data: PostStatsData
  /** The harness pins this; in the product it follows maturity. */
  defaultOpen?: boolean
}) {
  const collapsible = data.maturity !== 'unpublished'
  const [open, setOpen] = useState(defaultOpen ?? data.maturity === 'final')

  if (data.maturity === 'unpublished') {
    return (
      <Section>
        <div className="flex items-center justify-between gap-3">
          <SummaryLine data={data} />
        </div>
      </Section>
    )
  }

  return (
    <Section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
        disabled={!collapsible}
      >
        <SummaryLine data={data} />
        <CaretRightIcon
          className={cn(
            'size-4 shrink-0 text-tertiary-foreground transition-transform',
            open && 'rotate-90',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.metrics.map((m) => (
              <div
                key={m.measure}
                className="flex min-w-0 flex-col gap-0.5 rounded-md bg-secondary px-3 py-2.5"
              >
                <span className="font-display text-xl font-medium leading-6 truncate">
                  {formatMeasure(m.measure, m.value)}
                </span>
                <span className="text-xs text-secondary-foreground truncate">
                  {measureMeta(m.measure).label}
                </span>
              </div>
            ))}
          </div>

          {data.perAccount.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-medium">By account</h4>
              <ul className="flex flex-col">
                {data.perAccount.map(({ sleeve, metrics }) => (
                  <li
                    key={sleeve.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {sleeve.label}
                    </span>
                    {metrics.map((m) => (
                      <span
                        key={m.measure}
                        className="w-20 shrink-0 text-right text-sm tabular-nums"
                      >
                        {formatMeasure(m.measure, m.value)}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.decay && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-medium">Engagement since publishing</h4>
              <DecayCurve
                points={data.decay}
                markerHour={data.maturity === 'final' ? undefined : currentHour(data)}
              />
              <Basis>
                {data.maturity === 'final'
                  ? 'This post has stopped earning — these numbers are final.'
                  : 'The marker is where this post is now. The numbers above are still moving.'}
              </Basis>
            </div>
          )}

          {data.insight && <InsightLine insight={data.insight} />}
        </div>
      )}
    </Section>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-primary p-5">
      {children}
    </section>
  )
}

/**
 * The one line that has to work collapsed, because for most posts it is the
 * only line anyone reads.
 */
function SummaryLine({ data }: { data: PostStatsData }) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="text-sm font-medium">Performance</span>
      <MaturityBadge maturity={data.maturity} publishedAt={data.publishedAt} />
      {data.percentile !== null && (
        <span
          className={cn(
            'text-xs',
            data.percentile >= 75
              ? 'text-positive'
              : data.percentile <= 25
                ? 'text-negative'
                : 'text-secondary-foreground',
          )}
        >
          Better than {data.percentile}% of your posts
        </span>
      )}
    </span>
  )
}

const MATURITY_LABEL: Record<PostMaturity, string> = {
  unpublished: 'Nothing to measure yet',
  counting: 'Still counting',
  settling: 'Settling',
  final: 'Final',
}

function MaturityBadge({
  maturity,
  publishedAt,
}: {
  maturity: PostMaturity
  publishedAt?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-secondary-foreground">
      <span
        className={cn(
          'size-1.5 rounded-full',
          maturity === 'final'
            ? 'bg-positive'
            : maturity === 'unpublished'
              ? 'bg-quinary-foreground'
              : 'bg-warning',
        )}
        aria-hidden
      />
      {MATURITY_LABEL[maturity]}
      {publishedAt && maturity !== 'unpublished' && ` · published ${publishedAt}`}
    </span>
  )
}

/** Where the post currently sits on its own decay curve. */
function currentHour(data: PostStatsData): number | undefined {
  if (!data.decay || data.decay.length === 0) return undefined
  // The fixture curves end at the post's current age while it is still
  // counting, so the marker is simply the last point drawn.
  return data.decay[data.decay.length - 1].hour
}
