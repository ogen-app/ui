import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { BrandSectionCards } from '@/components/brand/BrandOverview'
import { PageSection } from '@/components/page-primitives/PageSection'
import { useBrand } from '@/hooks/useBrand'
import { useFacts } from '@/hooks/useFacts'
import { useGuardrailsStance } from '@/hooks/useGuardrailsStance'
import { fetched } from '@/lib/fetched'

/**
 * Strategy for one campaign, second band: the Foundation, as this campaign
 * has it. The same band, under the same name, that Strategy for all campaigns
 * ends with.
 *
 * Two kinds of thing, in that order. The voice, the audience and the series
 * are the campaign's to choose, and `children` are the cards that choose them.
 * The guardrails and the facts are not: they
 * apply to every generation in every campaign, so a control for them here would
 * imply a campaign could opt out, and an edit made here would quietly change
 * every other campaign too. So they are shown in full, as the Foundation's own
 * cards, and opening one goes to Strategy for all campaigns, where it is edited.
 */
export function FromTheWorkspace({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const brand = useBrand()
  const { facts } = useFacts()
  const stance = useGuardrailsStance()

  return (
    <PageSection
      title={t('nav.foundation')}
      description={t('campaigns.strategy.bands.foundationForCampaign')}
    >
      {children}
      <BrandSectionCards
        sections={['guardrails', 'facts']}
        brand={fetched(brand)}
        facts={facts}
        stance={stance}
        onOpen={(id) => navigate({ to: `/foundation/${id}` })}
      />
    </PageSection>
  )
}
