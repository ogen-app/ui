import { useEffect, useMemo, useState } from 'react'
import { AssistantComposer } from '@/components/assistant/AssistantComposer'
import { AssistantPanel } from '@/components/assistant/AssistantPanel'
import { AssistantReply } from '@/components/assistant/AssistantReply'
import { ResultCard } from '@/components/assistant/ResultCard'
import { StarterChips } from '@/components/assistant/StarterChips'
import { ThinkingTimeline } from '@/components/assistant/ThinkingTimeline'
import { ThreadList } from '@/components/assistant/ThreadList'
import { UserMessage } from '@/components/assistant/UserMessage'
import { Logo } from '@/components/Logo'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib'
import { describeTool } from '@/lib/assistantTools'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantStep,
  AssistantThread,
  AssistantTurn,
  ReviewFinding,
} from '@/types/assistant'

/**
 * TEMPORARY design harness — every assistant surface on one page, at the real
 * rail width (`w-120`), filled with representative content. Nothing here is
 * reachable from the app; it exists so the panel can be redesigned and
 * componentised against the full set of states at once.
 *
 * Two kinds of specimen:
 *  - **Live** — the real `AssistantPanel`, driven by a seeded store. Clicking
 *    around it (back arrow → thread list → a thread) is the actual product.
 *  - **Static** — a component rendered directly with fixture props, so states
 *    that can't coexist in one store (streaming, failed, each result card) are
 *    all visible together.
 *
 * Three empty states are reproduced by hand below because they are inline in
 * `AssistantPanel`/`ThreadList` rather than exported — the first thing worth
 * extracting.
 */
export function AssistantDesignHarness() {
  // One monotonic base so every fixture's step timings are plausible relative
  // to each other, and the streaming specimen's clock actually runs.
  const base = useMemo(() => performance.now(), [])
  const fx = useMemo(() => fixtures(base), [base])

  useEffect(() => {
    const { threads, activeThreadId } = useAssistantStore.getState()
    seed(base)
    // Put the real threads back so browsing here doesn't leak into the app.
    return () => useAssistantStore.setState({ threads, activeThreadId })
  }, [base])

  return (
    <div className="min-h-svh bg-background px-8 py-8 text-foreground">
      <Header base={base} />

      <div className="flex flex-wrap items-start gap-x-8 gap-y-10">
        <Specimen label="Panel — live" note="the real thing, seeded store">
          <Frame tall>
            <AssistantPanel onClose={() => undefined} />
          </Frame>
        </Specimen>

        <Specimen label="Panel — thread list" note="store-driven, 6 threads">
          <Frame tall>
            <RailPanel title="AI Assistant" onClose={() => undefined} className="h-full" bodyClassName="flex-1 gap-6">
              <ThreadList />
            </RailPanel>
          </Frame>
        </Specimen>

        <Specimen label="Panel — campaign empty state" note="copy of the inline state">
          <Frame tall>
            <RailPanel
              title="AI Assistant"
              onClose={() => undefined}
              className="h-full"
              bodyClassName="flex-1 gap-6"
              subheader={<Subheader title="Q3 Practitioner Series" />}
              footer={
                <AssistantComposer onSend={() => undefined} placeholder="Ask for a plan or a review..." />
              }
            >
              <div className="flex flex-col gap-5">
                <p className="text-sm text-tertiary-foreground">Ask about this campaign, or start with:</p>
                <StarterChips onPick={() => undefined} />
              </div>
            </RailPanel>
          </Frame>
        </Specimen>

        <Specimen label="Panel — post empty state" note="copy of the inline state">
          <Frame tall>
            <RailPanel
              title="AI Assistant"
              onClose={() => undefined}
              className="h-full"
              bodyClassName="flex-1 gap-6"
              subheader={<Subheader title="Why most AI pilots stall at month four" />}
              footer={<AssistantComposer onSend={() => undefined} placeholder="Ask for a change to this post..." />}
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <Logo variant="mark" className="size-8 text-quinary-foreground" />
                <p className="max-w-64 text-sm text-tertiary-foreground">
                  Ask for a rewrite, a different tone, or to work something in from an attached asset.
                </p>
              </div>
            </RailPanel>
          </Frame>
        </Specimen>

        <Specimen label="Panel — history loading" note="copy of the inline skeleton">
          <Frame>
            <RailPanel title="AI Assistant" onClose={() => undefined} className="h-full" bodyClassName="flex-1 gap-6">
              <div className="flex flex-col gap-3" aria-busy>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </RailPanel>
          </Frame>
        </Specimen>

        <Specimen label="Thread list — empty state" note="copy of the inline state">
          <Frame>
            <RailPanel title="AI Assistant" onClose={() => undefined} className="h-full" bodyClassName="flex-1 gap-6">
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-tertiary-foreground">No conversations yet.</p>
                <p className="max-w-64 text-sm text-quaternary-foreground">
                  Open a campaign or a post to start one — the assistant works on whatever you're in.
                </p>
              </div>
            </RailPanel>
          </Frame>
        </Specimen>

        <Specimen label="User messages" note="short · long · multiline">
          <Body>
            <UserMessage content="Is the brief consistent?" />
            <UserMessage content="Improve the campaign brief — make the tone more technical and benchmark-driven, and keep the British English and the no-second-person rule from the current tone guidelines." />
            <UserMessage content={'Two things:\n\n1. move the end date\n2. then redistribute the drafts'} />
          </Body>
        </Specimen>

        <Specimen label="Reply — prose, lists, bold" note="the markup subset">
          <Body>
            <AssistantReply turn={fx.overview} />
          </Body>
        </Specimen>

        <Specimen label="Reply — streaming" note="live clock, timeline open">
          <Body>
            <UserMessage content="Generate a content plan for this campaign." />
            <AssistantReply turn={fx.streaming} />
            <Logo variant="mark" loading className="size-8 shrink-0 text-accent" />
          </Body>
        </Specimen>

        <Specimen label="Reply — failed / cancelled">
          <Body>
            <AssistantReply turn={fx.failed} />
            <AssistantReply turn={fx.cancelled} />
          </Body>
        </Specimen>

        <Specimen label="Reply — post turn" note="action footer + version note">
          <Body>
            <UserMessage content="Tighten the opening and drop the second-person address." />
            <AssistantReply turn={fx.postEdited} />
            <AssistantReply turn={fx.postDeclined} />
          </Body>
        </Specimen>

        <Specimen label="Reply — multi-tool turn" note="review + write, two cards">
          <Body>
            <UserMessage content="Improve the brief." />
            <AssistantReply turn={fx.reviewThenWrite} />
          </Body>
        </Specimen>

        <Specimen label="Reply — restored from history" note="no details, footer fallback">
          <Body>
            <AssistantReply turn={fx.fromHistory} />
          </Body>
        </Specimen>

        <Specimen label="Result cards — reviews">
          <Body>
            <ResultCard details={{ briefReview: { consistent: true, findings: [] } }} />
            <ResultCard details={{ briefReview: { consistent: false, findings: BRIEF_FINDINGS } }} />
            <ResultCard details={{ postsReview: { checked: 16, total: 16, capped: false, findings: [] } }} />
            <ResultCard
              details={{ postsReview: { checked: 20, total: 34, capped: true, findings: POST_FINDINGS } }}
            />
          </Body>
        </Specimen>

        <Specimen label="Result cards — writes">
          <Body>
            <ResultCard details={{ contentPlan: { postCount: 12, warnings: [] } }} />
            <ResultCard
              details={{
                generatedPosts: {
                  postCount: 3,
                  warnings: [
                    'Two of the requested dates fall outside the campaign range and were clamped to the last phase.',
                    'No Threads account is connected, so the drafts stay unassigned.',
                  ],
                },
              }}
            />
            <ResultCard details={{ generatedPosts: { postCount: 0, warnings: ['Every slot in the phase is already filled.'] } }} />
            <ResultCard details={{ dates: { startDate: '2026-08-03', endDate: '2026-10-30', postsOutsideRange: 0 } }} />
            <ResultCard details={{ dates: { startDate: '2026-08-03', endDate: '2026-09-14', postsOutsideRange: 4 } }} />
            <ResultCard details={{ redistribute: { postsUpdated: 11, phaseCount: 3 } }} />
            <ResultCard details={{ brief: { applied: true } }} />
            <ResultCard details={{ brief: { applied: false } }} />
          </Body>
        </Specimen>

        <Specimen label="Thinking timeline" note="running · settled · long">
          <Body>
            <ThinkingTimeline steps={fx.runningSteps} streaming startedAt={base} endedAt={null} />
            <ThinkingTimeline steps={fx.settledSteps} streaming={false} startedAt={0} endedAt={58400} />
            <ThinkingTimeline steps={fx.longSteps} streaming={false} startedAt={0} endedAt={143900} />
            <p className="text-xs text-tertiary-foreground">
              The settled ones collapse — click to open. The first has no disclosure caret by design.
            </p>
          </Body>
        </Specimen>

        <Specimen label="Composer" note="click the field to see it open · running · disabled">
          <Body>
            <ComposerDemo />
            <p className="text-xs text-tertiary-foreground">
              At rest: suggestions + attach on the left, fill under the field. Focused: the actions fold into
              the chevron and the fill slides out to 8px of the container edge.
            </p>
            <PrefillDemo />
            <AssistantComposer onSend={() => undefined} running onCancel={() => undefined} />
            <AssistantComposer onSend={() => undefined} disabled placeholder="Disabled" />
          </Body>
        </Specimen>

        <Specimen label="Starter chips" note="enabled · disabled while running">
          <Body>
            <StarterChips onPick={() => undefined} />
            <div className="h-px bg-border" />
            <StarterChips onPick={() => undefined} disabled />
          </Body>
        </Specimen>
      </div>
    </div>
  )
}

function Header({ base }: { base: number }) {
  return (
    <header className="mb-8 flex flex-col gap-3">
      <h1 className="font-display text-2xl font-medium tracking-tight">Assistant — design harness</h1>
      <p className="max-w-200 text-sm text-tertiary-foreground">
        Temporary page at <code className="text-foreground">/design/assistant</code>. Live specimens share one seeded
        store, so selecting a thread in one panel moves the other. Two of the seeded threads are empty — open them
        from the list to see the empty states in situ.
      </p>
      <div className="flex gap-2">
        <HarnessButton onClick={() => seed(base)}>Reseed threads</HarnessButton>
        <HarnessButton onClick={() => useAssistantStore.setState({ threads: {}, activeThreadId: null })}>
          Clear threads
        </HarnessButton>
      </div>
    </header>
  )
}

function HarnessButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border border-border px-3 py-1 text-xs text-secondary-foreground hover:border-foreground hover:text-foreground cursor-pointer"
    >
      {children}
    </button>
  )
}

/** The composer as a campaign thread wires it: starters behind the lightbulb. */
function ComposerDemo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      {open && <StarterChips onPick={() => setOpen(false)} />}
      <AssistantComposer
        onSend={() => undefined}
        placeholder="Ask for a plan or a review..."
        onToggleSuggestions={() => setOpen((o) => !o)}
        suggestionsOpen={open}
      />
    </div>
  )
}

/** A prefill only fires on a new token, so the harness needs a trigger. */
function PrefillDemo() {
  const [prefill, setPrefill] = useState<{ text: string; token: number }>()
  return (
    <div className="flex flex-col gap-2">
      <HarnessButton
        onClick={() =>
          setPrefill((p) => ({
            text: 'Improve the campaign brief — make the tone more technical and benchmark-driven.',
            token: (p?.token ?? 0) + 1,
          }))
        }
      >
        Fire a prefill
      </HarnessButton>
      <AssistantComposer onSend={() => undefined} prefill={prefill} />
    </div>
  )
}

function Specimen({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex w-120 shrink-0 flex-col gap-2">
      <header className="flex items-baseline gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">{label}</h2>
        {note && <p className="text-[11px] text-quaternary-foreground">{note}</p>}
      </header>
      {children}
    </section>
  )
}

/** The rail's own chrome: the width, the background, the left hairline. */
function Frame({ children, tall = false }: { children: React.ReactNode; tall?: boolean }) {
  return (
    <div className={cn('flex w-full flex-row border border-border bg-primary', tall ? 'h-[46rem]' : 'h-88')}>
      <div className="w-px self-stretch bg-border" aria-hidden />
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Matches `RailPanel`'s body padding, so fragments sit where they really sit. */
function Body({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 border border-border bg-primary px-6 py-6">{children}</div>
  )
}

function Subheader({ title }: { title: string }) {
  return (
    <span className="mt-2 flex w-full items-center gap-2 text-xs text-tertiary-foreground">
      <span className="truncate">← {title}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ fixtures */

const BRIEF_FINDINGS: ReviewFinding[] = [
  {
    severity: 'high',
    label: 'Goal alignment',
    issue:
      'The stated goal is first-touch lead generation, but every key message is written for customers who have already bought.',
    suggestion: 'Rewrite the key messages around the opening objection: "we already have a vendor for this".',
  },
  {
    severity: 'medium',
    label: 'Tone guidelines',
    issue:
      'The tone guidelines forbid second-person address, yet three of the four key messages open with "you".',
    suggestion: 'Recast them as observations about the pattern rather than instructions to the reader.',
  },
  {
    severity: 'low',
    label: 'Target persona',
    issue:
      'The persona is founders and COOs at 10–100-employee businesses; the description assumes an in-house data team.',
    suggestion: 'Name the real constraint: no dedicated data team, one technical founder, no budget for a pilot.',
  },
  {
    issue: 'Older rows arrive with neither a severity nor a label — the finding still has to render.',
  },
]

const POST_FINDINGS: ReviewFinding[] = [
  {
    severity: 'high',
    label: 'The five-day integration myth',
    issue: 'Opens with a vendor-style promise the brief explicitly rules out.',
    suggestion: 'Lead with the measured number from the case study instead.',
  },
  {
    severity: 'medium',
    label: 'What we learned shipping to Cambridge',
    issue: 'Uses American spelling throughout; the brief specifies British English.',
  },
]

function step(
  id: string,
  kind: AssistantStep['kind'],
  label: string,
  startedAt: number,
  ms: number | null,
  detail?: string,
): AssistantStep {
  return { id, kind, label, startedAt, endedAt: ms === null ? null : startedAt + ms, detail }
}

function tool(
  id: string,
  name: string,
  startedAt: number,
  ms: number | null,
  input?: Record<string, unknown>,
  detail?: string,
): AssistantStep {
  return {
    id,
    kind: 'tool',
    tool: name,
    input,
    ref: id,
    label: describeTool(name, input, ms === null ? 'running' : 'done'),
    startedAt,
    endedAt: ms === null ? null : startedAt + ms,
    detail,
  }
}

const OVERVIEW_TEXT = `This campaign runs **12 weeks across three phases** and currently holds 16 posts, 11 of them still drafts.

The distribution is uneven:

- **Activate** (weeks 1–4) — 9 posts, all scheduled
- **Deepen** (weeks 5–8) — 5 posts, 2 scheduled
- **Sustain** (weeks 9–12) — 2 posts, none scheduled

The tail is the problem. Three quarters of the writing sits in the first third of the timeline, so the campaign goes quiet exactly when the audience it built is warmest. Two ways to close the gap:

1. Redistribute the unpublished drafts across the remaining phases.
2. Generate four more posts for Sustain and leave the earlier phases alone.`

function fixtures(base: number) {
  const overviewSteps = [
    step('plan', 'plan', 'Analyzing the request', 0, 620),
    tool('t1', 'getCampaignOverview', 620, 8),
    tool('t2', 'listCampaignPosts', 628, 41),
    step('compose', 'compose', 'Writing the reply', 669, 3300),
  ]

  const settledSteps = [
    step('plan', 'plan', 'Analyzing the request', 0, 740),
    tool('t1', 'getCampaignBrief', 740, 12),
    tool('t2', 'checkBrief', 752, 31200, undefined, 'scoring findings'),
    tool('t3', 'enrichBrief', 31952, 25100, undefined, 'rewriting tone guidelines'),
    step('compose', 'compose', 'Writing the reply', 57052, 1348),
  ]

  const longSteps = [
    step('plan', 'plan', 'Analyzing the request', 0, 810),
    tool('t1', 'getCampaignBrief', 810, 9),
    tool('t2', 'listCampaignPosts', 819, 55),
    tool('t3', 'runContentPlan', 874, 138900, undefined, '12 generated'),
    step('compose', 'compose', 'Writing the reply', 139774, 4126),
  ]

  const runningSteps = [
    step('plan', 'plan', 'Analyzing the request', base, 680),
    tool('t1', 'getCampaignBrief', base + 680, 11),
    tool('t2', 'runContentPlan', base + 691, null, undefined, '5 generated'),
  ]

  const overview: AssistantTurn = {
    id: 'fx-overview',
    role: 'assistant',
    content: OVERVIEW_TEXT,
    action: 'answered',
    steps: overviewSteps,
    startedAt: 0,
    endedAt: 3969,
    streaming: false,
  }

  const streaming: AssistantTurn = {
    id: 'fx-streaming',
    role: 'assistant',
    content:
      'Working through the phases now. The plan keeps the practitioner voice from the brief and front-loads the',
    steps: runningSteps,
    startedAt: base,
    endedAt: null,
    streaming: true,
  }

  const failed: AssistantTurn = {
    id: 'fx-failed',
    role: 'assistant',
    content: 'The assistant failed: the model timed out after 120s. Nothing was written to the campaign.',
    failed: true,
    steps: [step('plan', 'plan', 'Analyzing the request', 0, 640), tool('t1', 'runContentPlan', 640, 119400)],
    startedAt: 0,
    endedAt: 120040,
    streaming: false,
  }

  const cancelled: AssistantTurn = {
    id: 'fx-cancelled',
    role: 'assistant',
    content: 'Stopped. Anything already written to the campaign was kept.',
    cancelled: true,
    steps: [step('plan', 'plan', 'Analyzing the request', 0, 700), tool('t1', 'generatePosts', 700, 18600, { platformId: 'Threads' }, '3 generated')],
    startedAt: 0,
    endedAt: 19300,
    streaming: false,
  }

  const reviewThenWrite: AssistantTurn = {
    id: 'fx-multi',
    role: 'assistant',
    content:
      'I reviewed the brief first and found four inconsistencies, the worst of which is that the key messages address existing customers while the goal is first-touch lead generation.\n\nI have rewritten all four fields and saved them. The British English and the no-second-person rule are preserved; the persona now names the "no in-house data team" constraint explicitly.',
    action: 'brief_reviewed',
    details: {
      briefReview: { consistent: false, findings: BRIEF_FINDINGS },
      brief: { applied: true },
    },
    steps: settledSteps,
    startedAt: 0,
    endedAt: 58400,
    streaming: false,
  }

  const fromHistory: AssistantTurn = {
    id: 'fx-history',
    role: 'assistant',
    content:
      'I redistributed the eleven unpublished drafts so each phase carries roughly a third of the campaign, and left the two published posts where they were.',
    action: 'posts_redistributed',
    streaming: false,
  }

  const postEdited: AssistantTurn = {
    id: 'fx-post-edited',
    role: 'assistant',
    content:
      'Cut the opening to a single claim and rewrote the second paragraph in the third person. The benchmark table is untouched.',
    action: 'edited',
    saveVersion: true,
    versionNote: 'Tightened the opening',
    steps: [
      step('plan', 'plan', 'Analyzing the request', 0, 580),
      tool('t1', 'getCurrentContent', 580, 14),
      step('compose', 'compose', 'Writing the post', 594, 21400),
    ],
    startedAt: 0,
    endedAt: 21994,
    streaming: false,
  }

  const postDeclined: AssistantTurn = {
    id: 'fx-post-declined',
    role: 'assistant',
    content:
      'That asks for a claim the attached case study does not support — it reports a 34% reduction over two quarters, not "overnight". I have left the post alone.',
    action: 'declined',
    steps: [step('plan', 'plan', 'Analyzing the request', 0, 610), tool('t1', 'searchAssetChunks', 610, 2100, { assetId: 'kb-19', query: 'reduction overnight' })],
    startedAt: 0,
    endedAt: 2710,
    streaming: false,
  }

  return {
    overview,
    streaming,
    failed,
    cancelled,
    reviewThenWrite,
    fromHistory,
    postEdited,
    postDeclined,
    runningSteps,
    settledSteps,
    longSteps,
  }
}

/* --------------------------------------------------------------- store seed */

function thread(
  id: string,
  subject: AssistantThread['subject'],
  title: string,
  turns: AssistantTurn[],
  overrides: Partial<AssistantThread> = {},
): AssistantThread {
  return {
    id,
    subject,
    title,
    turns,
    status: 'idle',
    runStartedAt: null,
    unread: false,
    // Always true: a false `loaded` would send the panel to the API.
    loaded: true,
    streamedPosts: [],
    ...overrides,
  }
}

function seed(base: number) {
  const fx = fixtures(base)
  const user = (id: string, content: string): AssistantTurn => ({ id, role: 'user', content })

  const threads: Record<string, AssistantThread> = {
    'campaign:demo': thread(
      'campaign:demo',
      { kind: 'campaign', campaignId: 'demo' },
      'Q3 Practitioner Series',
      [
        user('u1', 'Give me a quick overview of this campaign and how the content is distributed.'),
        fx.overview,
        user('u2', 'Improve the brief.'),
        fx.reviewThenWrite,
        user('u3', 'Redistribute the drafts and unpublished posts across the campaign timeline.'),
        fx.fromHistory,
      ],
    ),
    'campaign:running': thread(
      'campaign:running',
      { kind: 'campaign', campaignId: 'running' },
      'Autumn Product Launch',
      [user('u4', 'Generate a content plan for this campaign.'), fx.streaming],
      { status: 'running', runStartedAt: Date.now() - 42_000 },
    ),
    'post:demo': thread(
      'post:demo',
      { kind: 'post', postId: 'demo', campaignId: 'demo' },
      'Why most AI pilots stall at month four',
      [user('u5', 'Tighten the opening and drop the second-person address.'), fx.postEdited],
      { unread: true },
    ),
    'campaign:failed': thread(
      'campaign:failed',
      { kind: 'campaign', campaignId: 'failed' },
      'Winter Retention Push',
      [user('u6', 'Generate a content plan for this campaign.'), fx.failed],
      { status: 'error' },
    ),
    'campaign:empty': thread('campaign:empty', { kind: 'campaign', campaignId: 'empty' }, 'Untitled campaign', []),
    'post:empty': thread('post:empty', { kind: 'post', postId: 'empty', campaignId: 'demo' }, '', []),
  }

  useAssistantStore.setState({ threads, activeThreadId: 'campaign:demo' })
}
