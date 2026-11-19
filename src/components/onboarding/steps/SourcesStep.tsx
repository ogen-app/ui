import { useId, useState, type ReactNode } from 'react'
import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  CheckIcon,
  FileDocIcon,
  FilePdfIcon,
  FileTextIcon,
  GlobeIcon,
  PlusIcon,
  StackIcon,
  UploadSimpleIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { counted } from '@/lib/intl'
import { cn } from '@/lib/styles'
import {
  DISABLED_ACCENT,
  HINT_TEXT,
  LABEL_TEXT,
  StepCard,
  StepFooter,
} from '../OnboardingFrame'

/**
 * Where one thing Ogen was given stands. A document is `uploading` first;
 * everything is `reading` from the moment it is added, for about a minute,
 * and `stopped` only if the person went on before it finished.
 *
 * Against the API as it is (`readsOnAdd` off), only a document is read on
 * its own — its ingest — and the website and the answers are `queued` for
 * the one brand read Continue starts. `failed` is an upload the server
 * refused.
 */
export type SourceStatus =
  'uploading' | 'reading' | 'read' | 'stopped' | 'queued' | 'failed'

/**
 * One thing Ogen reads. A document is uploaded the moment it is chosen
 * (`purpose=brand_source`) and read once it lands; the website is read the
 * moment its address is added.
 */
export type SourceInput =
  | { kind: 'website'; id: string; url: string }
  | {
      kind: 'document'
      id: string
      name: string
      /** The asset type — `PDF`, `DOC`, `MD`. */
      type: string
      pages?: number
    }

export type OnboardingSource = SourceInput & { status: SourceStatus }

/** The id `onRetry` takes for the answers, which are not a source. */
export const ANSWERS_ID = 'answers'

const busy = (status: SourceStatus | null) =>
  status === 'uploading' || status === 'reading'

export type StarterQuestion = { id: string; text: string }

type Kind = 'website' | 'documents' | 'questions'

const KIND_ICON = {
  website: GlobeIcon,
  documents: StackIcon,
  questions: ChatCircleTextIcon,
} as const

/**
 * Start from whatever there is. Three ways in — the brand read's own three —
 * as tiles big enough to choose between, and none of them required, because a
 * client with no website is common and must not be a dead end.
 *
 * Choosing one opens it as a card holding the input that kind needs, with an X
 * to back out; adding closes it and lists what was added above. From then on
 * the ways still open shrink to a row of small "add" buttons underneath, so
 * the screen is about what has been given rather than what hasn't. A website
 * and the answers come once each; documents can keep coming.
 *
 * Each one is read the moment it is added, because a read takes about a
 * minute and nobody should sit through that after deciding to go on. While it
 * runs its card keeps an indeterminate line moving along its foot — a minute
 * of a still screen reads as stuck. The person may go on before it finishes,
 * but is asked first, in the footer rather than a dialog: going on stops the read, and the sheet on the right is
 * not filled in from it. With nothing added the way on is "Do this later",
 * never a disabled button.
 */
export function SourcesStep({
  name,
  sources,
  questions,
  answers,
  answersStatus,
  onAdd,
  onRemove,
  onRetry,
  onChooseFiles,
  onAnswers,
  onBack,
  onRead,
  onStop,
  onLater,
  readsOnAdd = true,
  starting,
  error,
}: {
  /** Who is being read — the client's name, or how the sheet names them. */
  name: string
  sources: OnboardingSource[]
  questions: StarterQuestion[]
  answers: Record<string, string>
  /** How the answers' read stands; `null` while there are none. */
  answersStatus: SourceStatus | null
  /** Starts reading what was added; the caller sets its status. */
  onAdd: (source: SourceInput) => void
  onRemove: (id: string) => void
  /** Reads a stopped source again — `ANSWERS_ID` for the answers. */
  onRetry: (id: string) => void
  onChooseFiles: () => void
  /** Replaces the answers; `{}` takes them back. */
  onAnswers: (answers: Record<string, string>) => void
  onBack: () => void
  /** On to the review, once nothing is still being read. */
  onRead: () => void
  /** On while something is still being read — stops it. Asked first. */
  onStop: () => void
  /** On without a read; the brand is read later from Foundation. */
  onLater: () => void
  /**
   * Whether each source is read the moment it is added (the design). Off,
   * Continue starts one read over everything, documents still ingesting
   * included — the API's shape — so there is nothing to stop and nothing to
   * ask about.
   */
  readsOnAdd?: boolean
  /** The read is being asked for. */
  starting?: boolean
  /** Why the read did not start, said where the hint is. */
  error?: string
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<Kind | null>(null)
  const [asking, setAsking] = useState(false)

  const answered = Object.values(answers).filter((a) => a.trim()).length
  const hasWebsite = sources.some((s) => s.kind === 'website')
  const hasDocs = sources.some((s) => s.kind === 'document')
  const given = sources.length > 0 || answered > 0
  const statuses = [
    ...sources.map((s) => s.status),
    ...(answered > 0 ? [answersStatus] : []),
  ]
  const reading = statuses.some(busy)
  const anyRead = statuses.includes('read')
  const onContinue = !readsOnAdd
    ? onRead
    : reading
      ? () => setAsking(true)
      : anyRead
        ? onRead
        : onLater
  // Asking only holds while something is still being read: a read finishing
  // under the question answers it, and the next add starts unasked.
  if (asking && !reading) setAsking(false)
  const confirming = asking && reading

  const open: Kind[] = (
    [
      hasWebsite ? null : 'website',
      'documents',
      answered > 0 ? null : 'questions',
    ] as const
  ).filter((k): k is Kind => k !== null && k !== editing)
  const choosing = !given && !editing

  return (
    <StepCard
      title={t('onboarding.sources.title', { name })}
      lead={t(
        readsOnAdd
          ? 'onboarding.sources.lead'
          : 'onboarding.sources.leadTogether',
      )}
      footer={
        <StepFooter
          onBack={onBack}
          note={
            confirming ? (
              <span className="flex items-start gap-2 text-primary-foreground">
                <WarningIcon
                  aria-hidden
                  weight="fill"
                  className="mt-0.5 size-4 shrink-0 text-warning-ink"
                />
                {t('onboarding.sources.stop.body')}
              </span>
            ) : error ? (
              <span className="flex items-start gap-2 text-primary-foreground">
                <WarningIcon
                  aria-hidden
                  weight="fill"
                  className="mt-0.5 size-4 shrink-0 text-warning-ink"
                />
                {error}
              </span>
            ) : !given ? undefined : !readsOnAdd ? (
              t('onboarding.sources.togetherHint')
            ) : reading ? (
              t('onboarding.sources.readingHint')
            ) : anyRead ? (
              t('onboarding.sources.readHint')
            ) : undefined
          }
          next={
            confirming ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setAsking(false)}>
                  {t('onboarding.sources.stop.keep')}
                </Button>
                <Button variant="accent" onClick={onStop}>
                  {t('onboarding.sources.stop.go')}
                </Button>
              </div>
            ) : error ? (
              // The read could not start — no scraper, the read switched off,
              // a server that did not answer. Setup must not end there: the
              // brand can be read from Foundation later.
              <div className="flex gap-2">
                <Button variant="ghost" loading={starting} onClick={onContinue}>
                  {t('onboarding.sources.tryAgain')}
                </Button>
                <Button variant="accent" onClick={onLater}>
                  {t('onboarding.sources.withoutRead')}
                </Button>
              </div>
            ) : given ? (
              <Button variant="accent" loading={starting} onClick={onContinue}>
                {t('onboarding.sources.continue')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={onLater}>
                {t('onboarding.sources.later')}
              </Button>
            )
          }
        />
      }
    >
      <div className="flex flex-col gap-3">
        {given && (
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onRemove={() => onRemove(source.id)}
                onRetry={() => onRetry(source.id)}
              />
            ))}
            {answered > 0 && answersStatus && (
              <AddedRow
                icon={ChatCircleTextIcon}
                title={t('onboarding.sources.questions.title')}
                status={answersStatus}
                detail={t('onboarding.sources.answered', counted(answered))}
                onRemove={() => onAnswers({})}
                onRetry={() => onRetry(ANSWERS_ID)}
              />
            )}
          </ul>
        )}

        {editing === 'website' && (
          <EditCard kind="website" onCancel={() => setEditing(null)}>
            <WebsiteForm
              onAdd={(url) => {
                onAdd({ kind: 'website', id: `web-${url}`, url })
                setEditing(null)
              }}
            />
          </EditCard>
        )}
        {editing === 'documents' && (
          <EditCard kind="documents" onCancel={() => setEditing(null)}>
            <button
              type="button"
              onClick={() => {
                onChooseFiles()
                setEditing(null)
              }}
              className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-quaternary px-4 text-sm text-secondary-foreground transition-colors hover:border-foreground hover:bg-secondary"
            >
              <UploadSimpleIcon aria-hidden className="size-5" />
              <span>
                {t('onboarding.sources.drop')}{' '}
                <span className="font-medium text-accent">
                  {t('onboarding.sources.choose')}
                </span>
              </span>
              <span>{t('onboarding.sources.formats')}</span>
            </button>
          </EditCard>
        )}
        {editing === 'questions' && (
          <EditCard kind="questions" onCancel={() => setEditing(null)}>
            <QuestionsForm
              questions={questions}
              onAdd={(a) => {
                onAnswers(a)
                setEditing(null)
              }}
            />
          </EditCard>
        )}

        {choosing ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {open.map((kind) => (
              <KindTile
                key={kind}
                kind={kind}
                onClick={() => setEditing(kind)}
              />
            ))}
          </div>
        ) : (
          open.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {open.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setEditing(kind)}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-quaternary px-3.5 text-sm text-secondary-foreground transition-colors hover:border-foreground hover:text-primary-foreground"
                >
                  <PlusIcon aria-hidden className="size-3.5" />
                  {kind === 'documents' && hasDocs
                    ? t('onboarding.sources.documents.more')
                    : t(`onboarding.sources.${kind}.title`)}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </StepCard>
  )
}

/** One way in, before anything has been given — big enough to choose by. */
function KindTile({ kind, onClick }: { kind: Kind; onClick: () => void }) {
  const { t } = useTranslation()
  const Icon = KIND_ICON[kind]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-40 cursor-pointer flex-col items-start justify-between rounded-md border border-quaternary p-5 text-left transition-colors hover:border-foreground hover:bg-secondary"
    >
      <Icon aria-hidden weight="light" className="size-7" />
      <span className="flex flex-col gap-1">
        <span className="text-base leading-6 font-medium">
          {t(`onboarding.sources.${kind}.title`)}
        </span>
        <span className={HINT_TEXT}>
          {t(`onboarding.sources.${kind}.body`)}
        </span>
      </span>
    </button>
  )
}

/** A way in, opened for its input. */
function EditCard({
  kind,
  onCancel,
  children,
}: {
  kind: Kind
  onCancel: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const Icon = KIND_ICON[kind]
  return (
    <section className="animate-in fade-in slide-in-from-bottom-1 flex flex-col gap-4 rounded-md border border-foreground p-5 duration-200">
      <div className="flex items-center gap-3">
        <Icon aria-hidden className="size-5" />
        <h2 className="flex-1 text-base leading-6 font-medium">
          {t(`onboarding.sources.${kind}.title`)}
        </h2>
        <Button
          variant="ghost"
          size="smIcon"
          aria-label={t('onboarding.sources.cancel')}
          onClick={onCancel}
        >
          <XIcon />
        </Button>
      </div>
      {children}
    </section>
  )
}

function WebsiteForm({ onAdd }: { onAdd: (url: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [url, setUrl] = useState('')
  const host = url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (host) onAdd(host)
      }}
    >
      <Label htmlFor={id} className={LABEL_TEXT}>
        {t('onboarding.sources.websiteLabel')}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={url}
          autoFocus
          inputMode="url"
          placeholder="example.com"
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          type="submit"
          variant="accent"
          size="defaultIcon"
          className={DISABLED_ACCENT}
          aria-label={t('onboarding.sources.add')}
          disabled={!host}
        >
          <ArrowRightIcon weight="bold" />
        </Button>
      </div>
      <p className={HINT_TEXT}>{t('onboarding.sources.websiteHint')}</p>
    </form>
  )
}

function QuestionsForm({
  questions,
  onAdd,
}: {
  questions: StarterQuestion[]
  onAdd: (answers: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const any = Object.values(draft).some((a) => a.trim())
  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          value={draft[q.id] ?? ''}
          autoFocus={q === questions[0]}
          onChange={(a) => setDraft((d) => ({ ...d, [q.id]: a }))}
        />
      ))}
      <div className="flex justify-end">
        <Button
          variant="accent"
          className={DISABLED_ACCENT}
          disabled={!any}
          onClick={() => onAdd(draft)}
        >
          {t('onboarding.sources.addAnswers')}
        </Button>
      </div>
    </div>
  )
}

function QuestionField({
  question,
  value,
  autoFocus,
  onChange,
}: {
  question: StarterQuestion
  value: string
  autoFocus?: boolean
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className={LABEL_TEXT}>
        {question.text}
      </Label>
      <Textarea
        id={id}
        value={value}
        autoFocus={autoFocus}
        aria-description={t('onboarding.sources.answerLabel')}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

const DOC_ICON: Record<string, typeof FileTextIcon> = {
  PDF: FilePdfIcon,
  DOC: FileDocIcon,
}

function SourceRow({
  source,
  onRemove,
  onRetry,
}: {
  source: OnboardingSource
  onRemove: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const doc = source.kind === 'document'
  return (
    <AddedRow
      icon={doc ? (DOC_ICON[source.type] ?? FileTextIcon) : GlobeIcon}
      title={doc ? source.name : source.url}
      status={source.status}
      detail={
        doc && source.pages
          ? t('onboarding.sources.pages', counted(source.pages))
          : undefined
      }
      onRemove={onRemove}
      onRetry={onRetry}
    />
  )
}

/**
 * Something added, as a card that stays put while it is read. A read takes
 * about a minute, so the card says so and keeps a line moving along its foot:
 * the movement is the only proof, a minute in, that nothing has stuck.
 */
function AddedRow({
  icon: Icon,
  title,
  status,
  detail,
  onRemove,
  onRetry,
}: {
  icon: typeof GlobeIcon
  title: string
  status: SourceStatus
  /** What was read — pages, answers — shown once it has been. */
  detail?: string
  onRemove: () => void
  onRetry: () => void
}) {
  const { t } = useTranslation()
  return (
    <li className="animate-in fade-in slide-in-from-bottom-1 relative overflow-hidden rounded-md border border-quaternary duration-200">
      <div className="flex items-center gap-3 py-2.5 pr-2 pl-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm leading-5 font-medium">
          {title}
        </span>
        <span
          className={cn(HINT_TEXT, 'flex shrink-0 items-center gap-1.5')}
          aria-live="polite"
        >
          {status === 'failed' && (
            <WarningIcon
              aria-hidden
              weight="fill"
              className="size-3.5 text-warning-ink"
            />
          )}
          {status === 'read' && (
            <CheckIcon
              aria-hidden
              weight="bold"
              className="size-3.5 text-accent"
            />
          )}
          {status === 'read'
            ? (detail ?? t('onboarding.sources.done'))
            : t(`onboarding.sources.${status}`)}
        </span>
        {status === 'stopped' && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            {t('onboarding.sources.retry')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="smIcon"
          aria-label={t('onboarding.sources.remove', { name: title })}
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      </div>
      {busy(status) && (
        <Spinner
          tone="onSurface"
          className="absolute inset-x-0 bottom-0 w-full bg-accent/15 before:animate-[spinner-line_1.8s_ease-in-out_infinite] before:bg-accent"
        />
      )}
    </li>
  )
}
