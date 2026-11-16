import {
  CheckCircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib'
import type { OnboardingRole } from './flow'
import { verdictOf, type Need, type NeedLevel } from './needs'

const LEVEL_ICON = {
  missing: CircleDashedIcon,
  thin: CircleHalfIcon,
  enough: CheckCircleIcon,
} as const

const LEVEL_TONE: Record<NeedLevel, string> = {
  missing: 'text-tertiary-foreground',
  thin: 'text-warning',
  enough: 'text-accent',
}

const SEGMENT_TONE: Record<NeedLevel, string> = {
  // Hollow, not a grey fill: a fill that faint reads as the page showing through.
  missing: 'border border-quinary',
  thin: 'bg-warning',
  enough: 'bg-accent',
}

/**
 * What Ogen needs to sound like this business — not a profile of the client
 * but the list of what it takes to write posts that could be no one else's.
 *
 * Each need says how far along it is and, until it is enough, what would fill
 * it, so adding a source visibly buys something. Ogen's own colours throughout;
 * the client shows up only as their name and, once the website has been read,
 * their favicon.
 *
 * `blank` is the first screen's sheet: nothing is known yet, so it holds only
 * the name as it is typed, over grey bars where the needs will go.
 *
 * On a wide screen the sheet runs the full height of the step beside it, and
 * what it says stays in view while a long step scrolls.
 */
export function NeedsSheet({
  name,
  role,
  site,
  favicon,
  needs,
  active,
  blank,
}: {
  name: string
  role: OnboardingRole | null
  /** The website's host, once one is given. */
  site?: string
  favicon?: string
  needs: Need[]
  /** The need the current step is filling — lit on the sheet. */
  active?: Need['id'][]
  blank?: boolean
}) {
  const { t } = useTranslation()
  const shown =
    name.trim() ||
    t(
      role === 'own'
        ? 'onboarding.sheet.unnamedOwn'
        : 'onboarding.sheet.unnamedClient',
    )
  const enough = needs.filter((n) => n.level === 'enough').length

  return (
    <section className="flex flex-1 flex-col bg-primary">
      <div className="flex flex-col lg:sticky lg:top-10">
        <div className="flex items-center gap-3 border-b border-quaternary px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
            {favicon ? (
              <img src={favicon} alt="" className="size-6" />
            ) : (
              <span
                aria-hidden
                className="text-sm font-medium text-tertiary-foreground"
              >
                {name.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                'truncate text-base leading-6 font-medium',
                !name.trim() && 'text-tertiary-foreground',
              )}
            >
              {shown}
            </span>
            {site && (
              <span className="truncate text-xs leading-4 text-tertiary-foreground">
                {site}
              </span>
            )}
          </div>
        </div>

        {blank ? (
          <SheetSkeleton count={needs.length} />
        ) : (
          <>
            <div className="flex flex-col gap-2 px-5 pt-5 pb-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">
                  {t('onboarding.sheet.title')}
                </h2>
                <span className="text-xs text-tertiary-foreground tabular-nums">
                  {t('onboarding.sheet.meter', {
                    count: enough,
                    total: needs.length,
                  })}
                </span>
              </div>
              <div
                aria-hidden
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${needs.length}, minmax(0, 1fr))`,
                }}
              >
                {needs.map((n) => (
                  <span
                    key={n.id}
                    className={cn(
                      'h-1.5 rounded-full transition-colors duration-500',
                      SEGMENT_TONE[n.level],
                    )}
                  />
                ))}
              </div>
              <p className="text-sm leading-5 text-secondary-foreground">
                {t(`onboarding.sheet.verdict.${verdictOf(needs)}`)}
              </p>
            </div>
            <ul className="flex flex-col border-t border-quaternary">
              {needs.map((need) => (
                <NeedRow
                  key={need.id}
                  need={need}
                  lit={active?.includes(need.id) ?? false}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function NeedRow({ need, lit }: { need: Need; lit: boolean }) {
  const { t } = useTranslation()
  const Icon = LEVEL_ICON[need.level]
  return (
    <li
      className={cn(
        'flex gap-3 border-b border-quaternary px-5 py-3 last:border-b-0 transition-colors',
        lit && 'bg-secondary',
      )}
    >
      <Icon
        weight={need.level === 'enough' ? 'fill' : 'bold'}
        className={cn('mt-0.5 size-4 shrink-0', LEVEL_TONE[need.level])}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm leading-5 font-medium">
            {t(`onboarding.sheet.needs.${need.id}.label`)}
          </span>
          <span
            className={cn('shrink-0 text-xs leading-4', LEVEL_TONE[need.level])}
          >
            {t(`onboarding.sheet.levels.${need.level}`)}
          </span>
        </div>
        {need.level !== 'enough' && (
          <span className="text-xs leading-4 text-tertiary-foreground">
            {t(`onboarding.sheet.needs.${need.id}.hint`)}
          </span>
        )}
      </div>
    </li>
  )
}

/** Label and hint widths per row, so the placeholder reads as six needs rather than a striped block. */
const ROW_SHAPES = [
  ['w-36', 'w-4/5'],
  ['w-24', 'w-3/5'],
  ['w-32', 'w-full'],
  ['w-40', 'w-2/3'],
  ['w-28', 'w-3/4'],
  ['w-20', 'w-1/2'],
] as const

/**
 * The first screen's sheet: the filled sheet's own layout — the heading and its
 * count, the six-segment meter, the verdict, and a row per need with its mark,
 * label, level and hint — drawn in placeholder bars, so nothing moves when it
 * fills. It holds still: nothing is loading, there is just nothing known yet.
 */
function SheetSkeleton({ count }: { count: number }) {
  const bar = 'animate-none rounded-full'
  return (
    <div aria-hidden>
      <div className="flex flex-col gap-2 px-5 pt-5 pb-4">
        <div className="flex h-5 items-center justify-between gap-3">
          <Skeleton className={cn(bar, 'h-2.5 w-28')} />
          <Skeleton className={cn(bar, 'h-2 w-14')} />
        </div>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: count }, (_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full border border-quinary"
            />
          ))}
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className={cn(bar, 'h-2 w-4/5')} />
        </div>
      </div>
      <ul className="flex flex-col border-t border-quaternary">
        {Array.from({ length: count }, (_, i) => {
          const [label, hint] = ROW_SHAPES[i % ROW_SHAPES.length]
          return (
            <li
              key={i}
              className="flex gap-3 border-b border-quaternary px-5 py-3 last:border-b-0"
            >
              <Skeleton className="mt-0.5 size-4 shrink-0 animate-none rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex h-5 items-center justify-between gap-2">
                  <Skeleton className={cn(bar, 'h-2.5', label)} />
                  <Skeleton className={cn(bar, 'h-2 w-10')} />
                </div>
                <div className="flex h-4 items-center">
                  <Skeleton className={cn(bar, 'h-1.5', hint)} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
