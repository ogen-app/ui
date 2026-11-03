import { useCallback, useState } from 'react'
import { useSearch } from '@tanstack/react-router'

import { cn } from '@/lib'

import {
  FINDINGS,
  FOUND_PLATFORMS,
  PERSONA,
  type PlatformId,
  type Rhythm,
} from './-fixtures'
import { STEPS, type Step } from './-flow'
import {
  ChannelsStep,
  ReadingStep,
  ReviewStep,
  StartStep,
  WritingStep,
  type Profile,
} from './-steps'
import { Workspace, buildWeek } from './-workspace'

const INITIAL_PROFILE: Profile = {
  what: FINDINGS.what.text,
  who: FINDINGS.who.text,
  tone: [...FINDINGS.tone.words],
  facts: [...FINDINGS.facts.items],
}

/**
 * TEMPORARY design harness — solopreneur onboarding as one clickable flow,
 * for moderated tests with first users. Nothing here talks to the API.
 *
 * The question it answers: can someone who has never seen Ogen get from
 * "what's your website?" to a scheduled post without meeting a campaign, a
 * content bank or a brand knowledge base — and do they understand where
 * things live once they're in? The flow:
 *
 *   start → reading → review → channels → writing → workspace
 *
 * Delete `routes/design/` and the `/design` exemption in `__root.tsx` when
 * the design is settled.
 */
export function OnboardingDesignHarness() {
  const search = useSearch({ from: '/design/onboarding/' })
  const [step, setStep] = useState<Step>(search.step ?? 'start')
  const [run, setRun] = useState(0)
  const [domain, setDomain] = useState(PERSONA.website)
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE)
  const [platforms, setPlatforms] = useState<PlatformId[]>(FOUND_PLATFORMS)
  const [rhythm, setRhythm] = useState<Rhythm>(3)
  const [skipped, setSkipped] = useState(false)
  const [speed, setSpeed] = useState(1)

  const restart = () => {
    setProfile(INITIAL_PROFILE)
    setPlatforms(FOUND_PLATFORMS)
    setRhythm(3)
    setSkipped(false)
    setDomain(PERSONA.website)
    setRun((r) => r + 1)
    setStep('start')
  }

  const go = (next: Step) => {
    if (next !== 'workspace') setSkipped(false)
    setStep(next)
    setRun((r) => r + 1)
  }

  const toWorkspace = useCallback(() => setStep('workspace'), [])

  return (
    <>
      <div key={`${step}-${run}`}>
        {step === 'start' && (
          <StartStep
            onRead={(website) => {
              setDomain(website.replace(/^https?:\/\//, '').replace(/\/$/, ''))
              setStep('reading')
            }}
            onDescribe={() => {
              setDomain('your description')
              setStep('reading')
            }}
            onSkip={() => {
              setSkipped(true)
              setStep('workspace')
            }}
          />
        )}
        {step === 'reading' && (
          <ReadingStep
            domain={domain}
            speed={speed}
            onDone={() => setStep('review')}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            profile={profile}
            onChange={setProfile}
            onBack={() => setStep('start')}
            onNext={() => setStep('channels')}
          />
        )}
        {step === 'channels' && (
          <ChannelsStep
            platforms={platforms}
            rhythm={rhythm}
            found={FOUND_PLATFORMS}
            onChange={(next) => {
              setPlatforms(next.platforms)
              setRhythm(next.rhythm)
            }}
            onBack={() => setStep('review')}
            onNext={() => setStep('writing')}
          />
        )}
        {step === 'writing' && (
          <WritingStep rhythm={rhythm} speed={speed} onDone={toWorkspace} />
        )}
        {step === 'workspace' && (
          <Workspace
            initialPosts={skipped ? [] : buildWeek(rhythm, platforms)}
            profile={profile}
            onProfileChange={setProfile}
            onRestart={restart}
          />
        )}
      </div>

      {search.tools && (
        <ModeratorBar
          step={step}
          speed={speed}
          onSpeed={setSpeed}
          onGo={go}
          onRestart={restart}
        />
      )}
    </>
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
      className="fixed top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary-foreground px-2 py-1.5 text-xs text-primary shadow-lg"
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
