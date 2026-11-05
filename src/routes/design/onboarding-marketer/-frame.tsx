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
 * The onboarding frame: the logo, the five stages named (this onboarding is
 * long on purpose, so it says how long), and one white column. No menu —
 * nothing here is a place to go yet.
 */
export function OnboardingFrame({
  step,
  width = 'base',
  aside,
  children,
}: {
  step: Step
  width?: 'base' | 'wide' | 'full'
  /** Right of the stepper — the save mark, usually. */
  aside?: ReactNode
  children: ReactNode
}) {
  const current = STAGES.findIndex((s) => s.steps.includes(step))
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center gap-6 px-6 md:px-10">
        <LogoFull className="h-6 w-auto shrink-0" />
        <ol
          className="mx-auto hidden items-center gap-1 md:flex"
          aria-label="Progress"
        >
          {STAGES.map((stage, i) => (
            <li
              key={stage.label}
              aria-current={i === current ? 'step' : undefined}
              className="flex items-center gap-1"
            >
              {i > 0 && <span className="h-px w-5 bg-quaternary" />}
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
                  i < current && 'text-secondary-foreground',
                  i === current &&
                    'bg-primary-foreground font-medium text-primary',
                  i > current && 'text-tertiary-foreground',
                )}
              >
                {i < current ? (
                  <CheckIcon weight="bold" className="size-3 text-accent" />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
                {stage.label}
              </span>
            </li>
          ))}
        </ol>
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
