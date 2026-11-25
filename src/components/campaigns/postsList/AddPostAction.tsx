import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretRightIcon, PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { ModalContainer } from '@/components/ui/modal'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useAddPostTo } from '@/hooks/usePosts'
import { identityColorVar } from '@/lib/identity'
import { formatDateRange } from '@/lib/intl'
import type { Campaign } from '@/types/campaigns'

/**
 * The posts list's ADD POST, in the page header's top-right — a list has
 * creation rather than commit, so it sits where ADD CAMPAIGN does.
 *
 * On a campaign's list it makes the post there. On the all-campaigns list a
 * post still has to belong to one, so it asks which in a modal: every active
 * campaign, with its colour and its dates. A workspace with exactly one
 * campaign never gets here — `/posts` sends it to that campaign's list.
 *
 * The post allowance is answered here, before anything is asked (CON-295).
 */
export function AddPostAction({ campaignId }: { campaignId: string | null }) {
  const { t } = useTranslation()
  const gate = useUpgradeGate('posts_total')
  const addPostTo = useAddPostTo()
  const [choosing, setChoosing] = useState(false)
  const { data: campaigns = [] } = useCampaigns()

  return (
    <>
      <Button
        size="lg"
        disabled={campaignId === null && campaigns.length === 0}
        onClick={gate.intent(() => {
          if (campaignId) addPostTo(campaignId)
          else setChoosing(true)
        })}
      >
        <PlusIcon />
        <span>{t('calendar.addPost')}</span>
      </Button>
      {campaignId === null && (
        <ModalContainer
          isOpen={choosing}
          onClose={() => setChoosing(false)}
          title={t('postsTable.chooseCampaign.title')}
          size="small"
        >
          <p className="mb-4 text-sm text-secondary-foreground">
            {t('postsTable.chooseCampaign.description')}
          </p>
          <ul className="-mx-2 flex max-h-[50vh] flex-col overflow-y-auto">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChoosing(false)
                    addPostTo(campaign.id)
                  }}
                  className="group flex w-full items-center gap-3 rounded-sm px-2 py-2.5 text-left hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    style={{ backgroundColor: identityColorVar(campaign.id) }}
                    className="size-2.5 shrink-0 rounded-full"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {campaign.name.trim() || t('nav.untitledCampaign')}
                  </span>
                  <span className="shrink-0 text-xs text-tertiary-foreground tabular-nums">
                    {campaignWindow(campaign)}
                  </span>
                  <CaretRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-tertiary-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </button>
              </li>
            ))}
          </ul>
        </ModalContainer>
      )}
      <UpgradeDialog gate={gate} />
    </>
  )
}

/** The window as one span, as the campaign switcher writes it. */
function campaignWindow(campaign: Campaign): string | null {
  if (!campaign.start_date || !campaign.end_date) return null
  const start = new Date(campaign.start_date)
  const end = new Date(campaign.end_date)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return formatDateRange(start, end, { month: 'short', day: 'numeric' })
}
