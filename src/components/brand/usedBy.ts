import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useCampaigns } from '@/hooks/useCampaigns'
import { campaignsByStart } from '@/lib/campaignOrder'
import { formatList } from '@/lib/intl'
import { EMPTY_POST_BRAND, resolveAudience, resolveVoice } from './binding'
import type { BrandData } from './types'

/** How many campaign names a line prints before "and N more". */
const NAMES = 3

/**
 * Which campaigns use each voice or audience, as the line a library card
 * prints among its facts — keyed by the entry's id, `undefined` while the
 * campaigns load (the card simply goes without the line until then).
 *
 * One read of the campaigns answers it, because the pick is on the campaign
 * itself; that is also why Series has no such line — a campaign's series are
 * its runs, one request per campaign, against the Campaigns list's rule of one
 * batched query and never one per row.
 *
 * A voice the campaign does not choose resolves to the workspace default
 * (`resolveVoice`), and the line keeps the two apart — "Chosen by …; the
 * default for …" — because an inherited voice reads as nobody's choice only
 * until the default changes under it. An audience has no default, so it is
 * chosen or unused.
 */
export function useUsedBy(
  section: 'voices' | 'audiences',
  brand: BrandData,
): Map<string, string> | undefined {
  const { t, i18n } = useTranslation()
  const { data: campaigns } = useCampaigns()
  if (!campaigns) return undefined

  const chosen = new Map<string, string[]>()
  const inherited = new Map<string, string[]>()
  const add = (to: Map<string, string[]>, id: string, name: string) =>
    to.set(id, [...(to.get(id) ?? []), name])

  for (const { campaign } of campaignsByStart(campaigns)) {
    const binding = {
      voiceId: campaign.brand_voice_id,
      audienceId: campaign.brand_audience_id,
    }
    if (section === 'audiences') {
      const { audience } = resolveAudience(brand, binding, EMPTY_POST_BRAND)
      if (audience) add(chosen, audience.id, campaign.name)
      continue
    }
    const { voice, source } = resolveVoice(brand, binding, EMPTY_POST_BRAND)
    if (voice)
      add(source === 'library' ? inherited : chosen, voice.id, campaign.name)
  }

  const names = (list: string[]) => namesLine(t, list, i18n.language)
  const entries = section === 'voices' ? brand.voices : brand.audiences
  return new Map(
    entries.map(({ id }) => {
      const mine = chosen.get(id)
      const fallback = inherited.get(id)
      const line =
        mine && fallback
          ? t('brand.facts.usedByBoth', {
              chosen: names(mine),
              inherited: names(fallback),
            })
          : mine
            ? t('brand.facts.usedByChosen', { campaigns: names(mine) })
            : fallback
              ? t('brand.facts.usedByDefault', { campaigns: names(fallback) })
              : t('brand.facts.usedByNone')
      return [id, line]
    }),
  )
}

/** The first few names, and how many more, joined the language's way. */
function namesLine(t: TFunction, list: string[], language: string): string {
  const shown =
    list.length > NAMES + 1
      ? [
          ...list.slice(0, NAMES),
          t('brand.facts.usedByMore', { count: list.length - NAMES }),
        ]
      : list
  return formatList(shown, 'conjunction', language)
}
