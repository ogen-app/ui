import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { PageContainer } from '@/components/page-primitives/PageContainer.tsx'
import { PageLoader } from '@/components/page-primitives/PageLoader.tsx'
import { PageError } from '@/components/page-primitives/PageError.tsx'
import { PageHeader } from '@/components/page-primitives/PageHeader.tsx'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState.tsx'
import { ArchiveIcon, PlusIcon } from '@phosphor-icons/react'
import { ArchivedCampaigns } from '@/components/campaigns/ArchivedCampaigns.tsx'
import { CampaignCard } from '@/components/campaigns/CampaignCard.tsx'
import { CreateCampaignDialog } from '@/components/campaigns/CreateCampaignDialog.tsx'
import { useCampaigns } from '@/hooks/useCampaigns.ts'
import { cn } from '@/lib'

/**
 * Which list is on screen lives in the address (CON-156), not in state: the
 * archive is a place you can be sent to and can link someone to, and coming
 * back from a campaign you just unarchived should land where you were.
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
  const navigate = useNavigate()
  const { archived = false } = Route.useSearch()
  const { data: campaigns, isLoading, isError } = useCampaigns()
  const [creating, setCreating] = useState(false)

  const hasCampaigns = !!(campaigns && campaigns.length > 0)

  if (isLoading && !archived) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (isError && !archived) {
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
          title={archived ? t('campaigns.archivedTitle') : t('campaigns.title')}
          actions={
            <div className="flex items-center gap-4">
              {/* Top-right is views only, and this is a view: the same
                  campaigns screen showing the set that has been put away.
                  Creating is not offered from inside the archive — the new
                  campaign would appear in a list you are not looking at. */}
              <Button
                variant="headerIcon"
                size="excluded"
                className={cn(archived && 'text-accent hover:text-accent')}
                aria-label={
                  archived
                    ? t('campaigns.showActive')
                    : t('campaigns.showArchived')
                }
                aria-pressed={archived}
                onClick={() =>
                  void navigate({
                    to: '/campaigns',
                    search: archived ? {} : { archived: true },
                  })
                }
              >
                <ArchiveIcon
                  weight={archived ? 'fill' : 'regular'}
                  className="size-5"
                />
              </Button>
              {!archived && (
                <Button onClick={() => setCreating(true)} size="lg">
                  <PlusIcon className="size-4" />
                  <span>{t('campaigns.add')}</span>
                </Button>
              )}
            </div>
          }
        />
        {archived ? (
          <ArchivedCampaigns />
        ) : hasCampaigns ? (
          <ul className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
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
      </div>
      <CreateCampaignDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
    </PageContainer>
  )
}
