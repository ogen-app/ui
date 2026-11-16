import { useId, useState } from 'react'
import {
  ChatCircleTextIcon,
  FileDocIcon,
  FilePdfIcon,
  FileTextIcon,
  GlobeIcon,
  StackIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { StarterCard } from '@/components/brand/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import { counted } from '@/lib/intl'
import {
  DISABLED_ACCENT,
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
 * as cards big enough to choose between, and none of them required, because a
 * client with no website is common and must not be a dead end. Choosing one
 * opens it in place for the input that kind needs; what has been added is
 * listed underneath, each with its X.
 *
 * Nothing is read until the person says so: a read counts against the month's
 * allowance, so it is one read over everything, started on the way out.
 */
export function SourcesStep({
  name,
  sources,
  questions,
  answers,
  onAdd,
  onRemove,
  onChooseFiles,
  onAnswer,
  onBack,
  onRead,
}: {
  /** Who is being read — the client's name, or how the sheet names them. */
  name: string
  sources: OnboardingSource[]
  questions: StarterQuestion[]
  answers: Record<string, string>
  onAdd: (source: OnboardingSource) => void
  onRemove: (id: string) => void
  onChooseFiles: () => void
  onAnswer: (questionId: string, answer: string) => void
  onBack: () => void
  onRead: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Kind | null>(
    sources.length === 0 ? 'website' : null,
  )
  const answered = Object.values(answers).filter((a) => a.trim()).length
  const ready =
    (sources.length > 0 || answered > 0) &&
    !sources.some((s) => s.kind === 'document' && s.uploading)

  const kinds: Kind[] = ['website', 'documents', 'questions']

  return (
    <StepCard
      title={t('onboarding.sources.title', { name })}
      lead={t('onboarding.sources.lead')}
      footer={
        <StepFooter
          onBack={onBack}
          note={
            ready
              ? t('onboarding.sources.readHint')
              : t('onboarding.sources.empty')
          }
          next={
            <Button
              variant="accent"
              className={DISABLED_ACCENT}
              disabled={!ready}
              onClick={onRead}
            >
              {t('onboarding.sources.read')}
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-3">
        {kinds.map((kind) => (
          <div key={kind} className="flex flex-col gap-3">
            <StarterCard
              icon={KIND_ICON[kind]}
              title={t(`onboarding.sources.${kind}.title`)}
              body={t(`onboarding.sources.${kind}.body`)}
              caret={open === kind ? 'down' : 'right'}
              pressed={open === kind}
              onClick={() => setOpen(open === kind ? null : kind)}
            />
            {open === kind && (
              <div className="pl-0 md:pl-[3.25rem]">
                {kind === 'website' && (
                  <WebsiteEditor
                    onAdd={(url) => {
                      onAdd({ kind: 'website', id: `web-${url}`, url })
                      setOpen(null)
                    }}
                  />
                )}
                {kind === 'documents' && (
                  <button
                    type="button"
                    onClick={onChooseFiles}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-quaternary px-4 py-8 text-sm text-secondary-foreground transition-colors hover:border-foreground hover:bg-secondary"
                  >
                    <UploadSimpleIcon aria-hidden className="size-4" />
                    <span>
                      {t('onboarding.sources.drop')}{' '}
                      <span className="font-medium text-accent">
                        {t('onboarding.sources.choose')}
                      </span>
                    </span>
                  </button>
                )}
                {kind === 'questions' && (
                  <div className="flex flex-col gap-4">
                    {questions.map((q) => (
                      <QuestionField
                        key={q.id}
                        question={q}
                        value={answers[q.id] ?? ''}
                        onChange={(a) => onAnswer(q.id, a)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {(sources.length > 0 || answered > 0) && (
        <ul className="flex flex-col border-t border-quaternary">
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              onRemove={() => onRemove(source.id)}
            />
          ))}
          {answered > 0 && (
            <li className="flex items-center gap-3 border-b border-quaternary py-3">
              <SourceGlyph icon={ChatCircleTextIcon} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {t('onboarding.sources.questions.title')}
              </span>
              <span className="text-sm text-secondary-foreground">
                {t('onboarding.sources.answered', counted(answered))}
              </span>
            </li>
          )}
        </ul>
      )}
    </StepCard>
  )
}

function WebsiteEditor({ onAdd }: { onAdd: (url: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [url, setUrl] = useState('')
  const host = url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const add = () => {
    if (host) onAdd(host)
  }
  return (
    <div className="flex flex-col gap-2">
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <Button variant="neutral" disabled={!host} onClick={add}>
          {t('onboarding.sources.add')}
        </Button>
      </div>
    </div>
  )
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: StarterQuestion
  value: string
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
  const title = source.kind === 'website' ? source.url : source.name
  const icon =
    source.kind === 'website'
      ? GlobeIcon
      : (DOC_ICON[source.type] ?? FileTextIcon)

  return (
    <li className="flex items-center gap-3 border-b border-quaternary py-3">
      <SourceGlyph icon={icon} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {title}
      </span>
      {source.kind === 'document' && source.uploading ? (
        <span className="flex items-center gap-2 text-sm text-secondary-foreground">
          <Spinner tone="onSurface" className="w-4" />
          {t('onboarding.sources.uploading')}
        </span>
      ) : (
        <span className="text-sm text-secondary-foreground">
          {source.kind === 'document' && source.pages
            ? t('onboarding.sources.pages', counted(source.pages))
            : t('onboarding.sources.ready')}
        </span>
      )}
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

function SourceGlyph({ icon: Icon }: { icon: typeof GlobeIcon }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary',
      )}
    >
      <Icon aria-hidden className="size-4 text-secondary-foreground" />
    </span>
  )
}
