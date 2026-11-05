import { useEffect, useState, type ReactNode } from 'react'
import {
  CheckIcon,
  CircleIcon,
  CircleNotchIcon,
  FilePdfIcon,
  FileTextIcon,
  GlobeSimpleIcon,
  NotePencilIcon,
  SparkleIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'

import {
  LANGUAGES,
  PERSONA,
  SOURCE_FILES,
  WEB_PAGES,
  proposalFrom,
  type SourceFile,
  type SourceId,
} from './-fixtures'
import {
  ChoiceCard,
  Chip,
  Field,
  OnboardingFrame,
  SaveMark,
  StepFooter,
  Title,
  useSavePulse,
} from './-frame'

export type Role = 'freelancer' | 'founder'
export type ClientCount = '1' | '2-4' | '5+'

export type Setup = {
  role: Role | null
  clients: ClientCount
  /** The client being set up, or the founder's own business. */
  business: string
  website: string
  files: SourceFile['id'][]
  notes: string
}

/** What the read had to go on. */
export function givenSources(setup: Setup): SourceId[] {
  return [
    'web',
    ...setup.files,
    ...(setup.notes.trim() ? (['notes'] as const) : []),
  ]
}

/* ------------------------------------------------------------------------ */
/* 1 · About you                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Two questions that change the shape of everything after: do you market for
 * clients or for yourself, and — for a freelancer — who first. A client is a
 * workspace of its own (brand, accounts, campaigns), so a freelancer is told
 * now that the others come later, rather than finding out on day three.
 */
export function YouStep({
  setup,
  onChange,
  onNext,
}: {
  setup: Setup
  onChange: (s: Setup) => void
  onNext: () => void
}) {
  const saving = useSavePulse(setup)
  const ready = setup.role !== null && setup.business.trim().length > 1

  return (
    <OnboardingFrame step="you" aside={<SaveMark saving={saving} />}>
      <Title sub="About fifteen minutes, and it’s worth it: Ogen writes from what you set up here. Everything saves as you go, so you can stop and come back.">
        Hi {PERSONA.firstName}, let’s set Ogen up for the way you work
      </Title>

      <div className="flex flex-col gap-8">
        <Field label="How do you work?">
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              on={setup.role === 'freelancer'}
              onClick={() => onChange({ ...setup, role: 'freelancer' })}
              title="I market for clients"
            >
              Freelancer or a small agency
            </ChoiceCard>
            <ChoiceCard
              on={setup.role === 'founder'}
              onClick={() => onChange({ ...setup, role: 'founder' })}
              title="I market my own business"
            >
              Founder or owner
            </ChoiceCard>
          </div>
        </Field>

        {setup.role === 'freelancer' && (
          <>
            <Field label="How many clients do you look after?">
              <div className="flex gap-2">
                {(
                  [
                    ['1', 'One'],
                    ['2-4', 'Two to four'],
                    ['5+', 'Five or more'],
                  ] as const
                ).map(([id, label]) => (
                  <Chip
                    key={id}
                    on={setup.clients === id}
                    onClick={() => onChange({ ...setup, clients: id })}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field
              label="Which client shall we set up first?"
              hint="Each client gets its own brand, accounts and campaigns"
            >
              <Input
                variant="primary"
                inputSize="lg"
                placeholder="Client name"
                value={setup.business}
                onChange={(e) =>
                  onChange({ ...setup, business: e.target.value })
                }
              />
              {setup.clients !== '1' && (
                <p className="mt-2 text-xs text-tertiary-foreground">
                  You’ll add the others from the client switcher once this one
                  is running.
                </p>
              )}
            </Field>
          </>
        )}

        {setup.role === 'founder' && (
          <Field label="What’s your business called?">
            <Input
              variant="primary"
              inputSize="lg"
              placeholder="Business name"
              value={setup.business}
              onChange={(e) => onChange({ ...setup, business: e.target.value })}
            />
          </Field>
        )}
      </div>

      <StepFooter note="Step 1 of 5">
        <Button
          variant="accent"
          className="disabled:opacity-40"
          size="xl"
          disabled={!ready}
          onClick={onNext}
        >
          Continue
        </Button>
      </StepFooter>
    </OnboardingFrame>
  )
}

/* ------------------------------------------------------------------------ */
/* 2 · Sources                                                              */
/* ------------------------------------------------------------------------ */

const SUGGESTED_KINDS = [
  'Brand guidelines',
  'Press kit',
  'Positioning or a brief',
  'Offers and packages',
]

/**
 * Everything Ogen should read, on one screen. The website is the one thing
 * required; documents are where a marketer's real material lives (the brand
 * book, the press kit), and the notes field is for what nobody wrote down —
 * which in practice is half of a client's rules.
 */
export function SourcesStep({
  setup,
  onChange,
  onBack,
  onNext,
}: {
  setup: Setup
  onChange: (s: Setup) => void
  onBack: () => void
  onNext: () => void
}) {
  const saving = useSavePulse(setup)
  const valid = /\w+\.\w{2,}/.test(setup.website.trim())
  const isClient = setup.role === 'freelancer'
  const next = SOURCE_FILES.find((f) => !setup.files.includes(f.id))

  return (
    <OnboardingFrame step="sources" aside={<SaveMark saving={saving} />}>
      <Title
        sub={
          <>
            The more Ogen reads, the less you’ll correct. Sources are only ever
            read — nothing here gets posted.
          </>
        }
      >
        What can Ogen read about {setup.business || 'the business'}?
      </Title>

      <div className="flex flex-col gap-8">
        <Field label={isClient ? 'Their website' : 'Your website'}>
          <Input
            variant="primary"
            inputSize="lg"
            autoFocus
            placeholder={isClient ? 'their-website.com' : 'your-website.com'}
            value={setup.website}
            onChange={(e) => onChange({ ...setup, website: e.target.value })}
          />
        </Field>

        <Field label="Documents" hint="PDF, Word or slides">
          <p className="mb-3 text-xs leading-4 text-secondary-foreground">
            The ones that help most:{' '}
            {SUGGESTED_KINDS.map((k, i) => (
              <span key={k}>
                {i > 0 && ' · '}
                {k}
              </span>
            ))}
          </p>
          {setup.files.length > 0 && (
            <ul className="mb-2 flex flex-col">
              {setup.files.map((id) => {
                const file = SOURCE_FILES.find((f) => f.id === id)!
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 border-b border-quaternary py-2.5"
                  >
                    <FilePdfIcon className="size-5 shrink-0 text-tertiary-foreground" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="text-xs text-tertiary-foreground">
                        {file.kind} · {file.pages} pages
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      className="text-tertiary-foreground hover:text-primary-foreground"
                      onClick={() =>
                        onChange({
                          ...setup,
                          files: setup.files.filter((f) => f !== id),
                        })
                      }
                    >
                      <XIcon className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {next && (
            <button
              type="button"
              onClick={() =>
                onChange({ ...setup, files: [...setup.files, next.id] })
              }
              className="flex h-20 w-full flex-col items-center justify-center gap-1 border border-dashed border-quaternary text-[13px] text-secondary-foreground transition-colors hover:border-primary-foreground hover:text-primary-foreground"
            >
              <UploadSimpleIcon className="size-4" />
              Drop files here, or browse
            </button>
          )}
        </Field>

        <Field
          label="Anything that isn’t written down?"
          hint="Ogen treats this as coming from you"
        >
          <Textarea
            className="min-h-20"
            placeholder="e.g. The family dislikes the word “luxury”. Always send people to our own booking page, never to Booking.com."
            value={setup.notes}
            onChange={(e) => onChange({ ...setup, notes: e.target.value })}
          />
        </Field>
      </div>

      <StepFooter onBack={onBack}>
        <Button
          variant="accent"
          className="disabled:opacity-40"
          size="xl"
          disabled={!valid}
          onClick={onNext}
        >
          <SparkleIcon weight="fill" />
          Read everything
        </Button>
      </StepFooter>
    </OnboardingFrame>
  )
}

/* ------------------------------------------------------------------------ */
/* 3 · Reading                                                              */
/* ------------------------------------------------------------------------ */

type ReadItem = { key: string; group: string; label: string; ms: number }

function readList(setup: Setup, domain: string): ReadItem[] {
  return [
    ...WEB_PAGES.map((p) => ({
      key: `web${p.path}`,
      group: domain,
      label: p.label,
      ms: 750,
    })),
    ...setup.files.map((id) => {
      const f = SOURCE_FILES.find((s) => s.id === id)!
      return {
        key: id,
        group: 'Documents',
        label: `${f.kind} · ${f.pages} pages`,
        ms: 600 + f.pages * 60,
      }
    }),
    ...(setup.notes.trim()
      ? [{ key: 'notes', group: 'Your notes', label: 'Your notes', ms: 600 }]
      : []),
  ]
}

const GROUP_ICON: Record<string, typeof GlobeSimpleIcon> = {
  Documents: FileTextIcon,
  'Your notes': NotePencilIcon,
}

/**
 * The read, shown working: sources tick off on the left, the brand Ogen is
 * assembling lands on the right section by section — the same sections the
 * review opens on.
 */
export function ReadingStep({
  setup,
  domain,
  speed,
  onDone,
}: {
  setup: Setup
  domain: string
  speed: number
  onDone: () => void
}) {
  const items = readList(setup, domain)
  const [done, setDone] = useState(0)
  const brand = proposalFrom(givenSources(setup))

  const ms = items[done]?.ms

  useEffect(() => {
    if (ms === undefined) return
    const timer = window.setTimeout(() => setDone((d) => d + 1), ms / speed)
    return () => window.clearTimeout(timer)
  }, [done, ms, speed])

  const finished = done >= items.length
  // Findings surface evenly through the read, the last one at the end.
  const shown = (k: number) => done >= Math.ceil((items.length * k) / 6)
  const groups = [...new Set(items.map((i) => i.group))]

  return (
    <OnboardingFrame step="reading" width="wide">
      <Title
        sub={
          finished
            ? 'Next you’ll go through it section by section. Each item says where it came from.'
            : 'Ogen is reading for how the brand sounds, who it talks to and what it must never say.'
        }
      >
        {finished ? 'Here’s the brand Ogen found' : 'Reading…'}
      </Title>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const Icon = GROUP_ICON[group] ?? GlobeSimpleIcon
            return (
              <div key={group}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-tertiary-foreground">
                  <Icon className="size-3.5" />
                  {group}
                </p>
                <ul className="flex flex-col gap-2">
                  {items.map((item, i) =>
                    item.group !== group ? null : (
                      <li
                        key={item.key}
                        className="flex items-start gap-2.5 text-[13px] leading-5"
                      >
                        {i < done ? (
                          <CheckIcon
                            weight="bold"
                            className="mt-0.5 size-4 shrink-0 text-accent"
                          />
                        ) : i === done ? (
                          <CircleNotchIcon className="mt-0.5 size-4 shrink-0 animate-spin text-secondary-foreground" />
                        ) : (
                          <CircleIcon className="mt-0.5 size-4 shrink-0 text-quaternary-foreground" />
                        )}
                        <span
                          className={cn(
                            i > done
                              ? 'text-tertiary-foreground'
                              : 'text-primary-foreground',
                          )}
                        >
                          {item.label}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          <Finding show={shown(1)} label="Positioning">
            {brand.positioning}
          </Finding>
          <Finding show={shown(2)} label="Voice">
            {brand.traits.map((t) => t.word).join(' · ')}
          </Finding>
          <Finding show={shown(3)} label="Audiences">
            {brand.audiences.map((a) => a.name).join(' · ')}
          </Finding>
          <Finding show={shown(4)} label="Rules">
            {brand.rules.length} things to always or never do
          </Finding>
          <Finding show={shown(5)} label="Facts">
            {brand.facts.length} facts Ogen may state — and nothing else
          </Finding>
          <Finding show={shown(6)} label="Languages">
            {LANGUAGES.filter((l) => brand.languages.includes(l.code))
              .map((l) => l.label)
              .join(' and ')}
          </Finding>
        </div>
      </div>

      <div className="mt-10 flex h-11 justify-end">
        {finished && (
          <Button variant="accent" size="xl" onClick={onDone}>
            Review the brand
          </Button>
        )}
      </div>
    </OnboardingFrame>
  )
}

function Finding({
  show,
  label,
  children,
}: {
  show: boolean
  label: string
  children: ReactNode
}) {
  if (!show)
    return <div className="h-[60px] animate-pulse bg-secondary" aria-hidden />
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-secondary px-4 py-2.5">
      <p className="text-xs text-tertiary-foreground">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-primary-foreground">
        {children}
      </p>
    </div>
  )
}
