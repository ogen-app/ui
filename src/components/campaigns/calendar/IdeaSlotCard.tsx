import { useState } from 'react'
import {
  LightbulbIcon,
  PencilSimpleLineIcon,
  StackIcon,
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { IdeaPostForm } from '@/components/ideas/IdeaPostForm'
import { useCompileIdeas, useDraftIdeas } from '@/hooks/useIdeaPosts'
import { cn } from '@/lib/styles'
import type { IdeaSlot } from '@/services/api/ideaPosts'
import { SeriesMark } from '@/components/series/SeriesMark'
import { Button } from '@/components/ui/button'

/** The slot's fixed height, which the week's ladder reserves per slot. */
export const IDEA_SLOT_HEIGHT = 52

/**
 * An idea with a target date, on the calendar (CON-449). It holds the shape of
 * the campaign without being a post: dashed and transparent, so it reads as
 * planned next to the cards, and never counted toward the goal. Under the
 * pointer it offers its two verbs — COMPILE into a planned post (theses
 * only), or DRAFT a full body — each through the Ideas list's form, which
 * asks for the platforms with the idea's own preset (CON-470). The posts take
 * the slot's day. Two Ogen verbs in one line are black words, each with its
 * own icon, never a pair of button bodies.
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
  // Both verbs open the Ideas list's form, the slot's platform and day
  // preset, the idea named (CON-485).
  const [formOpen, setFormOpen] = useState(false)
  const form = {
    ideaCount: 1,
    campaignId: slot.campaign_id,
    plans: [
      {
        ...(slot.platform_id ? { platformId: slot.platform_id } : {}),
        ...(slot.platform_post_type
          ? { postType: slot.platform_post_type }
          : {}),
        targetDate: slot.date,
      },
    ],
    title: slot.title,
    date: slot.date,
    disabled: busy,
    // Focus moves into the form's portal, so the slot's buttons would fade
    // under it; they stay while it is open.
    onOpenChange: setFormOpen,
  }

  return (
    <div
      tabIndex={-1}
      className="group relative shrink-0 overflow-hidden border border-dashed border-quinary-foreground px-2 py-1.5 outline-none"
      style={{ height: IDEA_SLOT_HEIGHT }}
    >
      <p className="flex items-center gap-1 text-xs font-semibold tracking-[0.08em] text-tertiary-foreground">
        <LightbulbIcon aria-hidden className="size-3 shrink-0" />
        {t('ideas.lifecycle.slot')}
        {showCampaign && slot.campaign_name && (
          <span className="min-w-0 truncate font-normal tracking-normal">
            · {slot.campaign_name}
          </span>
        )}
        {/* Its series (CON-496), once the slots read carries it (CON-512). */}
        {slot.series_id && (
          <SeriesMark
            seriesId={slot.series_id}
            className="font-normal tracking-normal"
          />
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
          (busy || formOpen) && 'opacity-100',
        )}
      >
        <IdeaPostForm
          verb="compile"
          {...form}
          onSubmit={({ platformIds }) => compile.mutate(request(platformIds))}
        >
          <Button
            variant="ghost"
            size="xs"
            className="text-foreground"
            disabled={busy}
          >
            <StackIcon />
            {t('ideas.lifecycle.compile')}
          </Button>
        </IdeaPostForm>
        <IdeaPostForm
          verb="draft"
          {...form}
          onSubmit={({ platformIds }) => draft.mutate(request(platformIds))}
        >
          <Button
            variant="ghost"
            size="xs"
            className="text-foreground"
            disabled={busy}
          >
            <PencilSimpleLineIcon />
            {t('ideas.lifecycle.draft')}
          </Button>
        </IdeaPostForm>
      </div>
    </div>
  )
}
