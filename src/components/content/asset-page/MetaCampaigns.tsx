import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { assetAnalysesKey } from '@/hooks/useAssetAnalyses'
import { useCampaigns } from '@/hooks/useCampaigns'
import { addToCampaign } from '@/lib/campaignMembership'
import { formatNumber } from '@/lib/intl'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { CampaignMark } from './CampaignMark'

/** How many campaigns show before "+N more". */
const FIRST_CAMPAIGNS = 5

/**
 * The campaigns an asset serves, each with how well it fits that campaign
 * when its lens has said, and the way to add it to another.
 *
 * Adding goes through the same membership write the Content page uses
 * (`addToCampaign`), and the server answers it by queueing that campaign's
 * analysis — so the analyses are refetched at once, and the new lens appears
 * in the picker as pending rather than after the next poll.
 */
export function MetaCampaigns({
  assetId,
  lenses,
}: {
  assetId: string
  lenses: AssetAnalysis[]
}) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const campaigns = useCampaigns()
  const [showAll, setShowAll] = useState(false)
  const [adding, setAdding] = useState(false)
  const all = campaigns.data ?? []
  const memberOf = all.filter((c) => c.asset_ids.includes(assetId))
  const others = all.filter((c) => !c.asset_ids.includes(assetId))
  const shown = showAll ? memberOf : memberOf.slice(0, FIRST_CAMPAIGNS)
  const hidden = memberOf.length - shown.length

  const add = async (campaignId: string) => {
    setAdding(true)
    const added = await addToCampaign(campaignId, [assetId])
    setAdding(false)
    if (added)
      void qc.invalidateQueries({ queryKey: assetAnalysesKey(assetId) })
  }

  return (
    <section className="flex flex-col gap-3 border-t border-quaternary pt-5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
        {t('assetInsights.meta.campaigns')}
      </h2>
      {memberOf.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          {t('assetInsights.meta.noCampaigns')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((c) => {
            const score = lenses.find((l) => l.campaign_id === c.id)?.relevance
              ?.score
            return (
              <li key={c.id}>
                <Link
                  to="/campaigns/$campaignId/assets/$assetId"
                  params={{ campaignId: c.id, assetId }}
                  className="flex items-center gap-3 rounded-md py-1 text-sm text-foreground hover:text-primary-foreground"
                >
                  <CampaignMark id={c.id} name={c.name} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {score !== undefined && (
                    <span className="shrink-0 text-xs tabular-nums text-tertiary-foreground">
                      {t('assetInsights.fit', {
                        score: formatNumber(score, {}, i18n.language),
                      })}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="cursor-pointer self-start text-sm text-tertiary-foreground hover:text-foreground"
        >
          {t('assetInsights.meta.moreCampaigns', { count: hidden })}
        </button>
      )}
      {others.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={adding}
              className="flex cursor-pointer items-center gap-1.5 self-start text-sm font-medium text-accent hover:underline disabled:opacity-50"
            >
              <PlusIcon className="size-4" aria-hidden />
              {t('assetInsights.meta.addToCampaign')}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 min-w-[240px]">
            {others.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => void add(c.id)}>
                <CampaignMark id={c.id} name={c.name} />
                <span className="truncate">{c.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </section>
  )
}
