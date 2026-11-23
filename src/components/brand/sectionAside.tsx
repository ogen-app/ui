import { Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns } from '@/hooks/useCampaigns'
import { campaignsByStart } from '@/lib/campaignOrder'
import {
  brandSection,
  brandSectionCopy,
  type BrandSectionId,
} from '@/lib/brandSections'
import type { Campaign } from '@/types/campaigns'
import { EMPTY_POST_BRAND, resolveAudience, resolveVoice } from './binding'
import { readByStatus } from './shell'
import type { BrandData, CampaignBrand } from './types'

/**
 * The side column of a Foundation section (`BrandSectionFrame`): what the
 * section is for, and which campaign picks what from it.
 *
 * The two answer the questions somebody has before changing an entry — what
 * is this for, and what else moves if I edit it — and neither belongs between
 * the header and the list, where the explanation used to sit on every visit.
 *
 * Used by is drawn only where the pick is on the campaign itself (a voice, an
 * audience), so one read of the campaigns answers it. A campaign's series are
 * its runs, one request per campaign, and the Campaigns list's rule is one
 * batched query, never one per row — so Series has the About card alone until
 * the series list says where each one runs.
 */
export function BrandSectionAside({
  section,
  empty,
  brand,
}: {
  section: BrandSectionId
  /** The section has nothing in it yet: the About card says what that costs. */
  empty: boolean
  /** Present once loaded, for the sections that have a Used by card. */
  brand?: BrandData
}) {
  return (
    <>
      <BrandSectionAbout section={section} empty={empty} />
      {(section === 'voices' || section === 'audiences') && (
        <BrandSectionUsedBy section={section} brand={brand} />
      )}
    </>
  )
}

/**
 * The section's description, under the section's glyph. The name is the
 * header's, so the card is "About" rather than the name again.
 */
function BrandSectionAbout({
  section,
  empty,
}: {
  section: BrandSectionId
  empty: boolean
}) {
  const { t } = useTranslation()
  const info = brandSection(section)
  const copy = brandSectionCopy(t, section)
  return (
    <Card
      icon={info.icon}
      tone={info.tone}
      title={t('brand.detail.about')}
      status={readByStatus(t, info.readBy)}
    >
      <p className="text-sm text-secondary-foreground">{copy.description}</p>
      {empty && (
        <p className="text-sm text-secondary-foreground">{copy.whenEmpty}</p>
      )}
    </Card>
  )
}

/**
 * Every campaign, in the hub's order, with what it picks from this section.
 * Each row opens the campaign's Strategy, which is where the pick is made.
 *
 * A voice the campaign does not choose resolves to the workspace default, and
 * says so; an audience has no default (`resolveAudience`), so a campaign
 * without one reads "No audience".
 */
function BrandSectionUsedBy({
  section,
  brand,
}: {
  section: 'voices' | 'audiences'
  brand?: BrandData
}) {
  const { t } = useTranslation()
  const { data: campaigns, isPending } = useCampaigns()
  const rows = campaignsByStart(campaigns ?? [])

  return (
    <Card title={t('brand.detail.usedBy.title')}>
      {isPending || !brand ? (
        <div className="flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-4/5" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-secondary-foreground">
          {t('brand.detail.usedBy.empty')}
        </p>
      ) : (
        // The hub's Campaigns card's rows, so the two cards a level apart
        // read as one list narrowed rather than two designs.
        <ul className="flex flex-col">
          {rows.map(({ campaign }) => (
            <li
              key={campaign.id}
              className="flex min-w-0 flex-col gap-0.5 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <Link
                to="/campaigns/$campaignId/strategy"
                params={{ campaignId: campaign.id }}
                className="truncate font-medium text-foreground hover:underline"
              >
                {campaign.name}
              </Link>
              <p className="truncate text-sm text-secondary-foreground">
                {pickLine(t, section, brand, campaign)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function pickLine(
  t: TFunction,
  section: 'voices' | 'audiences',
  brand: BrandData,
  campaign: Campaign,
): string {
  const binding: CampaignBrand = {
    voiceId: campaign.brand_voice_id,
    audienceId: campaign.brand_audience_id,
  }
  if (section === 'audiences') {
    const { audience } = resolveAudience(brand, binding, EMPTY_POST_BRAND)
    return audience ? audience.name : t('brand.detail.usedBy.noAudience')
  }
  const { voice, source } = resolveVoice(brand, binding, EMPTY_POST_BRAND)
  if (!voice) return t('brand.detail.usedBy.noVoice')
  return source === 'library'
    ? t('brand.detail.usedBy.defaultVoice', { voice: voice.name })
    : voice.name
}
