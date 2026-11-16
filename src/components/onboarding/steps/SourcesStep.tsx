import { useId, useState, type ReactNode } from 'react'
import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  FileDocIcon,
  FilePdfIcon,
  FileTextIcon,
  GlobeIcon,
  PlusIcon,
  StackIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { counted } from '@/lib/intl'
import {
  DISABLED_ACCENT,
  HINT_TEXT,
  LABEL_TEXT,
  StepCard,
  StepFooter,
} from '../OnboardingFrame'

/**
 * One thing Ogen will read. A document is uploaded the moment it is chosen
 * (`purpose=brand_source`), so by the time the read starts it is an asset id;
 * the website and the answers are sent with the read itself.
 */
export type OnboardingSource =
  | { kind: 'website'; id: string; url: string }
  | {
      kind: 'document'
      id: string
      name: string
      /** The asset type — `PDF`, `DOC`, `MD`. */
      type: string
      pages?: number
      uploading?: boolean
    }

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
 * Nothing is read until the person says so: a read counts against the month's
 * allowance, so it is one read over everything, started on the way out. With
 * nothing added the way on is "Do this later", never a disabled button.
 */
export function SourcesStep({
  name,
  sources,
  questions,
  answers,
  onAdd,
  onRemove,
  onChooseFiles,
  onAnswers,
  onBack,
  onRead,
  onLater,
}: {
  /** Who is being read — the client's name, or how the sheet names them. */
  name: string
  sources: OnboardingSource[]
  questions: StarterQuestion[]
  answers: Record<string, string>
  onAdd: (source: OnboardingSource) => void
  onRemove: (id: string) => void
  onChooseFiles: () => void
  /** Replaces the answers; `{}` takes them back. */
  onAnswers: (answers: Record<string, string>) => void
  onBack: () => void
  onRead: () => void
  /** On without a read; the brand is read later from Foundation. */
  onLater: () => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<Kind | null>(null)

  const answered = Object.values(answers).filter((a) => a.trim()).length
  const hasWebsite = sources.some((s) => s.kind === 'website')
  const hasDocs = sources.some((s) => s.kind === 'document')
  const given = sources.length > 0 || answered > 0
  const uploading = sources.some((s) => s.kind === 'document' && s.uploading)

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
      lead={t('onboarding.sources.lead')}
      footer={
        <StepFooter
          onBack={onBack}
          note={given ? t('onboarding.sources.readHint') : undefined}
          next={
            given ? (
              <Button
                variant="accent"
                className={DISABLED_ACCENT}
                disabled={uploading}
                onClick={onRead}
              >
                {t('onboarding.sources.read')}
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
          <ul className="flex flex-col border-t border-quaternary">
            {sources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                onRemove={() => onRemove(source.id)}
              />
            ))}
            {answered > 0 && (
              <AddedRow
                icon={ChatCircleTextIcon}
                title={t('onboarding.sources.questions.title')}
                status={t('onboarding.sources.answered', counted(answered))}
                onRemove={() => onAnswers({})}
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
}: {
  source: OnboardingSource
  onRemove: () => void
}) {
  const { t } = useTranslation()
  if (source.kind === 'website')
    return (
      <AddedRow
        icon={GlobeIcon}
        title={source.url}
        status={t('onboarding.sources.ready')}
        onRemove={onRemove}
      />
    )
  return (
    <AddedRow
      icon={DOC_ICON[source.type] ?? FileTextIcon}
      title={source.name}
      status={
        source.uploading ? (
          <span className="flex items-center gap-2">
            <Spinner tone="onSurface" className="w-4" />
            {t('onboarding.sources.uploading')}
          </span>
        ) : source.pages ? (
          t('onboarding.sources.pages', counted(source.pages))
        ) : (
          t('onboarding.sources.ready')
        )
      }
      onRemove={onRemove}
    />
  )
}

function AddedRow({
  icon: Icon,
  title,
  status,
  onRemove,
}: {
  icon: typeof GlobeIcon
  title: string
  status: ReactNode
  onRemove: () => void
}) {
  const { t } = useTranslation()
  return (
    <li className="flex items-center gap-3 border-b border-quaternary py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm leading-5 font-medium">
        {title}
      </span>
      <span className={HINT_TEXT}>{status}</span>
      <Button
        variant="ghost"
        size="smIcon"
        aria-label={t('onboarding.sources.remove', { name: title })}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </li>
  )
}
