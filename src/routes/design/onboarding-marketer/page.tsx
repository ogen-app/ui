import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'

import { cn } from '@/lib'

import { BrandStep } from './-brand'
import {
  AccountsStep,
  CampaignStep,
  PlanningStep,
  briefFromIdea,
} from './-campaign'
import {
  CLIENT,
  FOUND_ACCOUNTS,
  SOURCE_FILES,
  proposalFrom,
  type Account,
  type Brand,
  type Brief,
  type PlatformId,
} from './-fixtures'
import { RailProvider } from './-frame'
import { STAGES, STEPS, type Step } from './-flow'
import {
  ReadingStep,
  SourcesStep,
  YouStep,
  givenSources,
  type Setup,
} from './-setup'
import { Workspace } from './-workspace'

const EMPTY_SETUP: Setup = {
  role: null,
  business: '',
  website: '',
  files: [],
  notes: '',
}

/** What a moderator's jump fills in for the screens it skips. */
const PERSONA_SETUP: Setup = {
  role: 'freelancer',
  business: CLIENT.name,
  website: CLIENT.website,
  files: SOURCE_FILES.map((f) => f.id),
  notes:
    'The family dislikes the word “luxury”. Always link to our own booking page, never to Booking.com.',
}

const at = (s: Step) => STEPS.indexOf(s)

/**
 * TEMPORARY design harness — onboarding for a freelance marketer (or a
 * founder who knows marketing) as one clickable flow, for moderated tests.
 * Nothing here talks to the API.
 *
 * The question it answers: will someone who values what Ogen does put fifteen
 * minutes into setting up a client properly — sources, brand, accounts, a
 * first campaign brief — and does what comes out the other end feel worth
 * that time? The flow:
 *
 *   you → sources → reading → brand → accounts → campaign → planning → workspace
 *
 * Delete `routes/design/` and the `/design` exemption in `__root.tsx` when
 * the design is settled.
 */
export function MarketerOnboardingHarness() {
  const search = useSearch({ from: '/design/onboarding-marketer/' })
  const initial = search.step ?? 'you'
  const jumped = at(initial) > at('you')

  const [step, setStep] = useState<Step>(initial)
  const [run, setRun] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [setup, setSetup] = useState<Setup>(
    jumped ? PERSONA_SETUP : EMPTY_SETUP,
  )
  const [brand, setBrand] = useState<Brand | null>(() =>
    at(initial) > at('reading')
      ? proposalFrom(givenSources(PERSONA_SETUP))
      : null,
  )
  const [accounts, setAccounts] = useState<Account[]>(FOUND_ACCOUNTS)
  const [connected, setConnected] = useState<PlatformId[]>([])
  const [brief, setBrief] = useState<Brief | null>(() =>
    at(initial) > at('campaign')
      ? briefFromIdea(
          'winter',
          proposalFrom(givenSources(PERSONA_SETUP)),
          FOUND_ACCOUNTS.map((a) => a.platform),
        )
      : null,
  )

  const domain =
    setup.website
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '') || CLIENT.website

  const restart = () => {
    setSetup(EMPTY_SETUP)
    setBrand(null)
    setAccounts(FOUND_ACCOUNTS)
    setConnected([])
    setBrief(null)
    setRun((r) => r + 1)
    setStep('you')
  }

  /** The moderator's jump: fill whatever the skipped screens would have. */
  const jump = (next: Step) => {
    let s = setup
    if (at(next) > at('you') && (!s.role || !s.business)) {
      s = { ...PERSONA_SETUP, ...pickFilled(s) }
      setSetup(s)
    }
    let b = brand
    if (at(next) > at('reading') && !b) {
      b = proposalFrom(givenSources(s))
      setBrand(b)
    }
    if (at(next) > at('campaign') && !brief && b) {
      setBrief(
        briefFromIdea(
          'winter',
          b,
          connected.length > 0 ? connected : accounts.map((a) => a.platform),
        ),
      )
    }
    setStep(next)
    setRun((r) => r + 1)
  }

  /** One line per finished stage, for the rail. */
  const summaries = [
    setup.role === 'founder'
      ? 'Own business'
      : setup.role
        ? 'For clients'
        : undefined,
    setup.files.length > 0
      ? `Website + ${setup.files.length} doc${setup.files.length === 1 ? '' : 's'}`
      : 'Website',
    brand
      ? `${brand.traits.length} traits · ${brand.rules.length} rules`
      : undefined,
    connected.length > 0 ? `${connected.length} connected` : 'Later',
    brief?.name,
  ]

  return (
    <RailProvider
      value={{
        title: setup.business.trim()
          ? `Setting up ${setup.business.trim()}`
          : 'Setting up Ogen',
        summaries,
        onStage: (i) => setStep(STAGES[i].steps[0]),
      }}
    >
      <div key={`${step}-${run}`}>
        {step === 'you' && (
          <YouStep
            setup={setup}
            onChange={setSetup}
            onNext={() => setStep('sources')}
          />
        )}
        {step === 'sources' && (
          <SourcesStep
            setup={setup}
            onChange={setSetup}
            onBack={() => setStep('you')}
            onNext={() => setStep('reading')}
          />
        )}
        {step === 'reading' && (
          <ReadingStep
            setup={setup}
            domain={domain}
            speed={speed}
            onDone={() => {
              setBrand(proposalFrom(givenSources(setup)))
              setStep('brand')
            }}
          />
        )}
        {step === 'brand' && brand && (
          <BrandStep
            brand={brand}
            onChange={setBrand}
            onBack={() => setStep('sources')}
            onNext={() => setStep('accounts')}
          />
        )}
        {step === 'accounts' && (
          <AccountsStep
            business={setup.business}
            role={setup.role}
            accounts={accounts}
            connected={connected}
            onAccounts={setAccounts}
            onConnected={setConnected}
            onBack={() => setStep('brand')}
            onNext={() => setStep('campaign')}
          />
        )}
        {step === 'campaign' && brand && (
          <CampaignStep
            brand={brand}
            accounts={accounts}
            connected={connected}
            brief={brief}
            onBrief={setBrief}
            onBack={() => setStep('accounts')}
            onNext={() => setStep('planning')}
          />
        )}
        {step === 'planning' && brief && brand && (
          <PlanningStep
            brief={brief}
            brand={brand}
            speed={speed}
            onDone={() => setStep('workspace')}
          />
        )}
        {step === 'workspace' && brief && brand && (
          <Workspace
            setup={setup}
            brand={brand}
            onBrand={setBrand}
            brief={brief}
            onBrief={setBrief}
            accounts={accounts}
            connected={connected}
            onConnected={setConnected}
            domain={domain}
          />
        )}
      </div>

      {search.tools && (
        <ModeratorBar
          step={step}
          speed={speed}
          onSpeed={setSpeed}
          onGo={jump}
          onRestart={restart}
        />
      )}
    </RailProvider>
  )
}

/** The fields a tester has already typed, so a jump doesn't erase them. */
function pickFilled(s: Setup): Partial<Setup> {
  return Object.fromEntries(
    Object.entries(s).filter(([, v]) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v),
    ),
  )
}

/**
 * The moderator's bar, only with `?tools`: jump to any screen, restart the
 * whole flow between testers, and speed the two waits up while rehearsing.
 */
function ModeratorBar({
  step,
  speed,
  onSpeed,
  onGo,
  onRestart,
}: {
  step: Step
  speed: number
  onSpeed: (s: number) => void
  onGo: (s: Step) => void
  onRestart: () => void
}) {
  return (
    <div
      className="fixed bottom-3 left-3 flex items-center gap-1 rounded-full bg-primary-foreground px-2 py-1.5 text-xs text-primary shadow-lg"
      style={{ zIndex: 60 }}
    >
      {STEPS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onGo(s)}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            s === step
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-primary/15',
          )}
        >
          {s}
        </button>
      ))}
      <span className="mx-1 h-4 w-px bg-primary/30" />
      <button
        type="button"
        onClick={() => onSpeed(speed === 1 ? 4 : 1)}
        className="rounded-full px-2.5 py-1 hover:bg-primary/15"
      >
        {speed === 1 ? 'real speed' : '4× speed'}
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-full px-2.5 py-1 hover:bg-primary/15"
      >
        restart
      </button>
    </div>
  )
}
