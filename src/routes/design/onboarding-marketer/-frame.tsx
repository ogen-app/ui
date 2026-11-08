import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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

/** What the rail knows about the stages behind you — filled by the harness. */
type Rail = {
  /** "Setting up Haus Aurelia", once there is a name. */
  title: string
  /** One short line per finished stage, by stage index. */
  summaries: (string | undefined)[]
  /** Going back to a finished stage. */
  onStage?: (stage: number) => void
}

const RailContext = createContext<Rail>({
  title: 'Setting up Ogen',
  summaries: [],
})

export const RailProvider = RailContext.Provider

/**
 * The onboarding frame: the work on a white card, and beside it, on the page
 * rather than on the card, the rail — the five stages in one fixed shape that
 * never changes between steps. Finished stages fold to a tick and what they
 * settled; the current one opens to show what the step is doing (what the
 * sources will teach Ogen, the brand's sections, what the brief still needs);
 * the rest are a name and a few minutes. The line between them fills as you
 * go, so progress is felt rather than counted.
 *
 * Below `sm` the rail folds to one line above the card.
 */
export function OnboardingFrame({
  step,
  progress,
  aside,
  detail,
  children,
}: {
  step: Step
  /** How far through the current stage, 0–1. Defaults by sub-step. */
  progress?: number
  /** Top right of the rail — the save mark, usually. */
  aside?: ReactNode
  /** What the current stage shows when open. */
  detail?: ReactNode
  children: ReactNode
}) {
  const rail = useContext(RailContext)
  const current = STAGES.findIndex((s) => s.steps.includes(step))
  const stage = STAGES[current]
  const within = Math.max(
    0,
    Math.min(
      1,
      progress ?? (stage.steps.indexOf(step) + 1) / (stage.steps.length + 1),
    ),
  )
  const left = Math.round(
    STAGES.slice(current + 1).reduce((n, s) => n + s.minutes, 0) +
      stage.minutes * (1 - within),
  )

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="shrink-0 px-4 pt-5 sm:px-6 md:px-10">
        <LogoFull className="h-6 w-auto" />
      </header>
      <main className="mx-auto grid w-full max-w-[1060px] flex-1 content-start gap-5 px-4 pb-16 pt-6 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-6 sm:px-6 md:pt-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div
          key={step}
          className="animate-in fade-in slide-in-from-bottom-2 order-2 min-w-0 bg-primary px-6 py-8 duration-300 sm:order-1 md:px-10 md:py-10"
        >
          {children}
        </div>

        <aside className="order-1 self-start sm:sticky sm:top-6 sm:order-2 sm:pt-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium">{rail.title}</p>
            {aside}
          </div>
          <p className="mt-1 text-xs text-tertiary-foreground">
            {left > 0 ? `About ${left} min left` : 'Almost there'}
          </p>

          {/* Narrow: one line and five segments. */}
          <div className="mt-3 sm:hidden">
            <div className="grid grid-cols-5 gap-1">
              {STAGES.map((s, i) => (
                <Fill
                  key={s.label}
                  value={i < current ? 1 : i === current ? within : 0}
                  className="h-1"
                />
              ))}
            </div>
            <p className="mt-2 text-xs">
              <span className="text-tertiary-foreground">
                {current + 1} of {STAGES.length} ·{' '}
              </span>
              <span className="font-medium">{stage.label}</span>
            </p>
          </div>

          <ol className="mt-6 hidden flex-col sm:flex" aria-label="Progress">
            {STAGES.map((s, i) => {
              const state =
                i < current ? 'done' : i === current ? 'active' : 'todo'
              const last = i === STAGES.length - 1
              const back = state === 'done' && rail.onStage
              const Label = back ? 'button' : 'div'
              return (
                <li
                  key={s.label}
                  aria-current={state === 'active' ? 'step' : undefined}
                  className="flex gap-3"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums transition-colors duration-500',
                        state === 'done' && 'bg-accent text-primary',
                        state === 'active' &&
                          'bg-primary-foreground text-primary',
                        state === 'todo' &&
                          'border border-quaternary text-tertiary-foreground',
                      )}
                    >
                      {state === 'done' ? (
                        <CheckIcon weight="bold" className="size-3" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {!last && (
                      <Fill
                        vertical
                        value={
                          state === 'done' ? 1 : state === 'active' ? within : 0
                        }
                        className="my-1 w-0.5 flex-1"
                      />
                    )}
                  </div>
                  <div className={cn('min-w-0 flex-1', !last && 'pb-5')}>
                    <Label
                      {...(back
                        ? { type: 'button', onClick: () => rail.onStage?.(i) }
                        : {})}
                      className={cn(
                        'flex w-full items-baseline justify-between gap-3 text-left text-sm leading-5',
                        back && 'group',
                      )}
                    >
                      <span
                        className={cn(
                          'shrink-0',
                          state === 'active' && 'font-medium',
                          state === 'done' &&
                            'text-secondary-foreground group-hover:text-primary-foreground',
                          state === 'todo' && 'text-tertiary-foreground',
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="truncate text-xs tabular-nums text-tertiary-foreground">
                        {state === 'done'
                          ? rail.summaries[i]
                          : state === 'todo'
                            ? `${s.minutes} min`
                            : null}
                      </span>
                    </Label>
                    {state === 'active' && detail && (
                      <div className="animate-in fade-in mt-3 duration-300">
                        {detail}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </aside>
      </main>
    </div>
  )
}

/** A track with an accent fill — horizontal, or down the rail. */
export function Fill({
  value,
  vertical,
  className,
}: {
  value: number
  vertical?: boolean
  className?: string
}) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`
  return (
    <span
      className={cn(
        'relative block overflow-hidden rounded-full bg-quaternary',
        className,
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-0 rounded-full bg-accent ease-out',
          vertical
            ? 'w-full transition-[height] duration-700'
            : 'h-full transition-[width] duration-500',
        )}
        style={vertical ? { height: pct } : { width: pct }}
      />
    </span>
  )
}

/** A small caption inside the rail's open stage. */
export function RailCaption({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 text-xs text-tertiary-foreground">{children}</p>
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
