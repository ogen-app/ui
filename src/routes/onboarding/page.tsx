import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { NeedsSheet } from '@/components/onboarding/NeedsSheet'
import { OnboardingFrame } from '@/components/onboarding/OnboardingFrame'
import {
  ONBOARDING_STEPS,
  STAGE_OF,
  type OnboardingRole,
  type OnboardingStep,
} from '@/components/onboarding/flow'
import {
  needsAdded,
  needsFrom,
  type NeedId,
} from '@/components/onboarding/needs'
import { AccountsStep } from '@/components/onboarding/steps/AccountsStep'
import { BrandStep } from '@/components/onboarding/steps/BrandStep'
import {
  ANSWERS_ID,
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
  siteHost,
} from '@/lib/brandDistill'
import { filledAnswers, questionText } from '@/lib/brandDistillCopy'
import { formatList } from '@/lib/intl'
import { denialReason } from '@/lib/queryClient'
import {
  addDistillRead,
  composeDistill,
  discardDistill,
  getDistillRun,
  openRunOf,
  requestDistill,
  stopDistillRead,
} from '@/services/api/brandDistill'
import { ApiError } from '@/services/api/errors'
import type { OnboardingState } from '@/services/api/onboarding'
import { uploadAssetFile } from '@/services/api/uploads'
import {
  useBrandDistillStore,
  useDistillReview,
} from '@/stores/brandDistillStore'
import { toast } from '@/stores/toastStore'
import type {
  DistillCoverage,
  DistillRead,
  DistillReadRequest,
  DistillRun,
} from '@/types/brandDistill'
import type { Workspace } from '@/types/workspace'

/** Which needs on the sheet each step is about. */
const LIT: Partial<Record<OnboardingStep, NeedId[]>> = {
  sources: ['apart', 'voice', 'audience', 'onlyThey', 'never'],
  brand: ['apart', 'voice', 'audience', 'onlyThey', 'never'],
  accounts: ['channels'],
}

/** How long to wait for an account Zernio just connected to be listed. */
const CONNECTED_WAIT_MS = 30_000

const at = (s: OnboardingStep) => ONBOARDING_STEPS.indexOf(s)

/** A run still taking sources: setup's own, before Continue composes it. */
const isCollecting = (run: DistillRun | undefined) =>
  run?.incremental === true && run.status === 'collecting'

/**
 * `/onboarding` — setup after signup.
 *
 * Who the workspace is for and the step reached are the workspace's own
 * `setup`, so a reload — or OAuth's round trip — resumes where the person
 * was. The name renames the workspace. Each source is read the moment it is
 * added, as a read of one brand read that setup opens and keeps; the sheet
 * moves as each finishes, and Continue composes the brand from all of them,
 * which the brand step follows and commits. Accounts connect through Zernio,
 * which brings the browser back here. Finishing or skipping writes the setup
 * and lets go.
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

  const persist = (patch: Partial<OnboardingState>) =>
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

  const collecting = isCollecting(run.data) ? run.data : undefined
  // A read still taking sources has nothing to review: its step is sources.
  const shown = step === 'brand' && collecting ? 'sources' : step
  const proposal = run.data?.proposal ?? null
  // The site as the website read found it — on the run once composed, on its
  // read before.
  const website =
    run.data?.website ??
    run.data?.reads.find((r) => r.kind === 'website' && r.website)?.website ??
    null

  // The icon's link expires; a failed load asks for the run again, once.
  const refreshedIcon = useRef(false)
  const refetchRun = run.refetch
  const refreshIcon = useCallback(() => {
    if (refreshedIcon.current) return
    refreshedIcon.current = true
    void refetchRun()
  }, [refetchRun])

  // ---- Accounts ------------------------------------------------------------
  const accounts = useZernioAccounts()
  const connected = (accounts.data?.accounts ?? [])
    .filter((a) => a.isActive)
    .map((a) => ({ platform: a.platform, handle: a.displayName || a.username }))

  const needs = needsFrom({
    coverage: proposal?.coverage ?? run.data?.coverage,
    connected: connected.length,
  })
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
      step={shown}
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
          site={website ? siteHost(website.url) : undefined}
          favicon={website?.faviconUrl ?? undefined}
          onFaviconError={refreshIcon}
          needs={needs}
          active={LIT[shown]}
          blank={shown === 'you'}
        />
      }
    >
      {shown === 'you' && (
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
      {shown === 'sources' && (
        <Sources
          name={shownName}
          run={collecting}
          onRun={(id) => {
            setRunId(id)
            persist({ step: 'sources', runId: id })
          }}
          onBack={() => go('you')}
          onLater={() => {
            setRunId(null)
            go('accounts', { runId: null })
          }}
          onComposed={(id) => {
            setRunId(id)
            go('brand', { runId: id })
          }}
        />
      )}
      {shown === 'brand' && runId && run.data && (
        <Brand
          run={run.data}
          name={name}
          siteName={website?.siteName || undefined}
          onName={setName}
          onBack={() => go('sources')}
          onDone={() => {
            renameIfChanged()
            go('accounts')
          }}
        />
      )}
      {shown === 'brand' && runId && !run.data && <PageLoader />}
      {shown === 'accounts' && (
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

/** A source given but not yet a read: a document uploading, a request out. */
type Pending =
  | { kind: 'website'; id: string; url: string; status: SourceStatus }
  | {
      kind: 'document'
      id: string
      name: string
      type: string
      status: SourceStatus
    }

const DOC_TYPE: Record<string, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOC',
  md: 'MD',
  markdown: 'MD',
  txt: 'MD',
}

/** A read's status, as its card says it. */
function readStatus(read: DistillRead): SourceStatus {
  if (read.status === 'ready') return 'read'
  if (read.status === 'failed') return 'readFailed'
  return 'reading'
}

/** "Adds tone of voice and who they talk to" — a read's own coverage. */
function addedText(t: TFunction, coverage: DistillCoverage): string {
  const added = needsAdded(coverage)
  return added.length === 0
    ? t('onboarding.sources.addedNothing')
    : t('onboarding.sources.added', {
        needs: formatList(
          added.map((id) => t(`onboarding.sources.adds.${id}`)),
        ),
      })
}

/** The answers a read was given, as the form holds them. */
function answerValues(read: DistillRead): Record<string, string> {
  return Object.fromEntries(read.answers.map((a) => [a.questionId, a.answer]))
}

/**
 * Nothing to say: a 409 `distill_in_progress` for a read that is not setup's
 * — one started on Foundation, still going, which the brand step follows
 * instead — or an answer that came back after the person left the step.
 */
class NothingToSay extends Error {}

function Sources({
  name,
  run,
  onRun,
  onBack,
  onLater,
  onComposed,
}: {
  name: string
  /** Setup's read, while it still takes sources; none until the first one. */
  run: DistillRun | undefined
  /** A read was opened for setup — the first source given. */
  onRun: (runId: string) => void
  onBack: () => void
  onLater: () => void
  /** The brand is being read from what was given; the brand step follows. */
  onComposed: (runId: string) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const questions = useStarterQuestions()
  const [pending, setPending] = useState<Pending[]>([])
  const [pendingAnswers, setPendingAnswers] = useState<Record<
    string,
    string
  > | null>(null)
  // What the person typed for a website, by read: the read names its site
  // only once the site has been mapped.
  const [typed, setTyped] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | undefined>()
  const [composing, setComposing] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  // Sources taken back before they became reads, by their pending id: an
  // upload lands in Assets unread, a read that lands anyway is stopped.
  const withdrawn = useRef(new Set<string>())
  // The answers being added, by their pending id.
  const answersOp = useRef<string | null>(null)
  // Set once the person has gone on: anything answering after that is not
  // this screen's to adopt or show.
  const left = useRef(false)
  useEffect(() => {
    // Reset on mount too: StrictMode mounts twice in development.
    left.current = false
    return () => {
      left.current = true
    }
  }, [])
  // The read setup is opening, asked for once however many sources arrive
  // together. Forgotten when the run it opened stops taking sources.
  const opening = useRef<Promise<string> | null>(null)
  const runId = run?.id
  useEffect(() => {
    if (!runId) opening.current = null
  }, [runId])

  const reads = (run?.reads ?? []).filter((r) => r.status !== 'discarded')
  const answersRead = reads.find((r) => r.kind === 'answers')

  const patchReads = (
    id: string,
    fn: (reads: DistillRead[]) => DistillRead[],
  ) =>
    qc.setQueryData<DistillRun>(distillRunKey(id), (r) =>
      r ? { ...r, reads: fn(r.reads) } : r,
    )
  const refresh = (id: string) =>
    void qc.invalidateQueries({ queryKey: distillRunKey(id) })
  const settle = (id: string) =>
    setPending((all) => all.filter((p) => p.id !== id))
  const mark = (id: string, status: SourceStatus) =>
    setPending((all) => all.map((p) => (p.id === id ? { ...p, status } : p)))

  /** Goes on from the step; nothing still in flight comes back to it. */
  const leave = (to: () => void) => {
    left.current = true
    to()
  }

  const refuse = (err: unknown) => {
    if (err instanceof NothingToSay) return
    // The plan's refusal is the toast the rest of the app answers one with.
    if (err instanceof ApiError && err.code === 'entitlement_exceeded') {
      toast.error(err.message, { description: denialReason(err) })
    }
    setError(t(`brand.distill.refusal.${refusalOf(err) ?? 'failed'}`))
  }

  const adopt = (opened: DistillRun) => {
    // Opened after the person went on: it would hold the workspace's only
    // slot, and setup has no step left to show it.
    if (left.current) {
      discardDistill(opened.id).catch(() => undefined)
      throw new NothingToSay()
    }
    qc.setQueryData(distillRunKey(opened.id), opened)
    // A 409's run comes without its reads; the run's own read has them.
    refresh(opened.id)
    void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
    invalidateEntitlements(qc)
    onRun(opened.id)
    return opened.id
  }

  /** The read sources are added to — setup's own, opened on the first. */
  const openRun = (): Promise<string> => {
    if (run) return Promise.resolve(run.id)
    opening.current ??= requestDistill({ incremental: true }).then(
      adopt,
      (err: unknown) => {
        const open =
          err instanceof ApiError && err.code === 'distill_in_progress'
            ? openRunOf(err.body)
            : null
        // One read per workspace: one open and taking sources is setup's
        // own, from before a reload; any other is followed where it is.
        if (isCollecting(open ?? undefined)) return adopt(open as DistillRun)
        opening.current = null
        if (open) {
          if (!left.current) {
            qc.setQueryData(distillRunKey(open.id), open)
            leave(() => onComposed(open.id))
          }
          throw new NothingToSay()
        }
        throw err
      },
    )
    return opening.current
  }

  /**
   * Reads one more source, at once and on its own. `op` is its pending id: a
   * source taken back, or left behind, before its read lands is stopped on
   * the run it landed in rather than shown.
   */
  const addRead = async (
    source: DistillReadRequest,
    op: string,
    site?: string,
  ) => {
    setError(undefined)
    const id = await openRun()
    const read = await addDistillRead(id, source)
    if (withdrawn.current.has(op) || left.current) {
      stopDistillRead(id, read.id).catch(() => undefined)
      return
    }
    if (site) setTyped((all) => ({ ...all, [read.id]: site }))
    patchReads(id, (all) => [...all.filter((r) => r.id !== read.id), read])
    refresh(id)
  }

  const addWebsite = (url: string) => {
    const id = `web-${crypto.randomUUID()}`
    setPending((all) => [
      ...all,
      { kind: 'website', id, url, status: 'reading' },
    ])
    addRead({ websiteUrl: `https://${url}` }, id, url).then(
      () => settle(id),
      (err: unknown) => {
        settle(id)
        refuse(err)
      },
    )
  }

  const upload = (file: File) => {
    setError(undefined)
    const id = `doc-${crypto.randomUUID()}`
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    setPending((all) => [
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
        if (result.status !== 'created' || !result.asset_id) {
          mark(id, 'failed')
          return
        }
        void qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
        invalidateEntitlements(qc)
        if (withdrawn.current.has(id) || left.current) return
        // Read as soon as it lands; the read waits out the ingest.
        mark(id, 'reading')
        addRead({ assetId: result.asset_id }, id).then(
          () => settle(id),
          (err: unknown) => {
            settle(id)
            refuse(err)
          },
        )
      },
      () => mark(id, 'failed'),
    )
  }

  const addAnswers = (values: Record<string, string>) => {
    const filled = filledAnswers(t, questions.data ?? [], values)
    if (filled.length === 0) return
    const op = `answers-${crypto.randomUUID()}`
    answersOp.current = op
    setPendingAnswers(values)
    const done = () => {
      if (answersOp.current !== op) return
      answersOp.current = null
      setPendingAnswers(null)
    }
    addRead({ answers: filled }, op).then(done, (err: unknown) => {
      done()
      refuse(err)
    })
  }

  /** Takes back answers still being added; their read is stopped as it lands. */
  const withdrawAnswers = () => {
    if (answersOp.current) withdrawn.current.add(answersOp.current)
    answersOp.current = null
    setPendingAnswers(null)
  }

  /** Stops a read still going, or takes a finished one back out. */
  const removeRead = async (readId: string) => {
    if (!run) return
    const id = run.id
    setError(undefined)
    patchReads(id, (all) => all.filter((r) => r.id !== readId))
    try {
      await stopDistillRead(id, readId)
    } finally {
      refresh(id)
    }
  }

  const remove = (id: string) => {
    if (pending.some((p) => p.id === id)) {
      // The upload stays in Assets, tagged as a brand source; taking it back
      // here only leaves it unread.
      withdrawn.current.add(id)
      settle(id)
      return
    }
    removeRead(id).catch(refuse)
  }

  /** A source that couldn't be read, read again — stopped, and added anew. */
  const retry = (readId: string) => {
    const read = reads.find((r) => r.id === readId)
    const url = read?.website?.url ?? typed[readId]
    const source: DistillReadRequest | null =
      read?.kind === 'website' && url
        ? { websiteUrl: url.startsWith('http') ? url : `https://${url}` }
        : read?.kind === 'asset' && read.sources[0]
          ? { assetId: read.sources[0].assetId }
          : read?.kind === 'answers'
            ? { answers: read.answers }
            : null
    if (!source) return
    removeRead(readId)
      .then(() => addRead(source, `retry-${readId}`, typed[readId]))
      .catch(refuse)
  }

  /** On to the brand: composed from every finished read. */
  const compose = async () => {
    if (!run) {
      leave(onLater)
      return
    }
    setError(undefined)
    setComposing(true)
    try {
      const composed = await composeDistill(run.id)
      qc.setQueryData(distillRunKey(composed.id), composed)
      void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY })
      leave(() => onComposed(composed.id))
    } catch (err) {
      setComposing(false)
      const code = err instanceof ApiError ? err.code : undefined
      // Composed in another tab already: follow it there.
      if (code === 'run_not_collecting') leave(() => onComposed(run.id))
      else if (code === 'nothing_read')
        setError(t('onboarding.sources.nothingRead'))
      else if (code === 'reads_in_progress') {
        refresh(run.id)
        setError(t('onboarding.sources.stillReading'))
      } else refuse(err)
    }
  }

  /** On without a read. The open one would hold the workspace's only slot. */
  const later = () => {
    if (run) {
      discardDistill(run.id)
        .catch(() => undefined)
        .finally(
          () => void qc.invalidateQueries({ queryKey: DISTILL_LIST_KEY }),
        )
    }
    leave(onLater)
  }

  /** On while something is still being read: it stops, asked first. */
  const goOn = async () => {
    for (const p of pending) withdrawn.current.add(p.id)
    setPending([])
    withdrawAnswers()
    // Nothing is a read yet; whatever lands from here is stopped, and a run
    // still being opened is discarded (`adopt`).
    if (!run) {
      leave(onLater)
      return
    }
    const open = reads.filter((r) => isRunOpen(r.status))
    await Promise.allSettled(open.map((r) => stopDistillRead(run.id, r.id)))
    if (reads.some((r) => r.status === 'ready')) await compose()
    else later()
  }

  const shown: OnboardingSource[] = [
    ...reads.flatMap((read): OnboardingSource[] => {
      const status = readStatus(read)
      const added = status === 'read' ? addedText(t, read.coverage) : undefined
      if (read.kind === 'website') {
        const url = read.website?.url
        return [
          {
            kind: 'website',
            id: read.id,
            url: url
              ? siteHost(url)
              : (typed[read.id] ?? t('onboarding.sources.website.title')),
            status,
            added,
          },
        ]
      }
      if (read.kind === 'asset') {
        const source = read.sources[0]
        return [
          {
            kind: 'document',
            id: read.id,
            name: source?.title ?? '',
            type: source?.type ?? 'MD',
            status,
            added,
          },
        ]
      }
      return []
    }),
    ...pending,
  ]
  const answers =
    pendingAnswers ?? (answersRead ? answerValues(answersRead) : {})
  const answersStatus: SourceStatus | null = pendingAnswers
    ? 'reading'
    : answersRead
      ? readStatus(answersRead)
      : null

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
        answersStatus={answersStatus}
        answersAdded={
          answersRead && answersStatus === 'read'
            ? addedText(t, answersRead.coverage)
            : undefined
        }
        starting={composing}
        error={error}
        onAdd={(s: SourceInput) => {
          if (s.kind === 'website') addWebsite(s.url)
        }}
        onRemove={remove}
        onRetry={(id) =>
          retry(id === ANSWERS_ID && answersRead ? answersRead.id : id)
        }
        onChooseFiles={() => fileInput.current?.click()}
        onAnswers={(a) => {
          if (Object.keys(a).length > 0) addAnswers(a)
          else if (answersRead) removeRead(answersRead.id).catch(refuse)
          else withdrawAnswers()
        }}
        onBack={onBack}
        onRead={() => void compose()}
        onStop={() => void goOn()}
        onLater={later}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Brand

function Brand({
  run,
  name,
  siteName,
  onName,
  onBack,
  onDone,
}: {
  run: DistillRun
  name: string
  /** What the website calls the business, once its homepage is read. */
  siteName?: string
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
      siteName={siteName}
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
  const link = useCreateConnectLink('onboarding')

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
      // The whole window goes, and Zernio brings it back here — to the
      // picker under Settings first when the login covers several targets.
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
