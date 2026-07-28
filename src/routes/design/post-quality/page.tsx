import type { ReactNode } from 'react'
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

        <Specimen label="Never assessed, run failed" note="error above the CTA, not instead of it">
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

        <Specimen label="Load failed" note="retryable — the endpoint answered badly">
          <Frame>
            <PostQualityPanelView {...IDLE} loadError="HTTP 500: internal server error" />
          </Frame>
        </Specimen>

        <Specimen label="Unavailable" note="503 — no retry offered, nothing to retry">
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

        <Specimen
          label="Cached run"
          note="CON-92 short-circuits after buildContext — the last four never arrive"
        >
          <Frame>
            <PostQualityPanelView
              {...IDLE}
              assessing
              steps={['validateInput', 'buildContext']}
            />
          </Frame>
        </Specimen>

        <Specimen label="Re-run over an existing score" note="the result is replaced, not stacked">
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

        <Specimen label="Re-run failed" note="the old score survives — losing it would be worse">
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

        <Specimen
          label="Composition bar, three weight profiles"
          note="same scores; the profile is what moves the slices"
        >
          <Body>
            <div className="flex flex-col gap-4">
              <BarRow label="text — 30/30/20/20" evaluation={WORKABLE} />
              <BarRow label="image — 20/15/35/30" evaluation={CAPTION_SCOPED} />
              <BarRow label="weak post — the bar is mostly empty" evaluation={WEAK} />
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
          label="Platform-aware vs not"
          note="only Engagement and Delivery carry the channel note"
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
