import { useTranslation } from 'react-i18next'
import { Archive02Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useEndCampaign } from '@/components/campaigns/useEndCampaign'
import type { Campaign } from '@/types/campaigns'

/**
 * The two ways to stop running a campaign, in one card.
 *
 * Archiving used to sit in a card of its own, above this one, on the reasoning
 * that a red heading beside a delete would teach people to avoid the safe
 * option. That reasoning made the wrong trade: it left someone who wanted rid
 * of a campaign scanning two cards to find out which one they meant, and the
 * card that offered the *reversible* answer was the one they had already
 * scrolled past. Both actions live here, archive first, in the card's content
 * rather than its header (a header holds one), and both wear the destructive
 * button: what they have in common is that they take a campaign
 * out of circulation, and the card is titled Danger Zone. Which of the two is
 * reversible is a fact about consequences, and consequences are stated in the
 * modals rather than encoded in a button colour nobody reads that closely.
 *
 * The card's own copy is deliberately one generalised sentence. Consequences
 * belong on the click, not on the page: stated up here they are read once and
 * skipped forever after, and they are exactly what the person about to
 * confirm needs in front of them. So each action opens a modal that says what
 * it does — which is also why the delete no longer goes through
 * `window.confirm`, whose one line of text cannot hold them.
 *
 * The modals are `useEndCampaign`'s, shared with the campaign's menu in the
 * bar above the page — the way in for someone who never scrolls this far.
 */
export function CampaignDangerZone({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation()
  const { ask, dialogs } = useEndCampaign(campaign)

  return (
    <>
      <Card title={t('campaigns.dangerZone.title')} capped>
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-150 text-sm text-tertiary-foreground">
            {t('campaigns.dangerZone.body')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => ask('archive')}
            >
              <HugeiconsIcon icon={Archive02Icon} strokeWidth={1.5} />
              <span>{t('campaigns.dangerZone.archive.action')}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => ask('delete')}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
              <span>{t('campaigns.dangerZone.delete.action')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {dialogs}
    </>
  )
}
