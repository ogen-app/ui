import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleIcon,
  CircleNotchIcon,
  PlusIcon,
  SparkleIcon,
  XIcon,
} from '@phosphor-icons/react'

import LogoFull from '@/assets/logo-full.svg?react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import { formatDate } from '@/lib/intl'
import { getPlatformByZernioId } from '@/lib/platformDictionary'

import {
  DRAFTS,
  FINDINGS,
  OFFERED_PLATFORMS,
  READ_PAGES,
  RHYTHMS,
  RHYTHM_DAYS,
  TONE_OPTIONS,
  addDays,
  firstMonday,
  type PlatformId,
  type Rhythm,
} from './-fixtures'

/* ------------------------------------------------------------------------ */
/* Frame                                                                    */
/* ------------------------------------------------------------------------ */

const STEP_LABELS = [
  'Your business',
  'Is this you?',
  'Where you post',
  'Your first week',
]

/**
 * The onboarding frame: the logo, four dots that say how far along you are,
 * and one white column. Deliberately no menu — nothing here is a place to go,
 * and the first thing the old app did was show a dozen of them.
 */
export function OnboardingFrame({
  stepIndex,
  wide = false,
  children,
}: {
  stepIndex: number
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between px-6 md:px-10">
        <LogoFull className="h-6 w-auto" />
        <ol className="flex items-center gap-2" aria-label="Progress">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              title={label}
              aria-current={i === stepIndex ? 'step' : undefined}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i < stepIndex && 'w-6 bg-accent',
                i === stepIndex && 'w-10 bg-primary-foreground',
                i > stepIndex && 'w-6 bg-quaternary',
              )}
            />
          ))}
        </ol>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 md:items-center md:pt-0">
        <div
          className={cn(
            'animate-in fade-in slide-in-from-bottom-2 duration-300 w-full bg-primary px-6 py-8 md:px-10 md:py-10',
            wide ? 'max-w-[720px]' : 'max-w-[560px]',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-[1.75rem] font-medium leading-10 tracking-tight md:text-[2rem] md:leading-12">
        {children}
      </h1>
      {sub && (
        <p className="mt-2 text-sm leading-5 text-secondary-foreground">
          {sub}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* 1 · Start                                                                */
/* ------------------------------------------------------------------------ */

/**
 * One question. A website is the cheapest thing a solopreneur can give us that
 * says what they do, who for and how they talk — so it is the only field, and
 * describing it in words is the fallback rather than a second form.
 */
export function StartStep({
  onRead,
  onDescribe,
  onSkip,
}: {
  onRead: (website: string) => void
  onDescribe: (text: string) => void
  onSkip: () => void
}) {
  const [website, setWebsite] = useState('')
  const [describing, setDescribing] = useState(false)
  const [text, setText] = useState('')
  const valid = /\w+\.\w{2,}/.test(website.trim())

  return (
    <OnboardingFrame stepIndex={0}>
      <Title sub="Tell us where your business lives online. We’ll read it and write your first week of posts — in your words, ready for you to check.">
        Let’s write your first week of posts
      </Title>

      {!describing ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onRead(website.trim())
          }}
        >
          <label
            className="text-xs font-medium text-input-label"
            htmlFor="website"
          >
            Your website
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="website"
              variant="primary"
              inputSize="lg"
              autoFocus
              placeholder="yourbusiness.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <Button type="submit" variant="accent" size="xl" disabled={!valid}>
              <SparkleIcon weight="fill" />
              Read my website
            </Button>
          </div>
          <button
            type="button"
            className="self-start pt-1 text-[13px] text-secondary-foreground underline-offset-4 hover:text-primary-foreground hover:underline"
            onClick={() => setDescribing(true)}
          >
            No website? Describe your business instead
          </button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim().length > 10) onDescribe(text.trim())
          }}
        >
          <label
            className="text-xs font-medium text-input-label"
            htmlFor="describe"
          >
            What do you do, and who is it for?
          </label>
          <Textarea
            id="describe"
            autoFocus
            placeholder="I design brands for independent cafés and bakeries in Lisbon…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-[13px] text-secondary-foreground underline-offset-4 hover:text-primary-foreground hover:underline"
              onClick={() => setDescribing(false)}
            >
              I have a website after all
            </button>
            <Button
              type="submit"
              variant="accent"
              size="xl"
              disabled={text.trim().length <= 10}
            >
              Continue
            </Button>
          </div>
        </form>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-quaternary pt-5 text-[13px] text-tertiary-foreground">
        <span>About a minute. Nothing is posted without your OK.</span>
        <button
          type="button"
          className="underline-offset-4 hover:text-primary-foreground hover:underline"
          onClick={onSkip}
        >
          Skip for now
        </button>
      </div>
    </OnboardingFrame>
  )
}

/* ------------------------------------------------------------------------ */
/* 2 · Reading                                                              */
/* ------------------------------------------------------------------------ */

/**
 * The read, shown working. Pages tick off on the left and what they taught us
 * lands on the right as it is learned — a minute of waiting that ends with the
 * person already having seen most of the next screen.
 */
export function ReadingStep({
  domain,
  speed,
  onDone,
}: {
  domain: string
  speed: number
  onDone: () => void
}) {
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (done >= READ_PAGES.length) return
    const timer = window.setTimeout(
      () => setDone((d) => d + 1),
      READ_PAGES[done].ms / speed,
    )
    return () => window.clearTimeout(timer)
  }, [done, speed])

  const finished = done >= READ_PAGES.length
  const learned = (afterPage: number) => done > afterPage

  return (
    <OnboardingFrame stepIndex={0} wide>
      <Title
        sub={
          finished
            ? 'Done. Next you’ll check it — anything we got wrong takes a second to fix.'
            : 'We’re reading the pages that say what you do. Your first draft depends on this, so it takes a moment.'
        }
      >
        {finished ? `We’ve read ${domain}` : `Reading ${domain}…`}
      </Title>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <ul className="flex flex-col gap-3">
          {READ_PAGES.map((page, i) => (
            <li
              key={page.path}
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
                {page.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
            What we’ve learned
          </p>
          <Finding show={learned(FINDINGS.what.afterPage)} label="What you do">
            {FINDINGS.what.text}
          </Finding>
          <Finding show={learned(FINDINGS.who.afterPage)} label="Who it’s for">
            {FINDINGS.who.text}
          </Finding>
          <Finding
            show={learned(FINDINGS.tone.afterPage)}
            label="How you sound"
          >
            {FINDINGS.tone.words.join(' · ')}
          </Finding>
          <Finding
            show={learned(FINDINGS.facts.afterPage)}
            label="Facts to use"
          >
            {FINDINGS.facts.items.length} things like prices, places and past
            work
          </Finding>
        </div>
      </div>

      <div className="mt-10 flex h-11 justify-end">
        {finished && (
          <Button variant="accent" size="xl" onClick={onDone}>
            See what we found
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
    return <div className="h-[68px] animate-pulse bg-secondary" aria-hidden />
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 bg-secondary px-4 py-3">
      <p className="text-xs text-tertiary-foreground">{label}</p>
      <p className="mt-0.5 text-sm leading-5 text-primary-foreground">
        {children}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* 3 · Is this you?                                                         */
/* ------------------------------------------------------------------------ */

export type Profile = {
  what: string
  who: string
  tone: string[]
  facts: string[]
}

/**
 * The review, in the tester's words: what you do, who for, how you sound,
 * facts. These are the voice, the audience and the facts ledger, and none of
 * those words appears. It saves as you type — the one save rule this test is
 * also checking — and says so in the corner rather than with a button.
 */
export function ReviewStep({
  profile,
  onChange,
  onBack,
  onNext,
}: {
  profile: Profile
  onChange: (profile: Profile) => void
  onBack: () => void
  onNext: () => void
}) {
  const saving = useSavePulse(profile)
  const [newFact, setNewFact] = useState('')

  return (
    <OnboardingFrame stepIndex={1} wide>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-medium leading-10 tracking-tight md:text-[2rem] md:leading-12">
            Is this you?
          </h1>
          <p className="mt-2 text-sm leading-5 text-secondary-foreground">
            Ogen writes from this. Fix anything that’s off — you can change it
            later in your Library.
          </p>
        </div>
        <SaveMark saving={saving} />
      </div>

      <div className="flex flex-col gap-6">
        <Field label="What you do">
          <Textarea
            className="min-h-16"
            value={profile.what}
            onChange={(e) => onChange({ ...profile, what: e.target.value })}
          />
        </Field>

        <Field label="Who it’s for">
          <Textarea
            className="min-h-16"
            value={profile.who}
            onChange={(e) => onChange({ ...profile, who: e.target.value })}
          />
        </Field>

        <Field
          label="How you sound"
          hint="Pick three — a fourth replaces the first"
        >
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((word) => {
              const on = profile.tone.includes(word)
              return (
                <button
                  key={word}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onChange({
                      ...profile,
                      tone: on
                        ? profile.tone.filter((w) => w !== word)
                        : [...profile.tone, word].slice(-3),
                    })
                  }
                  className={cn(
                    'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
                    on
                      ? 'border-primary-foreground bg-primary-foreground text-primary'
                      : 'border-quaternary text-secondary-foreground hover:border-primary-foreground hover:text-primary-foreground',
                  )}
                >
                  {word}
                </button>
              )
            })}
          </div>
          <blockquote className="mt-3 border-l-2 border-accent pl-3 text-sm italic leading-5 text-secondary-foreground">
            “{FINDINGS.tone.sample}”
            <span className="mt-1 block text-xs not-italic text-tertiary-foreground">
              A line from your site that sounds most like you
            </span>
          </blockquote>
        </Field>

        <Field
          label="Facts Ogen can use"
          hint="Ogen won’t make up prices, places or clients — only these"
        >
          <ul className="flex flex-col">
            {profile.facts.map((fact, i) => (
              <li
                key={fact}
                className="group flex items-start justify-between gap-3 border-b border-quaternary py-2 text-sm leading-5"
              >
                <span>{fact}</span>
                <button
                  type="button"
                  aria-label={`Remove “${fact}”`}
                  className="mt-0.5 text-tertiary-foreground opacity-0 transition-opacity hover:text-primary-foreground group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() =>
                    onChange({
                      ...profile,
                      facts: profile.facts.filter((_, j) => j !== i),
                    })
                  }
                >
                  <XIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const fact = newFact.trim()
              if (!fact) return
              onChange({ ...profile, facts: [...profile.facts, fact] })
              setNewFact('')
            }}
          >
            <PlusIcon className="size-4 text-tertiary-foreground" />
            <Input
              variant="search"
              className="px-0"
              placeholder="Add a fact — a price, an award, an opening date…"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
            />
          </form>
        </Field>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
        <Button variant="accent" size="xl" onClick={onNext}>
          Looks right
        </Button>
      </div>
    </OnboardingFrame>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-tertiary-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * "Saving…" for a beat after every change, then "Saved". Fake, but the same
 * rhythm as the post editor's 600ms autosave, which is the point: everywhere
 * in this prototype, typing is saving.
 */
export function useSavePulse(value: unknown): boolean {
  const [saving, setSaving] = useState(false)
  const first = useRef(true)
  const serialised = JSON.stringify(value)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaving(true)
    const timer = window.setTimeout(() => setSaving(false), 700)
    return () => window.clearTimeout(timer)
  }, [serialised])
  return saving
}

export function SaveMark({ saving }: { saving: boolean }) {
  return (
    <span
      aria-live="polite"
      className="mt-3 flex shrink-0 items-center gap-1.5 text-xs text-tertiary-foreground"
    >
      {saving ? (
        <>
          <CircleNotchIcon className="size-3.5 animate-spin" /> Saving…
        </>
      ) : (
        <>
          <CheckIcon weight="bold" className="size-3.5 text-accent" /> Saved
        </>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------------ */
/* 4 · Where you post                                                       */
/* ------------------------------------------------------------------------ */

/**
 * Where and how often, on one screen. Accounts are *not* connected here: that
 * is an OAuth round trip per network before the person has seen a single
 * post. They connect at the moment it matters — the first time they schedule.
 */
export function ChannelsStep({
  platforms,
  rhythm,
  found,
  onChange,
  onBack,
  onNext,
}: {
  platforms: PlatformId[]
  rhythm: Rhythm
  found: PlatformId[]
  onChange: (next: { platforms: PlatformId[]; rhythm: Rhythm }) => void
  onBack: () => void
  onNext: () => void
}) {
  const foundNames = found
    .map((id) => getPlatformByZernioId(id)?.name)
    .filter(Boolean)
  return (
    <OnboardingFrame stepIndex={2} wide>
      <Title
        sub={
          foundNames.length > 0
            ? `Your site links to ${foundNames.join(' and ')}, so we’ve started there. You’ll connect accounts when you schedule your first post.`
            : 'You’ll connect accounts when you schedule your first post.'
        }
      >
        Where do you post?
      </Title>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {OFFERED_PLATFORMS.map((id) => {
          const info = getPlatformByZernioId(id)
          if (!info) return null
          const on = platforms.includes(id)
          const Icon = info.icon
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange({
                  rhythm,
                  platforms: on
                    ? platforms.filter((p) => p !== id)
                    : [...platforms, id],
                })
              }
              className={cn(
                'relative flex h-16 items-center gap-3 border px-4 text-left text-sm font-medium transition-colors',
                on
                  ? 'border-primary-foreground bg-secondary'
                  : 'border-quaternary hover:border-tertiary-foreground',
              )}
            >
              <Icon
                weight="fill"
                className="size-6"
                style={{ color: info.color }}
              />
              {info.name === 'Twitter' ? 'X' : info.name}
              {on && (
                <CheckIcon
                  weight="bold"
                  className="absolute right-3 top-3 size-3.5 text-primary-foreground"
                />
              )}
            </button>
          )
        })}
      </div>

      <p className="mb-3 mt-8 text-sm font-medium">How often?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {RHYTHMS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={rhythm === r.id}
            onClick={() => onChange({ platforms, rhythm: r.id })}
            className={cn(
              'flex flex-col items-start gap-0.5 border px-4 py-3 text-left transition-colors',
              rhythm === r.id
                ? 'border-primary-foreground bg-secondary'
                : 'border-quaternary hover:border-tertiary-foreground',
            )}
          >
            <span className="text-sm font-medium">{r.label}</span>
            <span className="text-xs text-tertiary-foreground">{r.note}</span>
          </button>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
        <Button
          variant="accent"
          size="xl"
          disabled={platforms.length === 0}
          onClick={onNext}
        >
          <SparkleIcon weight="fill" />
          Write my first week
        </Button>
      </div>
    </OnboardingFrame>
  )
}

/* ------------------------------------------------------------------------ */
/* 5 · Writing                                                              */
/* ------------------------------------------------------------------------ */

/**
 * The week filling in. Each chosen day gets a card that turns from a shimmer
 * into its angle — the same week the next screen opens on, so the hand-off is
 * the cards staying put while the frame around them changes.
 */
export function WritingStep({
  rhythm,
  speed,
  onDone,
}: {
  rhythm: Rhythm
  speed: number
  onDone: () => void
}) {
  const days = RHYTHM_DAYS[rhythm]
  const [written, setWritten] = useState(0)
  const monday = firstMonday()

  useEffect(() => {
    if (written > days.length) return
    const timer = window.setTimeout(
      () => (written === days.length ? onDone() : setWritten((n) => n + 1)),
      (written === days.length ? 900 : 1100) / speed,
    )
    return () => window.clearTimeout(timer)
  }, [written, days.length, speed, onDone])

  return (
    <OnboardingFrame stepIndex={3} wide>
      <Title sub="Each post is written from what you told us, for the places you picked.">
        {written < days.length
          ? 'Writing your first week…'
          : 'Your first week is ready'}
      </Title>
      <div className="grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((day) => {
          const date = addDays(monday, day)
          const index = days.indexOf(day)
          const draft = DRAFTS.find((d) => d.day === day)
          return (
            <div key={day} className="flex min-h-40 flex-col gap-2">
              <p className="text-xs text-tertiary-foreground">
                {formatDate(date, { weekday: 'short' })}{' '}
                <span className="text-secondary-foreground">
                  {formatDate(date, { day: 'numeric' })}
                </span>
              </p>
              {index === -1 ? null : index < written ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-1 bg-secondary p-2.5">
                  <span className="text-[11px] text-tertiary-foreground">
                    {draft?.time}
                  </span>
                  <span className="text-[13px] font-medium leading-4">
                    {draft?.angle}
                  </span>
                </div>
              ) : (
                <div className="h-16 animate-pulse bg-secondary" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </OnboardingFrame>
  )
}
