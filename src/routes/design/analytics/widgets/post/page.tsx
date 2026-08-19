import { Link } from '@tanstack/react-router'
import { MEASURES } from '@/components/analytics/types'
import { POST_MEASURE_IDS } from './-measures'
import { HarnessShell } from '../../chrome-page'

/**
 * The post bench.
 *
 * One entry per card, because that is what the post surface is now: which post
 * this is, an overview, and a card per measure with its own history and its own
 * switch. They share a component and nothing else — a running total of reach, an
 * hourly column chart of clicks and a derived rate are three pictures with three
 * different ways of lying, and each needs reading against the same eight states
 * on its own.
 */
export function PostWidgetHub() {
  return (
    <HarnessShell
      title="Post widgets"
      lede="Every card the post surface is built from, against the states it has to survive. The surface shows one arrangement; these show the same card handed a four-hour-old post, a three-week-old one, a measure the platform never reported, and a workspace with no history to compare any of it against."
    >
      <div className="flex flex-col gap-2">
        <Widget
          to="/design/analytics/widgets/post/identity"
          title="The post"
          detail="Platform, account, format and when it went out. The first card, and the only one that renders the same in all eight states."
        />
        <Widget
          to="/design/analytics/widgets/post/overview"
          title="Performance overview"
          detail="Every figure the post reported, the rank, the notes — and no chart. The card that has to hold the surface up when nothing else can render."
        />
        {POST_MEASURE_IDS.map((measure) => (
          <Widget
            key={measure}
            to="/design/analytics/widgets/post/$measure"
            params={{ measure }}
            title={MEASURES[measure].label}
            detail={DETAIL[measure]}
          />
        ))}
      </div>
    </HarnessShell>
  )
}

/** Why each card is worth reviewing on its own rather than as one of seven. */
const DETAIL: Record<(typeof POST_MEASURE_IDS)[number], string> = {
  reach: 'The headline flow, and the one the rate divides by. Its running total is the shape everything else is read against.',
  impressions:
    'Read straight after reach — the two have to agree, and impressions climbing while reach flattens is the same people seeing it again.',
  interactions:
    'Lags reach by design: people react after they have seen. The card where the running total and the hourly reading disagree most.',
  engagement_rate:
    'Never carried, always derived — interactions over reach at whatever bucketing is on screen. Per bucket it carries a floor, and the small post is where that shows.',
  saves: 'The slowest flow there is: a save is a decision to come back. Sparse enough on a small post that the hourly reading is mostly gaps.',
  clicks: 'The fastest — someone taps the link in the same breath as reading. Nearly finished by the time reach is halfway.',
  views: 'Video only, so most specimens have no card at all. That absence is the thing to review.',
}

function Widget({
  to,
  params,
  title,
  detail,
}: {
  to: string
  params?: Record<string, string>
  title: string
  detail: string
}) {
  return (
    <Link
      to={to}
      params={params}
      className="flex max-w-2xl items-baseline justify-between gap-4 rounded-lg border border-border px-5 py-4 transition-colors hover:bg-quaternary"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-tertiary-foreground">{detail}</span>
      </span>
      <span className="shrink-0 text-xs text-tertiary-foreground">8 states</span>
    </Link>
  )
}
