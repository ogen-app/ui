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
  Field,
  OnboardingFrame,
  SaveMark,
  StepFooter,
  Title,
  useSavePulse,
} from './-frame'

export type Role = 'freelancer' | 'founder'

export type Setup = {
  role: Role | null
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

/** `haus-aurelia.ch` → "Haus Aurelia": a name to start from, not to keep. */
export function nameFromDomain(website: string): string {
  const host = website
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[./]/)[0]
  return host
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

export const isWebsite = (w: string) => /\w+\.\w{2,}/.test(w.trim())

/* ------------------------------------------------------------------------ */
/* 1 · About you                                                            */
/* ------------------------------------------------------------------------ */

/** What the rest of the setup asks for, and what each part buys. */
function roadmap(isClient: boolean) {
  const whose = isClient ? 'the client’s' : 'your'
  return [
    {
      label: 'What Ogen reads',
      minutes: 3,
      gives: `${isClient ? 'The client’s' : 'Your'} website, plus a brand book or press kit if you have one to hand.`,
    },
    {
      label: 'The brand',
      minutes: 5,
      gives:
        'Check what Ogen understood — positioning, voice, audiences, rules and facts. It writes from this.',
    },
    {
      label: 'Accounts',
      minutes: 2,
      gives: isClient
        ? 'Connect the client’s channels, or send them a link to do it.'
        : 'Connect the channels you post to.',
    },
    {
      label: 'First campaign',
      minutes: 5,
      gives: `Pick a campaign for ${whose} brand, adjust the brief, and get the first week of drafts.`,
    },
  ]
}

/**
 * One question, and it says what it changes. Nothing is asked here that is
 * only used later — the client's name comes from their website on the next
 * screen, where it is obviously needed. Underneath, the road ahead: what each
 * stage asks for and what it gives back, so the fifteen minutes are a plan
 * rather than a surprise.
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
  const isClient = setup.role !== 'founder'
  const steps = roadmap(isClient)

  return (
    <OnboardingFrame step="you" aside={<SaveMark saving={saving} />}>
      <Title sub="Ogen writes from what you set up here, so it’s worth fifteen minutes. It saves as you go — stop whenever and come back.">
        Hi {PERSONA.firstName}, let’s set Ogen up for the way you work
      </Title>

      <Field label="How do you work?">
        <div className="grid gap-2 sm:grid-cols-2">
          <RoleCard
            on={setup.role === 'freelancer'}
            onClick={() => onChange({ ...setup, role: 'freelancer' })}
            title="I market for clients"
            who="Freelancer or a small agency"
            means={[
              'Each client gets its own brand, accounts and campaigns',
              'Posts can go to the client for approval',
            ]}
          />
          <RoleCard
            on={setup.role === 'founder'}
            onClick={() => onChange({ ...setup, role: 'founder' })}
            title="I market my own business"
            who="Founder or owner"
            means={['One brand — yours', 'Posts go straight to your calendar']}
          />
        </div>
      </Field>

      <div className="mt-10">
        <p className="mb-4 text-sm font-medium">What happens next</p>
        <ol className="flex flex-col">
          {steps.map((s, i) => (
            <li key={s.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-quaternary text-xs tabular-nums text-secondary-foreground">
                  {i + 2}
                </span>
                {i < steps.length - 1 && (
                  <span className="w-px flex-1 bg-quaternary" />
                )}
              </div>
              <div className="flex-1 pb-5">
                <p className="flex items-baseline justify-between gap-4 text-sm font-medium leading-6">
                  {s.label}
                  <span className="text-xs font-normal tabular-nums text-tertiary-foreground">
                    ~{s.minutes} min
                  </span>
                </p>
                <p className="text-xs leading-4 text-secondary-foreground">
                  {s.gives}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="pl-10 text-xs text-tertiary-foreground">
          You finish with a week of drafts to review — nothing posts until you
          say so.
        </p>
      </div>

      <StepFooter>
        <Button
          variant="accent"
          className="disabled:opacity-40"
          size="xl"
          disabled={setup.role === null}
          onClick={onNext}
        >
          Continue
        </Button>
      </StepFooter>
    </OnboardingFrame>
  )
}

function RoleCard({
  on,
  onClick,
  title,
  who,
  means,
}: {
  on: boolean
  onClick: () => void
  title: string
  who: string
  means: string[]
}) {
  return (
    <ChoiceCard on={on} onClick={onClick} title={title}>
      <span className="block">{who}</span>
      <span className="mt-3 flex flex-col gap-1.5 border-t border-quaternary pt-3">
        {means.map((m) => (
          <span key={m} className="flex gap-2 text-primary-foreground">
            <CheckIcon
              weight="bold"
              className={cn(
                'mt-px size-3 shrink-0',
                on ? 'text-accent' : 'text-tertiary-foreground',
              )}
            />
            {m}
          </span>
        ))}
      </span>
    </ChoiceCard>
  )
}

/* ------------------------------------------------------------------------ */
/* 2 · Sources                                                              */
/* ------------------------------------------------------------------------ */

/** Everything the read could find, for measuring a partial read against. */
const FULL = proposalFrom(['web', 'brandbook', 'presskit', 'offers', 'notes'])

/**
 * Everything Ogen should read, as three sources of one shape — numbered, each
 * saying what to give and ticking when given. Beside them, what Ogen will be
 * able to fill from what's there so far: adding the brand book visibly moves
 * Voice and Rules, which is the answer to "why should I upload this?". Only
 * the website is required; the rest can be added later from the Library, so
 * nobody has to chase a client mid-setup.
 *
 * The client's name is read off the website rather than asked for up front,
 * and stays editable in place.
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
  const valid = isWebsite(setup.website)
  const isClient = setup.role !== 'founder'
  const next = SOURCE_FILES.find((f) => !setup.files.includes(f.id))

  const setWebsite = (website: string) => {
    const derived = nameFromDomain(setup.website)
    const renamed = setup.business.trim() && setup.business !== derived
    onChange({
      ...setup,
      website,
      business: renamed ? setup.business : nameFromDomain(website),
    })
  }

  return (
    <OnboardingFrame
      step="sources"
      width="wide"
      aside={<SaveMark saving={saving} />}
    >
      <Title sub="Ogen builds the brand from these, and every line it proposes names the source it came from. Nothing here gets posted.">
        {isClient
          ? 'What can Ogen read about your first client?'
          : 'What can Ogen read about your business?'}
      </Title>

      <div className="grid gap-8 md:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-3">
          <SourceBlock
            n={1}
            done={valid}
            icon={GlobeSimpleIcon}
            title={isClient ? 'Their website' : 'Your website'}
            tag="Required"
            what="Ogen reads every page for how the brand talks and what it offers."
          >
            <Input
              autoFocus
              placeholder={isClient ? 'their-website.com' : 'your-website.com'}
              value={setup.website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            {valid && (
              <label className="mt-3 flex items-center gap-2 text-xs text-secondary-foreground">
                {isClient ? 'Client name' : 'Business name'}
                <input
                  value={setup.business}
                  onChange={(e) =>
                    onChange({ ...setup, business: e.target.value })
                  }
                  className="min-w-0 flex-1 border-b border-dashed border-quaternary bg-transparent pb-0.5 text-sm font-medium text-primary-foreground outline-none focus:border-primary-foreground"
                />
              </label>
            )}
          </SourceBlock>

          <SourceBlock
            n={2}
            done={setup.files.length > 0}
            icon={FileTextIcon}
            title="Documents"
            tag="Optional"
            what="Brand guidelines, a press kit, offers — whatever you have to hand."
          >
            {setup.files.length > 0 && (
              <ul className="mb-2 flex flex-col">
                {setup.files.map((id) => {
                  const file = SOURCE_FILES.find((f) => f.id === id)!
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 border-b border-quaternary py-2"
                    >
                      <FilePdfIcon className="size-4 shrink-0 text-tertiary-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {file.name}
                      </span>
                      <span className="shrink-0 text-xs text-tertiary-foreground">
                        {file.pages} pages
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
                        <XIcon className="size-3.5" />
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
                className="flex h-10 w-full items-center gap-2 border-b border-quaternary bg-input px-4 text-sm text-tertiary-foreground transition-colors hover:text-primary-foreground"
              >
                <UploadSimpleIcon className="size-4" />
                Drop files here, or browse
                <span className="ml-auto text-xs">PDF, Word or slides</span>
              </button>
            )}
          </SourceBlock>

          <SourceBlock
            n={3}
            done={setup.notes.trim().length > 0}
            icon={NotePencilIcon}
            title="What isn’t written down"
            tag="Optional"
            what={
              isClient
                ? 'Things the client has told you — words they dislike, links to always use.'
                : 'Things you know but never wrote down — words you avoid, links to always use.'
            }
          >
            <Textarea
              className="min-h-16"
              placeholder="e.g. The family dislikes the word “luxury”. Always send people to our own booking page, never to Booking.com."
              value={setup.notes}
              onChange={(e) => onChange({ ...setup, notes: e.target.value })}
            />
          </SourceBlock>
        </div>

        <Coverage setup={setup} web={valid} />
      </div>

      <StepFooter
        onBack={onBack}
        note={valid ? 'You can add more later' : undefined}
      >
        <Button
          variant="accent"
          className="disabled:opacity-40"
          size="xl"
          disabled={!valid || setup.business.trim().length < 2}
          onClick={onNext}
        >
          <SparkleIcon weight="fill" />
          Read everything
        </Button>
      </StepFooter>
    </OnboardingFrame>
  )
}

/** One source, in the one shape all three share. */
function SourceBlock({
  n,
  done,
  icon: Icon,
  title,
  tag,
  what,
  children,
}: {
  n: number
  done: boolean
  icon: typeof GlobeSimpleIcon
  title: string
  tag: string
  what: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'border px-4 pb-4 pt-3.5 transition-colors',
        done ? 'border-tertiary-foreground/40' : 'border-quaternary',
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums transition-colors',
            done
              ? 'bg-accent text-primary'
              : 'border border-quaternary text-secondary-foreground',
          )}
        >
          {done ? <CheckIcon weight="bold" className="size-3" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium leading-6">
            <Icon className="size-4 text-tertiary-foreground" />
            {title}
            <span className="ml-auto text-xs font-normal text-tertiary-foreground">
              {tag}
            </span>
          </p>
          <p className="text-xs leading-4 text-secondary-foreground">{what}</p>
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  )
}

/**
 * What the read will be able to fill, from what has been given so far. The
 * bars are against everything the read could find for this client — a
 * prototype's luxury, but the shape is the real one: each source visibly
 * buys something.
 */
function Coverage({ setup, web }: { setup: Setup; web: boolean }) {
  const given = givenSources(setup).filter((s) => web || s !== 'web')
  const b = proposalFrom(given)
  const rows: { label: string; have: number; of: number; text: string }[] = [
    {
      label: 'Positioning',
      have: web ? 1 : 0,
      of: 1,
      text: web ? 'From the website' : 'Needs the website',
    },
    {
      label: 'Voice',
      have: b.traits.length,
      of: FULL.traits.length,
      text: count(b.traits.length, 'trait'),
    },
    {
      label: 'Audiences',
      have: b.audiences.length,
      of: FULL.audiences.length,
      text: count(b.audiences.length, 'audience'),
    },
    {
      label: 'Rules',
      have: b.rules.length,
      of: FULL.rules.length,
      text: count(b.rules.length, 'rule'),
    },
    {
      label: 'Facts',
      have: b.facts.length,
      of: FULL.facts.length,
      text: count(b.facts.length, 'fact'),
    },
  ]

  return (
    <aside className="self-start md:sticky md:top-6">
      <p className="text-sm font-medium">What Ogen will learn</p>
      <p className="mb-4 mt-1 text-xs leading-4 text-tertiary-foreground">
        You’ll check each of these next.
      </p>
      <ul className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <li key={r.label}>
            <p className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium">{r.label}</span>
              <span className="text-xs tabular-nums text-tertiary-foreground">
                {r.text}
              </span>
            </p>
            <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-quaternary">
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${(r.have / r.of) * 100}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function count(n: number, noun: string) {
  return n === 0 ? 'Nothing yet' : `${n} ${noun}${n === 1 ? '' : 's'}`
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
