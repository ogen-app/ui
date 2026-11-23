import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCampaign } from '@/hooks/useCampaigns'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { startOfDay } from '@/lib/assetFilter'
import { counted, formatDate, formatNumber } from '@/lib/intl'
import { cn } from '@/lib/styles'
import type { IdeaPlan } from '@/lib/ideas'
import { SmallHeading } from '@/components/page-primitives/SmallHeading'

export type IdeaPostAnswer = {
  /** Empty when the campaign is unknown: the ideas' plans decide. */
  platformIds: string[]
  /** A draft of several ideas: one post from all of them, per platform. */
  together: boolean
}

/**
 * The one small form behind COMPILE and DRAFT (CON-470, drawn as CON-485 has
 * it), from the Ideas selection bar and from a calendar idea slot: which of
 * the campaign's platforms — ticked from the ideas' plans, each with the type
 * the plan names — and, drafting several ideas, one post each or one from all
 * of them, each choice saying how many it makes. The confirm button counts
 * what it will make; CANCEL closes it.
 *
 * There is no "when" to choose: without a day, the server dates a post only
 * from a day planned on its idea, and offers no way to leave a planned one
 * undated. So the form says which will happen, and how many of the ideas
 * have a day, instead of asking.
 *
 * Without one campaign behind the ideas there are no platforms to offer; the
 * form says so and leaves the platform to each idea's plan, as before.
 */
export function IdeaPostForm({
  verb,
  ideaCount,
  campaignId,
  plans = [],
  title,
  date,
  disabled,
  onSubmit,
  onOpenChange,
  children,
}: {
  verb: 'compile' | 'draft'
  ideaCount: number
  campaignId: string | null
  /** The ideas' plans, as far as they are known: what is ticked to begin with. */
  plans?: IdeaPlan[]
  /** One idea's title, which the form names (CON-485). */
  title?: string
  /** YYYY-MM-DD: the day the posts will take, when one is known. */
  date?: string
  disabled?: boolean
  onSubmit: (answer: IdeaPostAnswer) => void
  /** Told when the form opens and closes, so a slot can stay lit. */
  onOpenChange?: (open: boolean) => void
  /** The button that opens the form. */
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }
  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        showArrow={false}
        className="w-90 rounded-none border-0 p-0 shadow-lg"
      >
        {open && (
          <FormBody
            verb={verb}
            ideaCount={ideaCount}
            campaignId={campaignId}
            plans={plans}
            title={title}
            date={date}
            onCancel={() => change(false)}
            onSubmit={(answer) => {
              change(false)
              onSubmit(answer)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

function FormBody({
  verb,
  ideaCount,
  campaignId,
  plans,
  title,
  date,
  onCancel,
  onSubmit,
}: {
  verb: 'compile' | 'draft'
  ideaCount: number
  campaignId: string | null
  plans: IdeaPlan[]
  title?: string
  date?: string
  onCancel: () => void
  onSubmit: (answer: IdeaPostAnswer) => void
}) {
  const { t, i18n } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const campaign = useCampaign(campaignId ?? '')
  const platforms = campaignId
    ? (campaign.data?.target_platforms ?? []).map((p) => p.id)
    : null
  // The platforms the ideas' plans name, each with the type it names first.
  const planned = new Map<string, string | undefined>()
  for (const plan of plans)
    if (plan.platformId && !planned.has(plan.platformId))
      planned.set(plan.platformId, plan.postType)
  // Ticked once the campaign's platforms are known: the plans', or the only one.
  const [picked, setPicked] = useState<string[] | null>(null)
  const ticked =
    picked ??
    (platforms
      ? platforms.filter((p) =>
          planned.size > 0 ? planned.has(p) : platforms.length === 1,
        )
      : [])
  const [together, setTogether] = useState(false)
  const several = verb === 'draft' && ideaCount > 1
  const makes = (all: boolean) =>
    ticked.length * (several && !all ? ideaCount : 1)

  const made = platforms && ticked.length > 0 ? makes(together) : null
  const confirm =
    made === null
      ? t(`ideas.lifecycle.form.${verb}`)
      : verb === 'compile'
        ? t('ideas.lifecycle.form.compileCount', counted(made))
        : t('ideas.lifecycle.form.draftCount', counted(made))
  const blocked = platforms !== null && ticked.length === 0
  const dated = plans.filter((p) => p.targetDate).length
  // The day the posts take: the slot's, or a single idea's planned one —
  // the server dates from the plan whenever no day is given.
  const day = date ?? (ideaCount === 1 ? plans[0]?.targetDate : undefined)
  // Whether every idea's plan is known, so "none" and "all" can be said.
  const known = plans.length === ideaCount
  const dayLabel = (d: string) =>
    t('ideas.lifecycle.form.onDay', {
      date: formatDate(
        startOfDay(d),
        { weekday: 'short', day: 'numeric', month: 'short' },
        i18n.language,
      ),
    })

  const toggle = (id: string, on: boolean) =>
    setPicked(on ? [...ticked, id] : ticked.filter((p) => p !== id))

  const typeLabel = (platformId: string, slug?: string) =>
    slug
      ? (resolve(platformId)?.postTypes?.find((pt) => pt.slug === slug)
          ?.label ?? slug)
      : undefined

  return (
    <div className="flex flex-col">
      <p className="px-4 pt-3.5 pb-2.5 text-[15.5px]/6 font-medium text-foreground">
        {title && ideaCount === 1
          ? t(`ideas.lifecycle.form.${verb}Named`, { title })
          : verb === 'compile'
            ? t('ideas.lifecycle.form.compileTitle', counted(ideaCount))
            : t('ideas.lifecycle.form.draftTitle', counted(ideaCount))}
      </p>

      <Group heading={t('ideas.lifecycle.form.platforms')}>
        {platforms === null ? (
          <p className="text-[13px]/5 text-secondary-foreground">
            {t('ideas.lifecycle.form.noCampaign')}
          </p>
        ) : campaign.isError ? (
          <p className="text-[13px]/5 text-secondary-foreground">
            {t('ideas.lifecycle.form.platformsFailed')}{' '}
            <button
              type="button"
              onClick={() => void campaign.refetch()}
              className="cursor-pointer font-medium text-foreground hover:underline"
            >
              {t('ideas.lifecycle.form.retry')}
            </button>
          </p>
        ) : campaign.isPending ? null : platforms.length === 0 ? (
          <p className="text-[13px]/5 text-secondary-foreground">
            {t('ideas.lifecycle.form.noPlatforms')}
          </p>
        ) : (
          <ul className="flex flex-col">
            {platforms.map((id) => {
              const fromPlan = planned.has(id)
              const type = typeLabel(id, planned.get(id))
              const second = [
                type,
                fromPlan &&
                  t('ideas.lifecycle.form.fromPlan', { count: ideaCount }),
              ].filter(Boolean)
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-start gap-2.5 py-1.5 text-[13.5px]">
                    <Checkbox
                      className="mt-0.5"
                      checked={ticked.includes(id)}
                      onCheckedChange={(on) => toggle(id, on === true)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        {resolve(id)?.name ?? id}
                      </span>
                      {second.length > 0 && (
                        <span className="text-xs text-tertiary-foreground">
                          {second.join(' · ')}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </Group>

      {several && (
        <Group heading={t('ideas.lifecycle.form.howMany')}>
          <div role="radiogroup" className="flex flex-col">
            {[false, true].map((all) => (
              <button
                key={String(all)}
                type="button"
                role="radio"
                aria-checked={together === all}
                onClick={() => setTogether(all)}
                className="flex cursor-pointer items-start gap-2.5 py-1.5 text-left text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 flex size-3 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    together === all
                      ? 'border-foreground'
                      : 'border-tertiary-foreground',
                  )}
                >
                  {together === all && (
                    <span className="size-1.5 rounded-full bg-foreground" />
                  )}
                </span>
                <span className="flex flex-col">
                  {all
                    ? t('ideas.lifecycle.form.together', {
                        count: ideaCount,
                      })
                    : t('ideas.lifecycle.form.perIdea')}
                  {platforms && ticked.length > 0 && (
                    <span className="text-xs text-tertiary-foreground">
                      {t('ideas.lifecycle.form.drafts', counted(makes(all)))}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Group>
      )}

      {verb === 'compile' ? (
        <Group heading={t('ideas.lifecycle.form.result')}>
          <p className="text-[13px]/5 text-foreground">
            {t('ideas.lifecycle.form.compileResult')}
          </p>
          {/* From a slot the planned posts take its day; otherwise none. */}
          <p className="pt-1 text-xs/[18px] text-tertiary-foreground">
            {day ? dayLabel(day) : t('ideas.lifecycle.form.compileNote')}
          </p>
        </Group>
      ) : (
        <Group heading={t('ideas.lifecycle.form.when')}>
          <p className="text-[13px]/5 text-foreground">
            {day
              ? dayLabel(day)
              : known && dated === ideaCount
                ? t('ideas.lifecycle.form.allDated')
                : known && dated === 0
                  ? t('ideas.lifecycle.form.undated', { count: ideaCount })
                  : t('ideas.lifecycle.form.unscheduled')}
          </p>
          {!day && ideaCount > 1 && dated > 0 && dated < ideaCount && (
            <p className="pt-0.5 text-xs text-tertiary-foreground">
              {t('ideas.lifecycle.form.datedOf', {
                count: dated,
                dated: formatNumber(dated),
                total: formatNumber(ideaCount),
              })}
            </p>
          )}
        </Group>
      )}

      {blocked && platforms.length > 0 && (
        <p className="px-4 pb-2 text-xs text-warning">
          {t('ideas.lifecycle.form.pickOne')}
        </p>
      )}

      <div className="flex items-center gap-4 border-t border-border px-4 py-3">
        <Button
          variant="defaultInverted"
          size="sm"
          disabled={blocked}
          onClick={() =>
            onSubmit({ platformIds: platforms ? ticked : [], together })
          }
        >
          {confirm}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-xs font-semibold tracking-[0.06em] text-secondary-foreground hover:text-foreground"
        >
          {t('ideas.lifecycle.form.cancel')}
        </button>
      </div>
    </div>
  )
}

/** One of the form's groups, under a hairline (CON-485). */
function Group({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-border px-4 pt-2.5 pb-2.5">
      <SmallHeading as="p">{heading}</SmallHeading>
      {children}
    </div>
  )
}
