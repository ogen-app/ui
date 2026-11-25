import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { brandSection, type BrandSectionId } from '@/lib/brandSections'
import { campaignToPayload } from '@/lib/campaignPayload'
import { useBrand } from '@/hooks/useBrand'
import { useCampaign, useUpdateCampaign } from '@/hooks/useCampaigns'
import type { UpdateCampaignPayload } from '@/types/campaigns'
import {
  AudienceContent,
  EntryRow,
  EntryRows,
  Facts,
  Ruled,
  Tick,
  VoiceContent,
} from './entry'
import { audienceMark, voiceMark } from './entryMarks'
import { rulesLine } from './format'
import { useOpenBrand, type BrandPlace } from './places'
import type { BrandData } from './types'

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
 * every other thing on a card that can be changed, and the body is the pick as
 * the hub draws it — its mark, its line, the ruled run and the facts, and a
 * caret into the entry — so the campaign and Foundation describe a voice the
 * same way. Unset is a named option, "Workspace default (<name>)", rather than
 * clicking the chosen row again to clear it.
 *
 * **It saves on the spot**, not through the page's Save button, following
 * `PlatformsControl` — a selection that sat dirty until an unrelated Save would
 * be a lie about where it lives. The write is a whole-campaign PUT with the one
 * ref as an override: the refs are presence-aware, so nothing else in the
 * payload can be clobbered by it and it cannot clobber a binding set elsewhere.
 */
export function CampaignBrandCard({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const open = useOpenBrand()
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
      onOpenSection={open.section}
      onOpenPlace={open.place}
    />
  )
}

/** The option that stands for "nothing set on the campaign". */
const UNSET = 'unset'

/**
 * The two cards, from what they show rather than from the queries.
 *
 * Each pick is drawn as the hub's row for it — the entry's mark, its name, its
 * line, the ruled run and the facts — with the caret of its own that opens the
 * entry, so a voice reads the same on a campaign as it does in Foundation.
 * The facts here are about the binding rather than the library: where the pick
 * came from, and how far it reaches.
 */
export function CampaignBrandCards({
  brand,
  voiceId,
  audienceId,
  onSet,
  onOpenSection,
  onOpenPlace,
}: {
  brand: BrandData
  voiceId: string | null
  audienceId: string | null
  onSet: (
    refs: Pick<UpdateCampaignPayload, 'brand_voice_id' | 'brand_audience_id'>,
  ) => void
  onOpenSection: (section: BrandSectionId) => void
  onOpenPlace: (place: BrandPlace) => void
}) {
  const { t } = useTranslation()

  const empty = brand.voices.length === 0 && brand.audiences.length === 0
  if (empty) return <NothingToPickFrom onOpen={() => onOpenSection('voices')} />

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
        <EntryRows>
          {shownVoice ? (
            <EntryRow
              mark={voiceMark(t, shownVoice)}
              name={shownVoice.name}
              onOpen={() =>
                onOpenPlace({ section: 'voices', id: shownVoice.id })
              }
            >
              <VoiceContent
                t={t}
                voice={shownVoice}
                facts={[
                  rulesLine(t, shownVoice.rules),
                  voice
                    ? t('brand.binding.chosenHere')
                    : t('brand.binding.voiceInherited'),
                  t('brand.binding.voiceReach'),
                ]}
              />
            </EntryRow>
          ) : (
            <EntryRow
              mark={<Tick done={false} />}
              name={t('brand.binding.noVoice')}
            >
              <Ruled empty={t('brand.binding.noVoiceRun')} />
            </EntryRow>
          )}
        </EntryRows>
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
        <EntryRows>
          {audience ? (
            <EntryRow
              mark={audienceMark(audience)}
              name={audience.name}
              onOpen={() =>
                onOpenPlace({ section: 'audiences', id: audience.id })
              }
            >
              <AudienceContent
                t={t}
                audience={audience}
                facts={[
                  t('brand.binding.chosenHere'),
                  t('brand.binding.audienceReach'),
                ]}
              />
            </EntryRow>
          ) : (
            // No star and no fallback: the workspace default stops at voices
            // (`resolveAudience`), so nothing picked means nobody in
            // particular, and the card says so rather than going blank.
            <EntryRow
              mark={<Tick done={false} />}
              name={t('brand.binding.noAudience')}
            >
              <Ruled empty={t('brand.binding.noAudienceRun')} />
              <Facts items={[t('brand.binding.audienceNoDefault')]} />
            </EntryRow>
          )}
        </EntryRows>
      </Card>
    </>
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
