import { UsersThreeIcon, WaveformIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { campaignToPayload } from '@/lib/campaignPayload'
import { useBrand } from '@/hooks/useBrand'
import { useCampaign, useUpdateCampaign } from '@/hooks/useCampaigns'
import type { UpdateCampaignPayload } from '@/types/campaigns'
import type { BrandAudience, BrandVoice } from './types'

/**
 * What this campaign draws on out of the workspace's Brand (§8, middle level).
 *
 * Rendered on both the brief and campaign settings, from one file — the two
 * screens ask the same question from different directions (*what does this
 * campaign say* versus *what is this campaign configured with*) and a second
 * implementation would be two answers waiting to disagree.
 *
 * **It replaces the brief's "Target persona" and "Tone guidelines" rather than
 * joining them.** Those two boxes are this feature's third attempt, written
 * fresh per campaign and forgotten per campaign, and CON-226 §3's whole
 * complaint is that we keep building it with no memory. Leaving them beside a
 * picker would make it the fourth. "Key messages" stays: it is what *this
 * campaign* is arguing, which is not brand material and has no library entry
 * behind it.
 *
 * **One voice, not a cast.** The card offered several for a while, on the
 * argument that the plan generator assigns a voice per post as it plans — which
 * it does. But it picks from the *whole library* biased toward the campaign's
 * one voice (CON-245 FR4), and there has never been a column for a cast. A
 * multi-select whose extra entries no generator reads is the picker-with-no-
 * consumer failure CON-226 §9 names, and it was ours. If the cast lands
 * server-side, §13 is where it comes back.
 *
 * **It saves on the spot**, not through the page's Save button, following
 * `PlatformsControl` — a selection that sat dirty until an unrelated Save would
 * be a lie about where it lives. The write is a whole-campaign PUT with the one
 * ref as an override: the refs are presence-aware, so nothing else in the
 * payload can be clobbered by it and it cannot clobber a binding set elsewhere.
 */
export function CampaignBrandCard({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const { data: brand, isLoading } = useBrand()
  const { data: campaign } = useCampaign(campaignId)
  const { mutate: update } = useUpdateCampaign({
    errorTitle: t('brand.binding.saveError'),
  })

  if (isLoading || !brand || !campaign) return null

  const empty = brand.voices.length === 0 && brand.audiences.length === 0
  if (empty) return <NothingToPickFrom />

  function set(refs: Partial<UpdateCampaignPayload>) {
    if (!campaign) return
    update({ id: campaignId, payload: campaignToPayload(campaign, refs) })
  }

  return (
    <SettingsCard
      title={
        <>
          <WaveformIcon className="size-5 text-tertiary-foreground" />
          {t('brand.binding.voice')}
        </>
      }
    >
      <p className="text-sm text-tertiary-foreground">
        {t('brand.binding.campaignVoiceHint')}
      </p>
      <div className="flex flex-col">
        {brand.voices.map((voice) => (
          <VoiceRow
            key={voice.id}
            voice={voice}
            picked={campaign.brand_voice_id === voice.id}
            // Clicking the chosen one again clears it, so "the workspace's
            // default" stays reachable without a None row that would sit in the
            // list pretending to be a voice.
            onPick={() =>
              set({
                brand_voice_id:
                  campaign.brand_voice_id === voice.id ? null : voice.id,
              })
            }
          />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <UsersThreeIcon className="size-5 text-tertiary-foreground" />
        <h3 className="text-xl font-display font-medium tracking-tight">
          {t('brand.binding.audience')}
        </h3>
      </div>
      <p className="text-sm text-tertiary-foreground">
        {t('brand.binding.campaignAudienceHint')}
      </p>
      <div className="flex flex-col">
        {brand.audiences.map((audience) => (
          <AudienceRow
            key={audience.id}
            audience={audience}
            picked={campaign.brand_audience_id === audience.id}
            onPick={() =>
              set({
                brand_audience_id:
                  campaign.brand_audience_id === audience.id
                    ? null
                    : audience.id,
              })
            }
          />
        ))}
      </div>
    </SettingsCard>
  )
}

/**
 * A workspace with no Brand at all.
 *
 * A link rather than an inline editor: authoring a voice is a screen's worth of
 * work — samples, rules, the lot — and the campaign is the wrong place to start
 * it. Saying where it lives is the whole job here.
 */
function NothingToPickFrom() {
  const { t } = useTranslation()
  return (
    <SettingsCard title={t('brand.binding.emptyTitle')}>
      <p className="text-sm text-tertiary-foreground">
        {t('brand.binding.emptyBody')}
      </p>
      <div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/brand">{t('brand.binding.openBrand')}</Link>
        </Button>
      </div>
    </SettingsCard>
  )
}

/** Shared row chrome: the picked state is a surface, not a tick in a column. */
const ROW =
  'flex items-start gap-3 border-b border-tertiary px-3 py-3 last:border-b-0 text-left w-full'

function VoiceRow({
  voice,
  picked,
  onPick,
}: {
  voice: BrandVoice
  picked: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={cn(ROW, picked && 'bg-secondary')}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{voice.name}</span>
        {/* `whenToUse` and not `summary`: the question on this screen is which
            voice this campaign wants, and that is what `whenToUse` answers.
            The summary describes what the voice has become, which is the
            library's question. */}
        {voice.whenToUse && (
          <span className="truncate text-xs text-tertiary-foreground">
            {voice.whenToUse}
          </span>
        )}
      </span>
    </button>
  )
}

function AudienceRow({
  audience,
  picked,
  onPick,
}: {
  audience: BrandAudience
  picked: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={picked}
      className={cn(ROW, picked && 'bg-secondary')}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{audience.name}</span>
        {audience.who && (
          <span className="truncate text-xs text-tertiary-foreground">
            {audience.who}
          </span>
        )}
      </span>
    </button>
  )
}
