import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { brandSection } from '@/lib/brandSections'
import { campaignToPayload } from '@/lib/campaignPayload'
import { useBrand } from '@/hooks/useBrand'
import { useCampaign, useUpdateCampaign } from '@/hooks/useCampaigns'
import type { UpdateCampaignPayload } from '@/types/campaigns'
import type { BrandAudience, BrandData, BrandVoice } from './types'

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
 * **The guardrails are not offered here.** They apply to every generation
 * whichever voice is picked, so there is nothing to select and nothing to
 * override. They are shown in full under this card instead, read-only, by
 * `FromTheWorkspace` — a rule nobody can see is a rule nobody believes is
 * running.
 *
 * **A dropdown in each card's header, and the pick previewed under it**
 * (2026-11-23). It was a list of rows you clicked to select, the chosen one on
 * a grey face — and with one voice in the library that list was one grey row
 * that read as a statement, not a choice: "how do I change the voice?" The
 * header's `choice` is the card's own selector (`ui/card`), so it looks like
 * every other thing on a card that can be changed, and the body shows what the
 * pick means in the library card's own terms — the line, then the sample or
 * the three consequences in a ruled block — so the campaign and Foundation
 * describe a voice the same way. Unset is a named option, "Workspace default —
 * <name>", rather than clicking the chosen row again to clear it.
 *
 * **It saves on the spot**, not through the page's Save button, following
 * `PlatformsControl` — a selection that sat dirty until an unrelated Save would
 * be a lie about where it lives. The write is a whole-campaign PUT with the one
 * ref as an override: the refs are presence-aware, so nothing else in the
 * payload can be clobbered by it and it cannot clobber a binding set elsewhere.
 */
export function CampaignBrandCard({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: brand, isLoading } = useBrand()
  const { data: campaign } = useCampaign(campaignId)
  const { mutate: update } = useUpdateCampaign({
    errorTitle: t('brand.binding.saveError'),
  })

  if (isLoading || !brand || !campaign) return null

  return (
    <CampaignBrandCards
      brand={brand}
      voiceId={campaign.brand_voice_id}
      audienceId={campaign.brand_audience_id}
      onSet={(refs) =>
        update({ id: campaignId, payload: campaignToPayload(campaign, refs) })
      }
      onManage={(section) =>
        void navigate({
          to:
            section === 'voices'
              ? '/foundation/voices'
              : '/foundation/audiences',
        })
      }
    />
  )
}

/** The option that stands for "nothing set on the campaign". */
const UNSET = 'unset'

/**
 * The two cards, from what they show rather than from the queries — so the
 * design harness draws exactly what Strategy does.
 */
export function CampaignBrandCards({
  brand,
  voiceId,
  audienceId,
  onSet,
  onManage,
}: {
  brand: BrandData
  voiceId: string | null
  audienceId: string | null
  onSet: (
    refs: Pick<UpdateCampaignPayload, 'brand_voice_id' | 'brand_audience_id'>,
  ) => void
  onManage: (section: 'voices' | 'audiences') => void
}) {
  const { t } = useTranslation()

  const empty = brand.voices.length === 0 && brand.audiences.length === 0
  if (empty) return <NothingToPickFrom onOpen={() => onManage('voices')} />

  const voices = brandSection('voices')
  const audiences = brandSection('audiences')
  const fallback = brand.voices.find((v) => v.isDefault)
  // A ref to an entry that has since been deleted reads as unset, which is
  // what the generator does with it too.
  const voice = brand.voices.find((v) => v.id === voiceId)
  const shownVoice = voice ?? fallback
  const audience = brand.audiences.find((a) => a.id === audienceId)

  return (
    // Two cards, one per binding: each is its own question with its own
    // section hue, and a second heading inside one card made the two read as
    // a card with a footnote.
    <>
      <Card
        icon={voices.icon}
        tone={voices.tone}
        title={t('brand.binding.voice')}
        choice={{
          label: t('brand.binding.voice'),
          value: voice ? voice.id : UNSET,
          options: [
            ...(fallback
              ? [
                  {
                    id: UNSET,
                    displayValue: t('brand.binding.workspaceDefault', {
                      name: fallback.name,
                    }),
                  },
                ]
              : [{ id: UNSET, displayValue: t('brand.binding.noVoice') }]),
            ...brand.voices.map((v) => ({ id: v.id, displayValue: v.name })),
          ],
          onChange: (id) => onSet({ brand_voice_id: id === UNSET ? null : id }),
        }}
        capped
      >
        <p className="text-sm">{t('brand.binding.campaignVoiceHint')}</p>
        {shownVoice && <VoicePreview voice={shownVoice} />}
        <Manage
          label={t('brand.binding.manageVoices')}
          onClick={() => onManage('voices')}
        />
      </Card>
      <Card
        icon={audiences.icon}
        tone={audiences.tone}
        title={t('brand.binding.audience')}
        choice={{
          label: t('brand.binding.audience'),
          value: audience ? audience.id : UNSET,
          options: [
            { id: UNSET, displayValue: t('brand.binding.noAudience') },
            ...brand.audiences.map((a) => ({
              id: a.id,
              displayValue: a.name,
            })),
          ],
          onChange: (id) =>
            onSet({ brand_audience_id: id === UNSET ? null : id }),
        }}
        capped
      >
        <p className="text-sm">{t('brand.binding.campaignAudienceHint')}</p>
        {audience && <AudiencePreview audience={audience} />}
        <Manage
          label={t('brand.binding.manageAudiences')}
          onClick={() => onManage('audiences')}
        />
      </Card>
    </>
  )
}

/**
 * The picked voice as its library card describes it: when to use it, then a
 * sample in the ruled block — the thing that actually tells two voices apart.
 */
function VoicePreview({ voice }: { voice: BrandVoice }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 text-sm leading-5">
      {voice.whenToUse && <p>{voice.whenToUse}</p>}
      <div className="border-l-2 border-quaternary pl-3">
        {voice.samples[0] ? (
          <p className="line-clamp-4 whitespace-pre-line">{voice.samples[0]}</p>
        ) : (
          <p className="text-tertiary-foreground">
            {t('brand.voices.noSamples')}
          </p>
        )}
      </div>
    </div>
  )
}

/** The picked audience the same way: who, then the three consequences. */
function AudiencePreview({ audience }: { audience: BrandAudience }) {
  const { t } = useTranslation()
  const lines = [
    [t('brand.audiences.readsOn'), audience.readsOn],
    [t('brand.audiences.scrollsPast'), audience.scrollsPastWhen],
    [t('brand.audiences.believesWhen'), audience.believesWhen],
  ] as const
  return (
    <div className="flex flex-col gap-2 text-sm leading-5">
      {audience.who && <p>{audience.who}</p>}
      <dl className="flex flex-col gap-1.5 border-l-2 border-quaternary pl-3">
        {lines.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-36 shrink-0 text-tertiary-foreground">{label}</dt>
            <dd className="min-w-0">
              {value || (
                <span className="text-tertiary-foreground">
                  {t('brand.audiences.notSaid')}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Where the entries themselves are written — the campaign only picks. */
function Manage({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div>
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        {label}
      </Button>
    </div>
  )
}

/**
 * A workspace with no Brand at all.
 *
 * A link rather than an inline editor: authoring a voice is a screen's worth of
 * work — samples, rules, the lot — and the campaign is the wrong place to start
 * it. Saying where it lives is the whole job here.
 */
function NothingToPickFrom({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <Card
      title={t('brand.binding.emptyTitle')}
      action={{ label: t('brand.binding.openBrand'), onClick: onOpen }}
      capped
    >
      <p className="text-sm">{t('brand.binding.emptyBody')}</p>
    </Card>
  )
}
