import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { NeedsSheet } from '@/components/onboarding/NeedsSheet'
import { OnboardingFrame } from '@/components/onboarding/OnboardingFrame'
import {
  ONBOARDING_STAGES,
  ONBOARDING_STEPS,
  STAGE_OF,
  type OnboardingRole,
  type OnboardingStage,
  type OnboardingStep,
} from '@/components/onboarding/flow'
import { needsFrom, type NeedId } from '@/components/onboarding/needs'
import {
  AccountsStep,
  type ConnectedAccount,
} from '@/components/onboarding/steps/AccountsStep'
import { BrandStep } from '@/components/onboarding/steps/BrandStep'
import {
  CampaignStep,
  type OnboardingBrief,
} from '@/components/onboarding/steps/CampaignStep'
import {
  PLAN_STEPS,
  PlanningStep,
  type PlannedPost,
} from '@/components/onboarding/steps/PlanningStep'
import {
  ANSWERS_ID,
  SourcesStep,
  type OnboardingSource,
  type SourceStatus,
} from '@/components/onboarding/steps/SourcesStep'
import { YouStep } from '@/components/onboarding/steps/YouStep'
import { cn } from '@/lib'
import { PLATFORMS, getPlatformByZernioId } from '@/lib/platformDictionary'
import type { DistillRun } from '@/types/brandDistill'
import {
  BRIEF,
  CAMPAIGN_TYPES,
  CLIENT,
  FILES,
  PLANNED,
  PROPOSAL,
  STARTER_QUESTIONS,
  baseRun,
  runSources,
} from './-fixtures'

const HANDLES: Record<string, string> = {
  instagram: '@hausaurelia',
  facebook: 'Haus Aurelia Weggis',
  linkedin: 'Haus Aurelia',
}

/** The platforms a hotel would plausibly have connected in the workspace. */
const OFFERED = ['instagram', 'facebook', 'linkedin', 'tiktok', 'pinterest']
  .map((id) => PLATFORMS.find((p) => p.zernioId === id))
  .filter((p) => p !== undefined)

const LIT: Partial<Record<OnboardingStep, NeedId[]>> = {
  sources: ['apart', 'voice', 'audience', 'onlyThey', 'never'],
  brand: ['apart', 'voice', 'audience', 'onlyThey', 'never'],
  accounts: ['channels'],
}

/** How long one source takes to read — about a minute, as the copy says. */
const READ_MS = 60_000

const at = (s: OnboardingStep) => ONBOARDING_STEPS.indexOf(s)

/**
 * TEMPORARY design harness — the onboarding screens, built from the app's own
 * components, run from fixtures with no API. The read, the connects and the
 * plan are timers standing in for their streams.
 *
 * `?step=` opens a screen directly; `?tools` shows the moderator's bar.
 */
export function OnboardingPreview() {
  const search = useSearch({ from: '/design/onboarding/' })
  const navigate = useNavigate()
  const initial = search.step ?? 'you'
  const jumped = at(initial) > 0

  const [step, setStep] = useState<OnboardingStep>(initial)
  const [reached, setReached] = useState<OnboardingStage>(STAGE_OF[initial])
  const [role, setRole] = useState<OnboardingRole | null>(
    jumped ? 'client' : null,
  )
  const [name, setName] = useState(jumped ? CLIENT.name : '')
  const [nameFrom, setNameFrom] = useState<string | null>(null)
  const [sources, setSources] = useState<OnboardingSource[]>(
    jumped
      ? [{ kind: 'website', id: 'web', url: CLIENT.site, status: 'read' }]
      : [],
  )
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answersStatus, setAnswersStatus] = useState<SourceStatus | null>(null)
  const [run, setRun] = useState<DistillRun | null>(
    at(initial) > at('sources')
      ? { ...baseRun(runSources(false)), status: 'ready', proposal: PROPOSAL }
      : null,
  )
  const [connected, setConnected] = useState<ConnectedAccount[]>(
    at(initial) > at('accounts')
      ? [
          { platform: 'instagram', handle: HANDLES.instagram },
          { platform: 'facebook', handle: HANDLES.facebook },
        ]
      : [],
  )
  const [connecting, setConnecting] = useState<string | null>(null)
  const [brief, setBrief] = useState<OnboardingBrief>({
    ...BRIEF,
    platforms: at(initial) > at('accounts') ? ['instagram', 'facebook'] : [],
  })
  const [plan, setPlan] = useState<{
    stepIndex: number
    posts: PlannedPost[]
    done: boolean
  }>({ stepIndex: 0, posts: [], done: false })

  const timers = useRef<number[]>([])
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  // One timer per thing being read, so a remove or a stop can cancel it.
  const reads = useRef(new Map<string, number>())
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      reads.current.forEach(clearTimeout)
    },
    [],
  )

  const go = (next: OnboardingStep) => {
    setStep(next)
    const stage = STAGE_OF[next]
    if (ONBOARDING_STAGES.indexOf(stage) > ONBOARDING_STAGES.indexOf(reached))
      setReached(stage)
    window.scrollTo({ top: 0 })
  }

  // ---- Reading: each source from the moment it is added, ~a minute. -----
  const setStatus = (id: string, status: SourceStatus) =>
    id === ANSWERS_ID
      ? setAnswersStatus(status)
      : setSources((all) =>
          all.map((s) => (s.id === id ? { ...s, status } : s)),
        )
  const cancelRead = (id: string) => {
    clearTimeout(reads.current.get(id))
    reads.current.delete(id)
  }
  const beginRead = (id: string) => {
    cancelRead(id)
    setStatus(id, 'reading')
    reads.current.set(
      id,
      window.setTimeout(() => {
        reads.current.delete(id)
        setStatus(id, 'read')
      }, READ_MS),
    )
  }
  const finishReads = () => {
    reads.current.forEach((timer, id) => {
      clearTimeout(timer)
      setStatus(id, 'read')
    })
    reads.current.clear()
  }
  const stopReads = () => {
    reads.current.forEach((timer, id) => {
      clearTimeout(timer)
      setStatus(id, 'stopped')
    })
    reads.current.clear()
    setSources((all) =>
      all.map((s) =>
        s.status === 'uploading' ? { ...s, status: 'stopped' } : s,
      ),
    )
    go('accounts')
  }

  // ---- The review: everything is read, so only the composing is left. ----
  const startRead = () => {
    const withDocs = sources.some(
      (s) => s.kind === 'document' && s.status === 'read',
    )
    const list = runSources(withDocs).map((s) => ({
      ...s,
      status: 'ready' as const,
    }))
    setRun({ ...baseRun(list), status: 'composing' })
    if (!name.trim()) {
      setName(CLIENT.name)
      setNameFrom(CLIENT.site)
    }
    go('brand')
    later(2400, () =>
      setRun((r) => (r ? { ...r, status: 'ready', proposal: PROPOSAL } : r)),
    )
  }

  // ---- Documents: one file per click, uploading for a beat, then read. ----
  const chooseFile = () => {
    const taken = sources.filter((s) => s.kind === 'document').length
    const file = FILES[taken % FILES.length]
    const id = `doc-${taken}`
    setSources((s) => [
      ...s,
      { kind: 'document', id, ...file, status: 'uploading' },
    ])
    later(1400, () => beginRead(id))
  }

  // ---- Connect: the round trip, faked. -----------------------------------
  const connect = (platform: string) => {
    setConnecting(platform)
    later(1200, () => {
      setConnecting(null)
      setConnected((c) => [
        ...c,
        {
          platform,
          handle:
            HANDLES[platform] ??
            `@${CLIENT.name.replace(/\s/g, '').toLowerCase()}`,
        },
      ])
    })
  }

  // ---- The plan: steps, then posts streaming in. ---------------------------
  const startPlan = () => {
    setPlan({ stepIndex: 0, posts: [], done: false })
    go('planning')
    PLAN_STEPS.forEach((_, i) =>
      later(1100 * i, () => setPlan((p) => ({ ...p, stepIndex: i }))),
    )
    const posts = PLANNED.filter((p) => brief.platforms.includes(p.platform))
    const shown = posts.length > 0 ? posts : PLANNED
    const start = 1100 * (PLAN_STEPS.length - 1)
    shown.forEach((post, i) => {
      later(start + 900 * i, () =>
        setPlan((p) => ({
          ...p,
          posts: [...p.posts, { ...post, writing: true }],
        })),
      )
      later(start + 900 * i + 1300, () =>
        setPlan((p) => ({
          ...p,
          posts: p.posts.map((x) =>
            x.id === post.id ? { ...x, writing: false } : x,
          ),
        })),
      )
    })
    later(start + 900 * shown.length + 1400, () =>
      setPlan((p) => ({ ...p, done: true })),
    )
  }

  const proposal = run?.status === 'ready' ? run.proposal : null
  const needs = needsFrom({ proposal, connected: connected.length })
  const shownName =
    name.trim() || (role === 'own' ? 'your business' : 'your client')
  const site = sources.find((s) => s.kind === 'website')
  const readSite = site && run?.status === 'ready'

  const connectedPlatforms = connected
    .map((c) => getPlatformByZernioId(c.platform))
    .filter((p) => p !== undefined)

  return (
    <>
      <OnboardingFrame
        step={step}
        reached={reached}
        onStage={(stage) =>
          go(ONBOARDING_STEPS.find((s) => STAGE_OF[s] === stage) ?? 'you')
        }
        onSkip={() => void navigate({ to: '/' })}
        sheet={
          <NeedsSheet
            name={name}
            role={role}
            site={site?.kind === 'website' ? site.url : undefined}
            favicon={readSite ? CLIENT.favicon : undefined}
            needs={needs}
            active={LIT[step]}
            blank={step === 'you'}
          />
        }
      >
        {step === 'you' && (
          <YouStep
            role={role}
            name={name}
            onRole={setRole}
            onName={(n) => {
              setName(n)
              setNameFrom(null)
            }}
            onNext={() => go('sources')}
          />
        )}
        {step === 'sources' && (
          <SourcesStep
            name={shownName}
            sources={sources}
            questions={STARTER_QUESTIONS}
            answers={answers}
            answersStatus={answersStatus}
            onAdd={(s) => {
              setSources((all) => [...all, { ...s, status: 'reading' }])
              beginRead(s.id)
            }}
            onRemove={(id) => {
              cancelRead(id)
              setSources((all) => all.filter((s) => s.id !== id))
            }}
            onRetry={beginRead}
            onChooseFiles={chooseFile}
            onAnswers={(a) => {
              setAnswers(a)
              if (Object.values(a).some((x) => x.trim())) beginRead(ANSWERS_ID)
              else {
                cancelRead(ANSWERS_ID)
                setAnswersStatus(null)
              }
            }}
            onLater={() => go('accounts')}
            onBack={() => go('you')}
            onRead={startRead}
            onStop={stopReads}
          />
        )}
        {step === 'brand' && run && (
          <BrandStep
            run={run}
            name={name}
            nameFrom={nameFrom}
            siteName={readSite ? CLIENT.name : undefined}
            onName={(n) => {
              setName(n)
              setNameFrom(n === CLIENT.name && readSite ? CLIENT.site : null)
            }}
            onBack={() => go('sources')}
            onSave={() => go('accounts')}
          />
        )}
        {step === 'accounts' && (
          <AccountsStep
            name={shownName}
            role={role}
            platforms={OFFERED}
            connected={connected}
            connecting={connecting}
            onConnect={connect}
            onBack={() => go('brand')}
            onNext={() => {
              if (brief.platforms.length === 0)
                setBrief((b) => ({
                  ...b,
                  platforms: connected.map((c) => c.platform),
                }))
              go('campaign')
            }}
          />
        )}
        {step === 'campaign' && (
          <CampaignStep
            brief={brief}
            types={CAMPAIGN_TYPES}
            platforms={
              connectedPlatforms.length > 0 ? connectedPlatforms : OFFERED
            }
            onChange={setBrief}
            onBack={() => go('accounts')}
            onPlan={startPlan}
          />
        )}
        {step === 'planning' && (
          <PlanningStep
            campaign={brief.name}
            stepIndex={plan.stepIndex}
            posts={plan.posts}
            done={plan.done}
            onOpen={() => void navigate({ to: '/' })}
          />
        )}
      </OnboardingFrame>

      {search.tools && (
        <div
          className="fixed bottom-3 left-3 flex items-center gap-1 rounded-full bg-primary-foreground px-2 py-1.5 text-xs text-primary shadow-lg"
          style={{ zIndex: 60 }}
        >
          {ONBOARDING_STEPS.map((s) => (
            <a
              key={s}
              href={`/design/onboarding?tools&step=${s}`}
              className={cn(
                'rounded-full px-2.5 py-1 transition-colors',
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-primary/15',
              )}
            >
              {s}
            </a>
          ))}
          {step === 'sources' && (
            <button
              type="button"
              onClick={finishReads}
              className="ml-1 rounded-full px-2.5 py-1 transition-colors hover:bg-primary/15"
            >
              finish reads
            </button>
          )}
        </div>
      )}
    </>
  )
}
