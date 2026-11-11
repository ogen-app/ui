import { LightbulbIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { IdeaPostForm } from '@/components/ideas/IdeaPostForm'
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
 * only), or DRAFT a full body — each through the Ideas list's form, which
 * asks for the platforms with the idea's own preset (CON-470). The posts take
 * the slot's day.
 *
 * Without a pointer to hover with, a tap focuses the card and that reveals the
 * verbs; until then the overlay takes no taps, so a first touch can never
 * land on a button nobody could see.
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
  const request = (platformIds: string[]) => ({
    ids: [slot.id],
    campaignId: slot.campaign_id ?? undefined,
    platformIds,
    targetDate: slot.date,
  })
  // Both verbs open the Ideas list's form, the slot's platform and day preset.
  const form = {
    ideaCount: 1,
    campaignId: slot.campaign_id,
    suggestedPlatform: slot.platform_id,
    date: slot.date,
    disabled: busy,
  }

  return (
    <div
      tabIndex={-1}
      className="group relative shrink-0 overflow-hidden border border-dashed border-quinary-foreground px-2 py-1.5 outline-none"
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
          'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
          '[@media(hover:none)]:pointer-events-none [@media(hover:none)]:group-focus-within:pointer-events-auto',
          busy && 'opacity-100',
        )}
      >
        <IdeaPostForm
          verb="compile"
          {...form}
          onSubmit={({ platformIds }) => compile.mutate(request(platformIds))}
        >
          <button
            type="button"
            disabled={busy}
            className="cursor-pointer border border-border bg-primary px-2 py-1 text-[11px] font-medium tracking-[0.03em] text-foreground hover:border-foreground disabled:cursor-default disabled:text-quinary-foreground"
          >
            {t('ideas.lifecycle.compile')}
          </button>
        </IdeaPostForm>
        <IdeaPostForm
          verb="draft"
          {...form}
          onSubmit={({ platformIds }) => draft.mutate(request(platformIds))}
        >
          <button
            type="button"
            disabled={busy}
            className="cursor-pointer bg-primary-foreground px-2 py-1 text-[11px] font-medium tracking-[0.03em] text-primary disabled:cursor-default disabled:opacity-50"
          >
            {t('ideas.lifecycle.draft')}
          </button>
        </IdeaPostForm>
      </div>
    </div>
  )
}
