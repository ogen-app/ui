import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { NeedsSheet } from '@/components/onboarding/NeedsSheet'
import { OnboardingFrame } from '@/components/onboarding/OnboardingFrame'
import {
  ONBOARDING_STEPS,
  STAGE_OF,
  type OnboardingRole,
  type OnboardingStep,
} from '@/components/onboarding/flow'
import { needsFrom, type NeedId } from '@/components/onboarding/needs'
import { AccountsStep } from '@/components/onboarding/steps/AccountsStep'
import { BrandStep } from '@/components/onboarding/steps/BrandStep'
import {
  SourcesStep,
  type OnboardingSource,
  type SourceInput,
  type SourceStatus,
} from '@/components/onboarding/steps/SourcesStep'
import { YouStep } from '@/components/onboarding/steps/YouStep'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import {
  DISTILL_LIST_KEY,
  distillRunKey,
  refusalOf,
  useCommitDistill,
  useStarterQuestions,
} from '@/hooks/useBrandDistill'
import { ASSET_LIST_KEY } from '@/hooks/useContent'
import { invalidateEntitlements } from '@/hooks/useEntitlements'
import { useOnboarding, useSaveOnboarding } from '@/hooks/useOnboarding'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { useUpdateWorkspace, useWorkspace } from '@/hooks/useWorkspaces'
import { useCreateConnectLink, useZernioAccounts } from '@/hooks/useZernio'
import {
  buildCommit,
  commitIsEmpty,
  isRunOpen,
  resumableRun,
  siteHost,
} from '@/lib/brandDistill'
import { filledAnswers, questionText } from '@/lib/brandDistillCopy'
import { denialReason } from '@/lib/queryClient'
import {
  getDistillRun,
  listDistillRuns,
  requestDistill,
} from '@/services/api/brandDistill'
import { getAsset } from '@/services/api/content'
import { ApiError } from '@/services/api/errors'
import type { OnboardingState } from '@/services/api/onboarding'
import { uploadAssetFile } from '@/services/api/uploads'
import {
  useBrandDistillStore,
  useDistillReview,
} from '@/stores/brandDistillStore'
import { toast } from '@/stores/toastStore'
import type { Asset } from '@/types/content'
import type { DistillRequest, DistillRun } from '@/types/brandDistill'
import type { Workspace } from '@/types/workspace'

/** Which needs on the sheet each step is about. */
const LIT: Partial<Record<OnboardingStep, NeedId[]>> = {
  sources: ['apart', 'voice', 'audience', 'onlyThey', 'never'],
  brand: ['apart', 'voice', 'audience', 'onlyThey', 'never'],
  accounts: ['channels'],
}

/** How often an uploaded document's ingest is asked after. */
const INGEST_POLL_MS = 4000
/** How long to wait for an account Zernio just connected to be listed. */
const CONNECTED_WAIT_MS = 30_000

const at = (s: OnboardingStep) => ONBOARDING_STEPS.indexOf(s)

/** A document as setup holds it: the card, and the asset once it exists. */
type Source = OnboardingSource & { assetId?: string }

/**
 * `/onboarding` — setup, against the real API (behind `onboarding`).
 *
 * The same four screens the design harness runs from fixtures; what differs is
 * where each answer goes. Who the workspace is for and the step reached are
 * the workspace's `onboarding` setting, so a reload — or OAuth's round trip —
 * resumes where the person was. The name renames the workspace. Documents
 * upload as brand sources and show their ingest; everything given goes to one
 * brand read on Continue, which the brand step follows and commits. Accounts
 * connect through Zernio, leaving the app and coming back here through the
 * root guard. Finishing or skipping writes the setting and lets go.
 */
export default function OnboardingPage() {
  const onboarding = useOnboarding()
  const workspace = useWorkspace()

  if (!onboarding.data || !workspace) {
    return (
      <PageContainer variant="fullscreen" className="bg-secondary">
        <PageLoader />
      </PageContainer>
    )
  }
  return <Setup initial={onboarding.data} workspace={workspace} />
}

function Setup({
  initial,
  workspace,
}: {
  initial: OnboardingState
  workspace: Workspace
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/onboarding/' })
  const save = useSaveOnboarding()
  const rename = useUpdateWorkspace(workspace.id)

  // A brand step with no read to show (one never started) opens on sources.
  const firstStep =
    initial.step === 'brand' && !initial.runId ? 'sources' : initial.step
  const [step, setStep] = useState<OnboardingStep>(firstStep)
  const [reached, setReached] = useState<OnboardingStep>(initial.reached)
  const [role, setRole] = useState<OnboardingRole | null>(initial.role)
  const [runId, setRunId] = useState<string | null>(initial.runId)
  // Past the first screen, the workspace's name is the name.
  const [name, setName] = useState(firstStep === 'you' ? '' : workspace.name)

  const persist = (patch: Partial<Omit<OnboardingState, 'updatedAt'>>) =>
    save.mutate({
      status: 'pending',
      step,
      reached,
      role,
      runId,
      ...patch,
    })

  const go = (next: OnboardingStep, patch: { runId?: string | null } = {}) => {
    const furthest = at(next) > at(reached) ? next : reached
    setStep(next)
    setReached(furthest)
    persist({ step: next, reached: furthest, ...patch })
    window.scrollTo({ top: 0 })
  }

  /** The name as the workspace should have it — typed, or as it was. */
  const renameIfChanged = () => {
    const typed = name.trim()
    if (typed && typed !== workspace.name) rename.mutate({ name: typed })
  }

  const finish = async (status: 'done' | 'skipped') => {
    try {
      await save.mutateAsync({ status, step, reached, role, runId })
    } catch {
      // The cache already says so for this tab; a reload would ask again.
    }
    void navigate({ to: status === 'done' ? '/campaigns' : '/' })
  }

  // ---- The brand read ------------------------------------------------------
  const run = useQuery({
    queryKey: distillRunKey(runId ?? ''),
    queryFn: () => getDistillRun(runId as string),
    enabled: runId !== null,
    refetchInterval: (query) =>
      query.state.data && isRunOpen(query.state.data.status) ? 5000 : false,
  })

  // Answering the read's gap questions makes a child run; follow it there,
  // carrying the review, as Foundation's read page does.
  const carryReview = useBrandDistillStore((s) => s.carryReview)
  const child = run.data?.status === 'superseded' ? run.data.childRunId : null
  useEffect(() => {
    if (!child || !runId) return
    carryReview(runId, child)
    setRunId(child)
    save.mutate({ status: 'pending', step, reached, role, runId: child })
    // Once per child; the rest is the state it was found in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child])

  const proposal = run.data?.proposal ?? null

  // ---- Accounts ------------------------------------------------------------
  const accounts = useZernioAccounts()
  const connected = (accounts.data?.accounts ?? [])
    .filter((a) => a.isActive)
    .map((a) => ({ platform: a.platform, handle: a.displayName || a.username }))

  const needs = needsFrom({ proposal, connected: connected.length })
  // Unnamed, a business is the workspace's own name and a client is "your
  // client" — the workspace's name came from signup, and is the agency's.
  const shownName =
    name.trim() ||
    (role === 'own' ? workspace.name : t('onboarding.sheet.unnamedClient'))
  const refreshAccounts = accounts.refetch
  const clearReturn = useCallback(
    () => void navigate({ to: '/onboarding', search: {}, replace: true }),
    [navigate],
  )

  return (
    <OnboardingFrame
      step={step}
      reached={STAGE_OF[reached]}
      onStage={(stage) => {
        const target =
          ONBOARDING_STEPS.find((s) => STAGE_OF[s] === stage) ?? 'you'
        // Passed over without a read, the brand has nothing to show; its
        // stage opens what would have started one.
        go(target === 'brand' && !runId ? 'sources' : target)
      }}
      onSkip={() => void finish('skipped')}
      sheet={
        <NeedsSheet
          name={name.trim() || (role === 'own' ? workspace.name : '')}
          role={role}
          site={run.data?.website ? siteHost(run.data.website.url) : undefined}
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
          onName={setName}
          onNext={() => {
            renameIfChanged()
            go('sources')
          }}
        />
      )}
      {step === 'sources' && (
        <Sources
          name={shownName}
          onBack={() => go('you')}
          onLater={() => go('accounts')}
          onStarted={(id) => {
            setRunId(id)
            go('brand', { runId: id })
          }}
        />
      )}
      {step === 'brand' && runId && run.data && (
        <Brand
          run={run.data}
          name={name}
          onName={setName}
          onBack={() => go('sources')}
          onDone={() => {
            renameIfChanged()
            go('accounts')
          }}
        />
      )}
      {step === 'brand' && runId && !run.data && <PageLoader />}
      {step === 'accounts' && (
        <Accounts
          name={shownName}
          role={role}
          connected={connected}
          justConnected={search.connected}
          connectError={search.connect_error}
          onRefresh={refreshAccounts}
          onBack={() => go(runId ? 'brand' : 'sources')}
          onFinish={() => void finish('done')}
          onClearReturn={clearReturn}
        />
      )}
    </OnboardingFrame>
  )
}

// ---------------------------------------------------------------------------
// Sources

const DOC_TYPE: Record<string, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOC',
  md: 'MD',
  markdown: 'MD',
  txt: 'MD',
}

/** An ingest's status, as the card says it. */
function ingestStatus(asset: Asset | undefined): SourceStatus {
  if (!asset) return 'reading'
  if (asset.status === 'ready' || asset.status === 'partial') return 'read'
  if (asset.status === 'failed') return 'failed'
  return 'reading'
}

function Sources({
  name,
  onBack,
  onLater,
  onStarted,
}: {
  name: string
  onBack: () => void
  onLater: () => void
  onStarted: (runId: string) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const questions = useStarterQuestions()
  const [sources, setSources] = useState<Source[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | undefined>()
  const fileInput = useRef<HTMLInputElement>(null)

  const patch = (id: string, change: Partial<Source>) =>
    setSources((all) =>
      all.map((s) => (s.id === id ? ({ ...s, ...change } as Source) : s)),
    )

  // Each uploaded document is asked after until its ingest settles.
  const ingests = useQueries({
    queries: sources
      .filter((s) => s.assetId)
      .map((s) => ({
        queryKey: ['onboarding', 'ingest', s.assetId],
        queryFn: () => getAsset(s.assetId as string),
        refetchInterval: (query: { state: { data?: Asset } }) =>
          ingestStatus(query.state.data) === 'reading' ? INGEST_POLL_MS : false,
      })),
  })
  const assetOf = new Map(
    ingests.flatMap((q) => (q.data ? [[q.data.id, q.data] as const] : [])),
  )
  const shown: OnboardingSource[] = sources.map((s) => {
    if (!s.assetId) return s
    const asset = assetOf.get(s.assetId)
    const pages = asset?.file?.page_count ?? undefined
    return s.kind === 'document'
      ? { ...s, status: ingestStatus(asset), pages: pages || undefined }
      : s
  })

  const upload = (file: File) => {
    const id = `doc-${crypto.randomUUID()}`
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    setSources((all) => [
      ...all,
      {
        kind: 'document',
        id,
        name: file.name,
        type: DOC_TYPE[ext] ?? 'MD',
        status: 'uploading',
      },
    ])
    uploadAssetFile(file, { purpose: 'brand_source' }).then(
      (result) => {
        if (result.status === 'created' && result.asset_id) {
          patch(id, { assetId: result.asset_id, status: 'reading' })
          void qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
          invalidateEntitlements(qc)
        } else patch(id, { status: 'failed' })
      },
      () => patch(id, { status: 'failed' }),
    )
  }

  const start = useMutation({
    mutationFn: (request: DistillRequest) => requestDistill(request),
    meta: { errorToast: false },
    onMutate: () => setError(undefined),
    onSuccess: (run: DistillRun) => {
      qc.setQueryData(distillRunKey(run.id), run)
      void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
      invalidateEntitlements(qc)
      onStarted(run.id)
    },
    onError: async (err) => {
      // One read per workspace: one already open is the one to follow.
      if (err instanceof ApiError && err.code === 'distill_in_progress') {
        try {
          const open = resumableRun(await listDistillRuns())
          if (open) {
            qc.setQueryData(distillRunKey(open.id), open)
            onStarted(open.id)
            return
          }
        } catch {
          // Said below.
        }
      }
      if (err instanceof ApiError && err.code === 'entitlement_exceeded') {
        toast.error(err.message, { description: denialReason(err) })
      }
      const refusal = refusalOf(err) ?? 'failed'
      setError(t(`brand.distill.refusal.${refusal}`))
    },
  })

  const read = () => {
    const website = sources.find((s) => s.kind === 'website')
    const assetIds = shown
      .filter((s) => s.kind === 'document' && s.status !== 'failed')
      .flatMap((s) => {
        const assetId = sources.find((x) => x.id === s.id)?.assetId
        return assetId ? [assetId] : []
      })
    const filled = filledAnswers(t, questions.data ?? [], answers)
    if (!website && assetIds.length === 0 && filled.length === 0) {
      onLater()
      return
    }
    start.mutate({
      websiteUrl:
        website?.kind === 'website' ? `https://${website.url}` : undefined,
      assetIds: assetIds.length ? assetIds : undefined,
      answers: filled.length ? filled : undefined,
    })
  }

  const answered = Object.values(answers).some((a) => a.trim())

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept=".pdf,.doc,.docx,.md,.markdown,.txt"
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach(upload)
          e.target.value = ''
        }}
      />
      <SourcesStep
        name={name}
        sources={shown}
        questions={(questions.data ?? []).map((q) => ({
          id: q.id,
          text: questionText(t, q),
        }))}
        answers={answers}
        answersStatus={answered ? 'queued' : null}
        readsOnAdd={false}
        starting={start.isPending}
        error={error}
        onAdd={(s: SourceInput) =>
          setSources((all) => [...all, { ...s, status: 'queued' }])
        }
        // The upload stays in Assets, tagged as a brand source; removing it
        // here only leaves it out of the read.
        onRemove={(id) => setSources((all) => all.filter((s) => s.id !== id))}
        onRetry={() => undefined}
        onChooseFiles={() => fileInput.current?.click()}
        onAnswers={setAnswers}
        onBack={onBack}
        onRead={read}
        onStop={read}
        onLater={onLater}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Brand

function Brand({
  run,
  name,
  onName,
  onBack,
  onDone,
}: {
  run: DistillRun
  name: string
  onName: (name: string) => void
  onBack: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const review = useDistillReview(run.id)
  const forgetReview = useBrandDistillStore((s) => s.forgetReview)
  const commit = useCommitDistill(run.id)

  const save = () => {
    if (run.status !== 'ready' || !run.proposal) {
      onDone()
      return
    }
    const body = buildCommit(run.proposal, review)
    if (commitIsEmpty(body)) {
      onDone()
      return
    }
    commit.mutate(body, {
      onSuccess: () => {
        forgetReview(run.id)
        onDone()
      },
    })
  }

  return (
    <BrandStep
      run={run}
      name={name}
      nameFrom={null}
      onName={onName}
      onBack={onBack}
      onSave={save}
      saving={commit.isPending}
      error={commit.isError ? t('onboarding.brand.saveFailed') : undefined}
    />
  )
}

// ---------------------------------------------------------------------------
// Accounts

function Accounts({
  name,
  role,
  connected,
  justConnected,
  connectError,
  onRefresh,
  onBack,
  onFinish,
  onClearReturn,
}: {
  name: string
  role: OnboardingRole | null
  connected: { platform: string; handle: string }[]
  justConnected?: string
  connectError?: string
  onRefresh: () => unknown
  onBack: () => void
  onFinish: () => void
  onClearReturn: () => void
}) {
  const { t } = useTranslation()
  const views = usePlatformViews()
  const link = useCreateConnectLink()

  // Back from Zernio. The account is listed a few seconds after the redirect,
  // once the sync has run, so ask again until it is — or give up quietly.
  const waiting =
    justConnected !== undefined &&
    !connected.some((a) => a.platform === justConnected)
  useEffect(() => {
    if (!waiting) return
    const poll = window.setInterval(onRefresh, 3000)
    const stop = window.setTimeout(onClearReturn, CONNECTED_WAIT_MS)
    return () => {
      clearInterval(poll)
      clearTimeout(stop)
    }
  }, [waiting, onRefresh, onClearReturn])

  const reported = useRef(false)
  useEffect(() => {
    if (!connectError || reported.current) return
    reported.current = true
    toast.error(t('onboarding.accounts.connectFailed'))
    onClearReturn()
  }, [connectError, onClearReturn, t])

  const connect = (platform: string) => {
    const info = views.find((v) => v.info.zernioId === platform)?.info
    link.mutate(platform, {
      // The whole window goes: Zernio brings it back to Settings, and the
      // root guard brings it on here (see `setupRedirect`).
      onSuccess: (r) => window.location.assign(r.connectUrl),
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'entitlement_exceeded') {
          toast.error(err.message, { description: denialReason(err) })
          return
        }
        toast.error(
          t('onboarding.accounts.linkFailed', {
            platform: info?.name ?? platform,
          }),
        )
      },
    })
  }

  return (
    <AccountsStep
      name={name}
      role={role}
      platforms={views.map((v) => v.info)}
      connected={connected}
      connecting={
        link.isPending || link.isSuccess
          ? link.variables
          : waiting
            ? justConnected
            : null
      }
      onConnect={connect}
      onBack={onBack}
      onFinish={onFinish}
    />
  )
}
