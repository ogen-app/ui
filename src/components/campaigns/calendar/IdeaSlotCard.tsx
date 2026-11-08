import { LightbulbIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useCompileIdeas, useDraftIdeas } from '@/hooks/useIdeaPosts'
import { cn } from '@/lib/styles'
import type { IdeaSlot } from '@/services/api/ideaPosts'

/** The slot's fixed height, which the week's ladder reserves per slot. */
export const IDEA_SLOT_HEIGHT = 52

/**
 * An idea with a target date, on the calendar (CON-449). It holds the shape of
 * the campaign without being a post: dashed and transparent, so it reads as
 * planned next to the cards, and never counted toward the goal. Under the
 * pointer it offers its two verbs — COMPILE into a planned post (theses
 * only), or DRAFT a full body — and neither schedules: the post takes the
 * slot's date as a suggestion.
 */
export function IdeaSlotCard({
  slot,
  showCampaign,
}: {
  slot: IdeaSlot
  /** The workspace calendar names each slot's campaign. */
  showCampaign: boolean
}) {
  const { t } = useTranslation()
  const compile = useCompileIdeas()
  const draft = useDraftIdeas()
  const busy = compile.isPending || draft.isPending
  const request = {
    ids: [slot.id],
    campaignId: slot.campaign_id ?? undefined,
    targetDate: slot.date,
  }

  return (
    <div
      className="group relative shrink-0 overflow-hidden border border-dashed border-quinary-foreground px-2 py-1.5"
      style={{ height: IDEA_SLOT_HEIGHT }}
    >
      <p className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] text-tertiary-foreground">
        <LightbulbIcon aria-hidden className="size-3 shrink-0" />
        {t('ideas.lifecycle.slot')}
        {showCampaign && slot.campaign_name && (
          <span className="min-w-0 truncate font-normal tracking-normal">
            · {slot.campaign_name}
          </span>
        )}
      </p>
      <p className="line-clamp-2 text-xs/4 text-secondary-foreground">
        {slot.title}
      </p>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center gap-1.5 bg-primary/95',
          'opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
          busy && 'opacity-100',
        )}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => compile.mutate(request)}
          className="cursor-pointer border border-border bg-primary px-2 py-1 text-[11px] font-medium tracking-[0.03em] text-foreground hover:border-foreground disabled:cursor-default disabled:text-quinary-foreground"
        >
          {t('ideas.lifecycle.compile')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => draft.mutate(request)}
          className="cursor-pointer bg-primary-foreground px-2 py-1 text-[11px] font-medium tracking-[0.03em] text-primary disabled:cursor-default disabled:opacity-50"
        >
          {t('ideas.lifecycle.draft')}
        </button>
      </div>
    </div>
  )
}
