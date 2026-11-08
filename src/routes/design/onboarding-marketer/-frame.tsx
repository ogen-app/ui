import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeftIcon,
  CheckIcon,
  CircleNotchIcon,
} from '@phosphor-icons/react'

import LogoFull from '@/assets/logo-full.svg?react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'

import { sourceLabel, type Cited } from './-fixtures'
import { STAGES, type Step } from './-flow'

/**
 * The onboarding frame: the logo, the five stages as one bar that fills (this
 * onboarding is long on purpose, so it shows how far along you are at every
 * width), and one white column. No menu — nothing here is a place to go yet.
 */
export function OnboardingFrame({
  step,
  width = 'base',
  progress,
  aside,
  children,
}: {
  step: Step
  width?: 'base' | 'wide' | 'full'
  /** How far through the current stage, 0–1. Defaults by sub-step. */
  progress?: number
  /** Right of the progress bar — the save mark, usually. */
  aside?: ReactNode
  children: ReactNode
}) {
  const current = STAGES.findIndex((s) => s.steps.includes(step))
  const stage = STAGES[current]
  const within =
    progress ?? (stage.steps.indexOf(step) + 1) / (stage.steps.length + 1)
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-start gap-6 px-6 pt-5 md:px-10">
        <LogoFull className="mt-0.5 h-6 w-auto shrink-0" />
        <div className="mx-auto w-full max-w-[640px]">
          <ol className="grid grid-cols-5 gap-1.5" aria-label="Progress">
            {STAGES.map((s, i) => {
              const fill = i < current ? 1 : i === current ? within : 0
              return (
                <li
                  key={s.label}
                  aria-current={i === current ? 'step' : undefined}
                  className="flex min-w-0 flex-col gap-2"
                >
                  <span className="h-1 w-full overflow-hidden rounded-full bg-quaternary">
                    <span
                      className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
                      style={{
                        width: `${Math.max(0, Math.min(1, fill)) * 100}%`,
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      'hidden items-center gap-1 truncate text-xs md:flex',
                      i < current && 'text-secondary-foreground',
                      i === current && 'font-medium text-primary-foreground',
                      i > current && 'text-tertiary-foreground',
                    )}
                  >
                    {i < current && (
                      <CheckIcon
                        weight="bold"
                        className="size-3 shrink-0 text-accent"
                      />
                    )}
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-xs md:hidden">
            <span className="text-tertiary-foreground">
              {current + 1} of {STAGES.length} ·{' '}
            </span>
            <span className="font-medium">{stage.label}</span>
          </p>
        </div>
        <div className="flex w-24 shrink-0 justify-end">{aside}</div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 md:pt-10">
        <div
          className={cn(
            'animate-in fade-in slide-in-from-bottom-2 duration-300 w-full bg-primary px-6 py-8 md:px-10 md:py-10',
            width === 'base' && 'max-w-[620px]',
            width === 'wide' && 'max-w-[780px]',
            width === 'full' && 'max-w-[1040px]',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  )
}

export function Title({
  children,
  sub,
}: {
  children: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-[1.75rem] font-medium leading-10 tracking-tight md:text-[2rem] md:leading-12">
        {children}
      </h1>
      {sub && (
        <p className="mt-2 max-w-[60ch] text-sm leading-5 text-secondary-foreground">
          {sub}
        </p>
      )}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="text-right text-xs text-tertiary-foreground">{hint}</p>
        )}
      </div>
      {children}
    </div>
  )
}

/** Back on the left, the way on at the right. */
export function StepFooter({
  onBack,
  children,
  note,
}: {
  onBack?: () => void
  children: ReactNode
  note?: ReactNode
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4 border-t border-quaternary pt-6">
      {onBack ? (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
      ) : (
        <span className="text-[13px] text-tertiary-foreground">{note}</span>
      )}
      <div className="flex items-center gap-3">
        {onBack && note && (
          <span className="text-[13px] text-tertiary-foreground">{note}</span>
        )}
        {children}
      </div>
    </div>
  )
}

/** A pill that toggles. */
export function Chip({
  on,
  onClick,
  children,
  disabled,
}: {
  on: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors disabled:opacity-40',
        on
          ? 'border-primary-foreground bg-primary-foreground text-primary'
          : 'border-quaternary text-secondary-foreground hover:border-primary-foreground hover:text-primary-foreground',
      )}
    >
      {children}
    </button>
  )
}

/** A card-sized choice — role, goal, campaign idea. */
export function ChoiceCard({
  on,
  onClick,
  title,
  children,
  className,
}: {
  on: boolean
  onClick: () => void
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start gap-1 border px-4 py-3.5 text-left transition-colors',
        on
          ? 'border-primary-foreground bg-secondary'
          : 'border-quaternary hover:border-tertiary-foreground',
        className,
      )}
    >
      <span className="pr-6 text-sm font-medium">{title}</span>
      {children && (
        <span className="text-xs leading-4 text-secondary-foreground">
          {children}
        </span>
      )}
      {on && (
        <CheckIcon
          weight="bold"
          className="absolute right-3 top-3.5 size-3.5 text-primary-foreground"
        />
      )}
    </button>
  )
}

/** Where something Ogen proposes came from. Marketers check sources. */
export function Cite({ item }: { item: Cited }) {
  return (
    <span className="text-[11px] text-tertiary-foreground">
      {item.source === 'you'
        ? 'Added by you'
        : `From ${sourceLabel(item.source, item.ref)}`}
    </span>
  )
}

/**
 * "Saving…" for a beat after every change, then "Saved". Fake, but the same
 * rhythm as the post editor's 600ms autosave, which is the point: everywhere
 * in this prototype, typing is saving and there is no Save button.
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
      className="flex shrink-0 items-center gap-1.5 text-xs text-tertiary-foreground"
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

export function platformName(name: string | undefined) {
  return name === 'Twitter' ? 'X' : name
}
