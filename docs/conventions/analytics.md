# Analytics

Conventions for the analytics dashboard, its demo data and the charts. Moved out of the root `CLAUDE.md` so it
loads only when needed — read this before changing the code it covers, and
keep it accurate when these rules change.

- **The analytics dashboard can be served simulated numbers, for the same
  browser and behind the same gate.** `?analytics=demo` (or the panel at
  `/flags`) points `/overview`, `/performers` and `/learnings` at
  `services/api/analytics.demo.ts`, because a local API answers
  `available: false` for all three — so the cards are otherwise only ever seen
  in their setup state. The reason is **not** that the figures are thin: the
  analytics tables live in a *separate* database (the backend keeps its own
  `migrations_analytics/` tree, and `20260729000001_drop_post_analytics`
  removed them from the main one), and `ANALYTICS_DSN` is unset in the local
  stack — which `config.go` documents as the graceful-disable default. So there
  is nothing to sweep, rather than nothing swept yet. Wiring one up needs no
  TimescaleDB and no second container: every Timescale block in those
  migrations is guarded by `IF EXISTS (… 'timescaledb')`, the API embeds and
  applies them at boot, and they track their state in `bun_migrations_analytics`
  precisely so the schema can share the dev Postgres with the control plane. `empty` and `unavailable` produce the other two answers the endpoints
  give. It is **not** the JSON-seed stub pattern: these endpoints exist and ship, so
  the demo is off by default even in dev, has to be asked for, folds away
  entirely without `VITE_DEV_TOOLS=1`, and is announced in the corner for as
  long as it is on — invented figures about a workspace's own posts are
  indistinguishable from real ones, and somebody would act on them. The same
  mode answers a single post's `GET /api/posts/:id/analytics` for any published
  post, linked or not, and fills in the per-measure history no endpoint serves
  yet (`demoPostHistory`), so the post's measure cards and their reading
  dropdown can be looked at.

- **Charts are hand-rolled SVG, except the two full-card plots.**
  `components/analytics/charts.tsx` draws sparklines, heatmaps, the decay
  curve, the publication rail and the rank bars itself — every shape is a
  polyline, a band or a grid of rectangles, and rolling them keeps the colours
  on semantic tokens. `TrendChart` and `ColumnChart` go through `plot.tsx`,
  which measures real pixels and owns the scale (`@visx/scale`), the pointer
  (`@visx/event`) and the hover card; only the line itself is `@visx/shape`.
  Two things not to undo: the plot is **measured, not stretched** — the old
  `preserveAspectRatio="none"` viewBox made the focus dot an ellipse and every
  pointer coordinate a conversion — and it measures with its **own**
  `useMeasuredWidth`, not `ParentSize`, which never observed a plot mounted
  after the first paint and left every switched measure blank. Sparklines keep
  the stretched viewBox; they have no pointer and nothing round.

- **A measure is drawn in one shape, decided in one place.** `drawnSeries`
  (`analytics/format.ts`) says whether a series is accumulated, and both the
  tile's sparkline and the chart under it ask it. They used to each hold a
  copy and drifted — per-day bars under a label reading "Cumulative reach",
  above a chart drawing the running total.
