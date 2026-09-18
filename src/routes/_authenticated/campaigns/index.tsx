import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageLoader } from '@/components/page-primitives/PageLoader.tsx'
import { PageError } from '@/components/page-primitives/PageError.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState.tsx'
import { PlusIcon } from '@phosphor-icons/react'
import { ArchivedCampaigns } from '@/components/campaigns/ArchivedCampaigns.tsx'
import { CampaignCard } from '@/components/campaigns/CampaignCard.tsx'
import { CreateCampaignDialog } from '@/components/campaigns/CreateCampaignDialog.tsx'
import { useCampaigns } from '@/hooks/useCampaigns.ts'

/**
 * There is one campaigns list, with the archive as a drawer at the foot of it
 * (CON-156). `?archived=true` opens that drawer on arrival rather than
 * selecting a second view: it is what archiving a campaign redirects to, so
 * the campaign that just left this list can be seen arriving in the pile below
 * it instead of appearing to have been deleted. Still in the address rather
 * than in state because it is a place you can send someone to.
 */
type CampaignsSearch = { archived?: boolean }

export const Route = createFileRoute('/_authenticated/campaigns/')({
  component: Campaigns,
  validateSearch: (search: Record<string, unknown>): CampaignsSearch =>
    search.archived === true || search.archived === 'true'
      ? { archived: true }
      : {},
})

function Campaigns() {
  const { t } = useTranslation()
  const { archived = false } = Route.useSearch()
  const { data: campaigns, isLoading, isError } = useCampaigns()
  const [creating, setCreating] = useState(false)

  const hasCampaigns = !!(campaigns && campaigns.length > 0)

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <PageError header={t('campaigns.error')} />
      </PageContainer>
    )
  }

  // One scroll container owning the sticky header, the same shell as Overview
  // and Settings — cards pass under the header's gradient instead of stopping
  // at it. The header itself does not fade: this is the list you steer from,
  // so "Campaigns" and ADD CAMPAIGN stay legible however far you scroll.
  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader
          title={t('campaigns.title')}
          actions={
            <Button onClick={() => setCreating(true)} size="lg">
              <PlusIcon className="size-4" />
              <span>{t('campaigns.add')}</span>
            </Button>
          }
        />
        {hasCampaigns ? (
          <ul className="flex flex-col gap-3 px-3 lg:px-6 pt-4">
            {campaigns!.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard campaign={campaign} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grow grid px-3 lg:px-6 pb-6">
            <PageGridEmptyState
              title={t('campaigns.empty.title')}
              subtitle={t('campaigns.empty.subtitle')}
              actions={
                <Button
                  onClick={() => setCreating(true)}
                  variant="defaultInverted"
                >
                  <PlusIcon className="size-4" />
                  <span>{t('campaigns.add')}</span>
                </Button>
              }
            />
          </div>
        )}
        {/* After both branches: a workspace whose only campaigns are archived
            still has to be able to reach them, and the empty state's `grow`
            leaves this sitting at the bottom of the screen where it belongs.
            The inner column is `CampaignCard`'s own, so the drawer lines up
            with the cards it continues rather than spanning the page. */}
        <div className="px-3 lg:px-6 pt-2 pb-10">
          <div className="w-full max-w-content mx-auto">
            <ArchivedCampaigns defaultOpen={archived} />
          </div>
        </div>
      </div>
      <CreateCampaignDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
    </PageContainer>
  )
}
