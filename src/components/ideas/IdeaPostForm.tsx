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
import { counted, formatDate } from '@/lib/intl'
import { cn } from '@/lib/styles'

export type IdeaPostAnswer = {
  /** Empty when the campaign is unknown: the ideas' plans decide. */
  platformIds: string[]
  /** A draft of several ideas: one post from all of them, per platform. */
  together: boolean
}

/**
 * The one small form behind COMPILE and DRAFT (CON-470), from the Ideas
 * selection bar and from a calendar idea slot: which of the campaign's
 * platforms, and — drafting several ideas — one post each or one from all of
 * them. The confirm button counts what it will make.
 *
 * There is no "when": without a day, the server dates a post only from a day
 * planned on its idea, and offers no way to leave a planned one undated. So
 * the form says which of the two will happen instead of asking.
 *
 * Without one campaign behind the ideas there are no platforms to offer; the
 * form says so and leaves the platform to each idea's plan, as before.
 */
export function IdeaPostForm({
  verb,
  ideaCount,
  campaignId,
  suggestedPlatform,
  date,
  disabled,
  onSubmit,
  children,
}: {
  verb: 'compile' | 'draft'
  ideaCount: number
  campaignId: string | null
  /** The platform the idea's plan names, ticked to begin with. */
  suggestedPlatform?: string | null
  /** YYYY-MM-DD: the day the posts will take, when one is known. */
  date?: string
  disabled?: boolean
  onSubmit: (answer: IdeaPostAnswer) => void
  /** The button that opens the form. */
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-85 p-0">
        {open && (
          <FormBody
            verb={verb}
            ideaCount={ideaCount}
            campaignId={campaignId}
            suggestedPlatform={suggestedPlatform ?? null}
            date={date}
            onSubmit={(answer) => {
              setOpen(false)
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
  suggestedPlatform,
  date,
  onSubmit,
}: {
  verb: 'compile' | 'draft'
  ideaCount: number
  campaignId: string | null
  suggestedPlatform: string | null
  date?: string
  onSubmit: (answer: IdeaPostAnswer) => void
}) {
  const { t, i18n } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const campaign = useCampaign(campaignId ?? '')
  const platforms = campaignId
    ? (campaign.data?.target_platforms ?? []).map((p) => p.id)
    : null
  // Ticked once the campaign's platforms are known: the plan's, or the only one.
  const [picked, setPicked] = useState<string[] | null>(null)
  const ticked =
    picked ??
    (platforms
      ? platforms.filter((p) =>
          suggestedPlatform ? p === suggestedPlatform : platforms.length === 1,
        )
      : [])
  const [together, setTogether] = useState(false)
  const several = verb === 'draft' && ideaCount > 1

  const made =
    platforms && ticked.length > 0
      ? ticked.length * (several && !together ? ideaCount : 1)
      : null
  const confirm =
    made === null
      ? t(`ideas.lifecycle.form.${verb}`)
      : verb === 'compile'
        ? t('ideas.lifecycle.form.compileCount', counted(made))
        : t('ideas.lifecycle.form.draftCount', counted(made))
  const blocked = platforms !== null && ticked.length === 0

  const toggle = (id: string, on: boolean) =>
    setPicked(on ? [...ticked, id] : ticked.filter((p) => p !== id))

  return (
    <div className="flex flex-col">
      <p className="px-4 pt-3.5 pb-1 text-sm font-medium text-foreground">
        {verb === 'compile'
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
              const info = resolve(id)
              const Icon = info?.icon
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px]">
                    <Checkbox
                      checked={ticked.includes(id)}
                      onCheckedChange={(on) => toggle(id, on === true)}
                    />
                    {Icon && (
                      <Icon
                        aria-hidden
                        weight="fill"
                        className="size-4 shrink-0"
                        style={{ color: info.color }}
                      />
                    )}
                    <span className="min-w-0 truncate">{info?.name ?? id}</span>
                    {id === suggestedPlatform && (
                      <span className="shrink-0 text-xs text-tertiary-foreground">
                        {t('ideas.lifecycle.form.fromPlan')}
                      </span>
                    )}
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
                className="flex cursor-pointer items-center gap-2.5 py-1.5 text-left text-[13.5px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-3 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    together === all
                      ? 'border-foreground'
                      : 'border-tertiary-foreground',
                  )}
                >
                  {together === all && (
                    <span className="size-1.5 rounded-full bg-foreground" />
                  )}
                </span>
                {all
                  ? t('ideas.lifecycle.form.together')
                  : t('ideas.lifecycle.form.perIdea')}
              </button>
            ))}
          </div>
        </Group>
      )}

      <div className="flex flex-col gap-1 border-t border-quaternary px-4 py-3 text-xs/[18px] text-secondary-foreground">
        {verb === 'compile' && <p>{t('ideas.lifecycle.form.compileNote')}</p>}
        <p>
          {date
            ? t('ideas.lifecycle.form.onDay', {
                date: formatDate(
                  startOfDay(date),
                  { weekday: 'short', day: 'numeric', month: 'short' },
                  i18n.language,
                ),
              })
            : t('ideas.lifecycle.form.unscheduled')}
        </p>
        {blocked && platforms.length > 0 && (
          <p className="text-warning">{t('ideas.lifecycle.form.pickOne')}</p>
        )}
      </div>

      <div className="flex justify-end border-t border-quaternary px-4 py-3">
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
      </div>
    </div>
  )
}

function Group({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 px-4 pt-2.5 pb-2">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-tertiary-foreground uppercase">
        {heading}
      </p>
      {children}
    </div>
  )
}
