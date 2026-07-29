import { useEffect, useState, type ReactNode } from 'react'
import { AssessProgress } from '@/components/posts/quality/AssessProgress'
import { PostQualityPanelView } from '@/components/posts/quality/PostQualityPanelView'
import {
  CompositionBar,
  Overall,
  ScoreRing,
} from '@/components/posts/quality/PostQualityPanelView'
import { QualityDimensionCard } from '@/components/posts/quality/QualityDimensionCard'
import { QUALITY_DIMENSIONS } from '@/lib/postQuality.ts'
import { cn } from '@/lib'
import type { PostEvaluation } from '@/types/quality'
import {
  CAPTION_SCOPED,
  POST_EDITED_AT,
  POST_UNCHANGED_AT,
  STRONG,
  WEAK,
  WORKABLE,
} from './fixtures.ts'

/** The props every specimen shares; each one overrides the part it is about. */
const IDLE = {
  assessment: null,
  postUpdatedAt: POST_UNCHANGED_AT,
  loading: false,
  unavailable: false,
  loadError: null,
  onReload: () => undefined,
  onAssess: () => undefined,
  assessing: false,
  steps: [],
  cached: false,
  assessError: null,
  onClose: () => undefined,
} satisfies Parameters<typeof PostQualityPanelView>[0]

/**
 * TEMPORARY design harness — every state of the post-quality panel on one
 * page, at the real rail width (`w-120`), with fixtures written to look like
 * model output rather than lorem. Nothing here is reachable from the app.
 *
 * It exists because these states cannot coexist: a panel is either loading or
 * loaded, either scoring or scored, and a run that fails costs a model call to
 * reproduce. Seeing them together is the only way to check that the panel
 * doesn't jump between them, and that the three score bands are actually
 * distinguishable.
 *
 * Delete `routes/design/` and the `/design` exemption in `__root.tsx` when the
 * design is settled.
 */
export function PostQualityDesignHarness() {
  return (
    <div className="min-h-svh bg-background px-8 py-8 text-foreground">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-display font-medium tracking-tight">Post quality</h1>
        <p className="text-sm text-tertiary-foreground">
          Every state of the Quality panel (CON-85 / CON-92). Temporary — delete with{' '}
          <code className="text-xs">routes/design/</code>.
        </p>
      </header>

      <Section title="Panel — before there is a score">
        <Specimen label="Never assessed" note="the first-run call to action">
          <Frame>
            <PostQualityPanelView {...IDLE} />
          </Frame>
        </Specimen>

        <Specimen label="Run failed" note="the reason went to a toast; this offers the retry">
          <Frame>
            <PostQualityPanelView
              {...IDLE}
              assessError="the model returned an unparseable response after one retry"
            />
          </Frame>
        </Specimen>

        <Specimen label="Loading" note="stored result being fetched">
          <Frame>
            <PostQualityPanelView {...IDLE} loading />
          </Frame>
        </Specimen>

        <Specimen label="Load failed" note="a fetch problem, not a scoring one — reload, don't re-run">
          <Frame>
            <PostQualityPanelView {...IDLE} loadError="HTTP 500: internal server error" />
          </Frame>
        </Specimen>

        <Specimen label="Unavailable" note="503 — the fix is in settings, not a retry">
          <Frame>
            <PostQualityPanelView {...IDLE} unavailable />
          </Frame>
        </Specimen>
      </Section>

      <Section title="Panel — a run in flight">
        <Specimen label="Just started" note="no steps in yet">
          <Frame>
            <PostQualityPanelView {...IDLE} assessing />
          </Frame>
        </Specimen>

        <Specimen label="Mid-run" note="3 of 6 — the model call is the long one">
          <Frame>
            <PostQualityPanelView
              {...IDLE}
              assessing
              steps={['validateInput', 'buildContext', 'evaluate']}
            />
          </Frame>
        </Specimen>

        {/* Nothing the model reads has changed since the last run, so the
            server returns the stored result instead of paying for a new one
            (CON-92). It stops after buildContext — the four stages below stay
            grey and the run ends anyway. Worth looking at because it is the
            only case where the list finishes unfinished, and it must not read
            as a stall. */}
        <Specimen
          label="Cached run"
          note="nothing changed, so the server skips the model — ends after 2 of 6"
        >
          <Frame>
            <PostQualityPanelView
              {...IDLE}
              assessing
              steps={['validateInput', 'buildContext']}
            />
          </Frame>
        </Specimen>

        {/* Pressing Re-assess on a post that already has a score. The old
            score is not shown while the new one is computed — progress
            replaces it. This is the case that decides whether re-assessing
            feels safe: if the panel blanked and the run then failed, the user
            would think they had lost the score they had. */}
        <Specimen
          label="Re-run over an existing score"
          note="progress replaces the old score rather than sitting under it"
        >
          <Frame>
            <PostQualityPanelView
              {...IDLE}
              assessment={WORKABLE}
              assessing
              steps={['validateInput', 'buildContext', 'evaluate', 'validateOutput']}
            />
          </Frame>
        </Specimen>
      </Section>

      <Section title="Panel — scored">
        <Specimen label="Strong" note="88% · one low-severity note">
          <Frame tall>
            <PostQualityPanelView {...IDLE} assessment={STRONG} />
          </Frame>
        </Specimen>

        <Specimen label="Workable" note="65% · the common case, six notes">
          <Frame tall>
            <PostQualityPanelView {...IDLE} assessment={WORKABLE} />
          </Frame>
        </Specimen>

        <Specimen label="Weak" note="31% · high severity across the board">
          <Frame tall>
            <PostQualityPanelView {...IDLE} assessment={WEAK} />
          </Frame>
        </Specimen>

        <Specimen label="Stale" note="the post was edited after it was scored">
          <Frame tall>
            <PostQualityPanelView
              {...IDLE}
              assessment={WORKABLE}
              postUpdatedAt={POST_EDITED_AT}
            />
          </Frame>
        </Specimen>

        <Specimen label="Caption-scoped" note="image post — the visual was not judged">
          <Frame tall>
            <PostQualityPanelView {...IDLE} assessment={CAPTION_SCOPED} />
          </Frame>
        </Specimen>

        <Specimen label="Stale and caption-scoped" note="two flags stacked — the worst case">
          <Frame tall>
            <PostQualityPanelView
              {...IDLE}
              assessment={CAPTION_SCOPED}
              postUpdatedAt={POST_EDITED_AT}
            />
          </Frame>
        </Specimen>

        <Specimen label="Cached" note="the last run returned the stored result">
          <Frame tall>
            <PostQualityPanelView {...IDLE} assessment={WORKABLE} cached />
          </Frame>
        </Specimen>

        {/* A failed re-run leaves the panel exactly as it was: the stored
            score is still the truth about the post, and the toast has already
            said what went wrong. Identical to "Workable" by design — if these
            two differ, something is leaking the failure into the body. */}
        <Specimen label="Re-run failed" note="unchanged — the toast carried the reason">
          <Frame tall>
            <PostQualityPanelView
              {...IDLE}
              assessment={WORKABLE}
              assessError="usage limit reached for this workspace"
            />
          </Frame>
        </Specimen>
      </Section>

      <Section title="Fragments — the score">
        <Specimen label="Ring, all three bands" note="strong · workable · weak, plus the ends">
          <Body>
            <div className="flex flex-wrap items-center gap-4">
              {[100, 88, 80, 66, 50, 31, 8, 0].map((pct) => (
                <div key={pct} className="flex flex-col items-center gap-1">
                  <ScoreRing pct={pct} band={bandFor(pct)} />
                  <span className="text-[10px] text-quaternary-foreground tabular-nums">
                    {pct}
                  </span>
                </div>
              ))}
            </div>
          </Body>
        </Specimen>

        <Specimen label="Overall bar, all three bands" note="one solid fill, matching the ring">
          <Body>
            <div className="flex flex-col gap-4">
              <BarRow label="88% — strong" evaluation={STRONG} />
              <BarRow label="68% — workable" evaluation={CAPTION_SCOPED} />
              <BarRow label="65% — workable" evaluation={WORKABLE} />
              <BarRow label="31% — weak" evaluation={WEAK} />
            </div>
          </Body>
        </Specimen>

        <Specimen label="Overall block" note="ring, bar and both flags together">
          <Body>
            <Overall
              evaluation={CAPTION_SCOPED}
              postUpdatedAt={POST_EDITED_AT}
              cached={false}
            />
          </Body>
        </Specimen>
      </Section>

      <Section title="Fragments — progress">
        <Specimen
          label="A run, replayed"
          note="the only specimen that moves — the rest are frozen at a point in the run"
        >
          <Body>
            <div className="flex flex-col gap-8">
              <AssessProgressReplay stageMs={1400} />
              {/* Two stages landing together, then a long wait on the model —
                  the burst that used to make the list look like it redrew. */}
              <AssessProgressReplay stageMs={1400} burst={2} />
            </div>
          </Body>
        </Specimen>

        <Specimen label="Every step state" note="none · partial · all · an unknown stage">
          <Body>
            <div className="flex flex-col gap-8">
              <AssessProgress steps={[]} />
              <AssessProgress steps={['validateInput', 'buildContext', 'evaluate']} />
              <AssessProgress
                steps={[
                  'validateInput',
                  'buildContext',
                  'evaluate',
                  'validateOutput',
                  'composeScore',
                  'persist',
                ]}
              />
              {/* A stage the flow gains before this file knows about it must
                  still render, appended rather than dropped. */}
              <AssessProgress
                steps={['validateInput', 'buildContext', 'rerankSuggestions']}
              />
            </div>
          </Body>
        </Specimen>
      </Section>

      <Section title="Fragments — dimension cards">
        <Specimen label="One card per band" note="score 9 · 6 · 2, with their real notes">
          <Body>
            <div className="flex flex-col gap-3">
              <QualityDimensionCard
                meta={QUALITY_DIMENSIONS[0]}
                dimension={STRONG.result.correctness}
              />
              <QualityDimensionCard
                meta={QUALITY_DIMENSIONS[1]}
                dimension={WORKABLE.result.clarity}
              />
              <QualityDimensionCard
                meta={QUALITY_DIMENSIONS[2]}
                dimension={WEAK.result.engagement}
              />
            </div>
          </Body>
        </Specimen>

        <Specimen
          label="All four, one post"
          note="the icon carries the dimension; only Engagement and Delivery say 'this channel'"
        >
          <Body>
            <div className="flex flex-col gap-3">
              {QUALITY_DIMENSIONS.map((meta) => (
                <QualityDimensionCard
                  key={meta.key}
                  meta={meta}
                  dimension={WORKABLE.result[meta.key]}
                />
              ))}
            </div>
          </Body>
        </Specimen>

        <Specimen label="Suggestions, expanded" note="all three severities in one card">
          <Body>
            <QualityDimensionCard
              meta={QUALITY_DIMENSIONS[2]}
              dimension={WORKABLE.result.engagement}
              suggestionsOpen
            />
          </Body>
        </Specimen>

        <Specimen label="A long span" note="the quote is model-supplied and can run">
          <Body>
            <QualityDimensionCard
              meta={QUALITY_DIMENSIONS[1]}
              dimension={WORKABLE.result.clarity}
              suggestionsOpen
            />
          </Body>
        </Specimen>

        <Specimen label="Edge cases" note="no suggestions · zero score · missing dimension">
          <Body>
            <div className="flex flex-col gap-3">
              <QualityDimensionCard
                meta={QUALITY_DIMENSIONS[0]}
                dimension={{ ...STRONG.result.correctness, suggestions: null }}
              />
              {/* A zero has to draw as a zero, not vanish into a falsy branch. */}
              <QualityDimensionCard
                meta={QUALITY_DIMENSIONS[1]}
                dimension={{
                  ...WEAK.result.clarity,
                  score: 0,
                  contribution: 0,
                  rationale: '',
                  weakness: '',
                  suggestions: null,
                }}
              />
              {/* Renders nothing rather than asserting a score the model
                  never gave. There should be no third card below. */}
              <QualityDimensionCard meta={QUALITY_DIMENSIONS[2]} dimension={undefined} />
            </div>
          </Body>
        </Specimen>
      </Section>
    </div>
  )
}

const REPLAY_STEPS = [
  'validateInput',
  'buildContext',
  'evaluate',
  'validateOutput',
  'composeScore',
  'persist',
]

/**
 * A fake run on a loop, so the animation can be judged without a backend.
 *
 * Every other specimen on this page is a still, which is what makes them
 * useful — but a still cannot show whether the list feels like it is moving,
 * which is the only question this component exists to answer.
 *
 * `burst` releases that many stages at once before pausing, standing in for a
 * server that finishes two cheap stages in the same breath.
 */
function AssessProgressReplay({ stageMs, burst = 1 }: { stageMs: number; burst?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timer = setTimeout(
      () => {
        // A beat on the full list before starting over, or the loop point
        // reads as a glitch rather than as a new run.
        setCount((c) => (c >= REPLAY_STEPS.length ? 0 : Math.min(REPLAY_STEPS.length, c + burst)))
      },
      count >= REPLAY_STEPS.length ? stageMs * 2 : stageMs,
    )
    return () => clearTimeout(timer)
  }, [count, stageMs, burst])

  return <AssessProgress steps={REPLAY_STEPS.slice(0, count)} />
}

/** Mirrors `overallBand` without importing it, so the ring row is explicit. */
function bandFor(pct: number) {
  return pct >= 80 ? 'strong' : pct >= 50 ? 'workable' : 'weak'
}

function BarRow({ label, evaluation }: { label: string; evaluation: PostEvaluation }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-quaternary-foreground">{label}</span>
      <CompositionBar evaluation={evaluation} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-12 flex flex-col gap-4">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-10">{children}</div>
    </section>
  )
}

function Specimen({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: ReactNode
}) {
  return (
    <div className="flex w-120 shrink-0 flex-col gap-2">
      <header className="flex flex-col">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {label}
        </h3>
        {note && <p className="text-[11px] text-quaternary-foreground">{note}</p>}
      </header>
      {children}
    </div>
  )
}

/** The rail's own chrome: the width, the surface, the left hairline. */
function Frame({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  return (
    <div
      className={cn(
        'flex w-full flex-row border border-border bg-primary',
        tall ? 'h-[46rem]' : 'h-88',
      )}
    >
      <div className="w-px self-stretch bg-border" aria-hidden />
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Matches `RailPanel`'s body padding, so fragments sit where they really sit. */
function Body({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 border border-border bg-primary px-6 py-6">{children}</div>
  )
}
