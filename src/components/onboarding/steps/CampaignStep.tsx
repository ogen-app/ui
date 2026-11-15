import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextSelect } from '@/components/ui/text-select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib'
import { counted } from '@/lib/intl'
import type { PlatformInfo } from '@/lib/platformDictionary'
import { DISABLED_ACCENT, StepCard, StepFooter } from '../OnboardingFrame'

/**
 * The first campaign's brief — the fields a marketer writes anyway, in the
 * campaign's own words: a name, a type, what it is for, a window, the
 * platforms, and a rate. The rate is per week, as `estimated_post_count` is
 * read since CON-182, and the line under it says what that comes to over the
 * window, so the number is never a guess about a total.
 */
export type OnboardingBrief = {
  name: string
  typeId: string
  goal: string
  start: string | null
  end: string | null
  platforms: string[]
  perWeek: number
}

export function CampaignStep({
  brief,
  types,
  platforms,
  onChange,
  onBack,
  onPlan,
}: {
  brief: OnboardingBrief
  /** The workspace's campaign types. */
  types: { id: string; name: string }[]
  /** The connected platforms — the brief can only name those. */
  platforms: PlatformInfo[]
  onChange: (brief: OnboardingBrief) => void
  onBack: () => void
  onPlan: () => void
}) {
  const { t } = useTranslation()
  const ids = {
    name: useId(),
    type: useId(),
    goal: useId(),
    start: useId(),
    end: useId(),
    rate: useId(),
  }
  const set = (patch: Partial<OnboardingBrief>) =>
    onChange({ ...brief, ...patch })
  const weeks = weeksBetween(brief.start, brief.end)
  const complete =
    brief.name.trim() !== '' &&
    brief.typeId !== '' &&
    weeks > 0 &&
    brief.platforms.length > 0 &&
    brief.perWeek > 0

  return (
    <StepCard
      title={t('onboarding.campaign.title')}
      lead={t('onboarding.campaign.lead')}
      footer={
        <StepFooter
          onBack={onBack}
          next={
            <Button
              variant="accent"
              className={DISABLED_ACCENT}
              disabled={!complete}
              onClick={onPlan}
            >
              {t('onboarding.campaign.plan')}
            </Button>
          }
        />
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field id={ids.name} label={t('onboarding.campaign.name')}>
          <Input
            id={ids.name}
            value={brief.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field id={ids.type} label={t('onboarding.campaign.type')}>
          <TextSelect
            id={ids.type}
            value={brief.typeId}
            onValueChange={(typeId) => set({ typeId })}
            elements={types.map((ty) => ({ id: ty.id, displayValue: ty.name }))}
          />
        </Field>
        <Field
          id={ids.goal}
          label={t('onboarding.campaign.goal')}
          className="md:col-span-2"
        >
          <Textarea
            id={ids.goal}
            value={brief.goal}
            onChange={(e) => set({ goal: e.target.value })}
          />
        </Field>
        <Field id={ids.start} label={t('onboarding.campaign.start')}>
          <DatePicker
            id={ids.start}
            value={brief.start}
            onChange={(start) => set({ start })}
          />
        </Field>
        <Field id={ids.end} label={t('onboarding.campaign.end')}>
          <DatePicker
            id={ids.end}
            value={brief.end}
            min={brief.start ?? undefined}
            onChange={(end) => set({ end })}
          />
        </Field>
        <div className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm leading-5 font-medium">
            {t('onboarding.campaign.platforms')}
          </span>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const on = brief.platforms.includes(p.zernioId)
              const Icon = p.icon
              return (
                <button
                  key={p.zernioId}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      platforms: on
                        ? brief.platforms.filter((x) => x !== p.zernioId)
                        : [...brief.platforms, p.zernioId],
                    })
                  }
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors',
                    on
                      ? 'border-foreground bg-secondary font-medium'
                      : 'border-quaternary text-secondary-foreground hover:border-foreground',
                  )}
                >
                  <Icon
                    aria-hidden
                    weight="fill"
                    className="size-4"
                    style={{ color: p.color }}
                  />
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>
        <Field id={ids.rate} label={t('onboarding.campaign.rate')}>
          <Input
            id={ids.rate}
            type="number"
            min={1}
            max={21}
            value={brief.perWeek || ''}
            onChange={(e) => set({ perWeek: Number(e.target.value) || 0 })}
          />
          {weeks > 0 && brief.perWeek > 0 && (
            <p className="text-xs leading-4 text-tertiary-foreground">
              {t('onboarding.campaign.total', {
                ...counted(weeks * brief.perWeek),
                weeks: t('onboarding.campaign.weeks', counted(weeks)),
              })}
            </p>
          )}
        </Field>
      </div>
    </StepCard>
  )
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

/** Whole weeks in an inclusive window, rounded up; 0 without one. */
function weeksBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const days =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000 +
    1
  return days > 0 ? Math.ceil(days / 7) : 0
}
