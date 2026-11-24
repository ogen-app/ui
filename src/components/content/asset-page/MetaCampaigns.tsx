import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { FlagIcon, PlusIcon } from '@phosphor-icons/react'
import { Mark } from '@/components/posts/quickBar/parts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { assetAnalysesKey } from '@/hooks/useAssetAnalyses'
import { useCampaigns } from '@/hooks/useCampaigns'
import { addToCampaign } from '@/lib/campaignMembership'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { CampaignMark } from './CampaignMark'
import { ValueLine, ValueLines } from './ValueLines'

/** How many campaigns show before "+N more". */
const FIRST_CAMPAIGNS = 5

/**
 * The campaigns an asset serves, each with how well it fits that campaign
 * when its lens has said, and the way to add it to another — the Overview's
 * Campaigns row, one a line under About's rules. The campaign whose reading
 * is open is marked, so the fit beside it is the one the
 * ideas were read for.
 *
 * Adding goes through the same membership write the Content page uses
 * (`addToCampaign`), and the server answers it by queueing that campaign's
 * analysis — so the analyses are refetched at once, and the new lens appears
 * in the picker as pending rather than after the next poll.
 */
export function MetaCampaigns({
  assetId,
  lenses,
  openCampaignId,
}: {
  assetId: string
  lenses: AssetAnalysis[]
  openCampaignId: string | null
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
    <ValueLines>
      {memberOf.length === 0 && (
        <ValueLine mark={<FlagIcon />} className="text-secondary-foreground">
          {t('assetInsights.meta.noCampaigns')}
        </ValueLine>
      )}
      {shown.map((c) => {
        const score = lenses.find((l) => l.campaign_id === c.id)?.relevance
          ?.score
        const open = c.id === openCampaignId
        return (
          <li key={c.id} className="flex min-w-0">
            <Link
              to="/campaigns/$campaignId/assets/$assetId"
              params={{ campaignId: c.id, assetId }}
              aria-current={open ? 'true' : undefined}
              className={cn(
                '-mx-1.5 flex min-h-6 min-w-0 flex-1 items-center gap-1.5 rounded-button px-1.5 text-foreground hover:bg-secondary',
                open && 'bg-accent/10 font-medium hover:bg-accent/10',
              )}
            >
              <Mark>
                <CampaignMark
                  id={c.id}
                  name={c.name}
                  className="size-4 rounded-[3px] text-mark"
                />
              </Mark>
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {score !== undefined && (
                <span className="shrink-0 text-xs font-normal tabular-nums text-secondary-foreground">
                  {t('assetInsights.fit', {
                    score: formatNumber(score, {}, i18n.language),
                  })}
                </span>
              )}
            </Link>
          </li>
        )
      })}
      {hidden > 0 && (
        <li className="flex min-h-6 items-center pl-5.5">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="cursor-pointer text-secondary-foreground hover:text-foreground"
          >
            {t('assetInsights.meta.moreCampaigns', { count: hidden })}
          </button>
        </li>
      )}
      {others.length > 0 && (
        <li className="flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={adding}
                className="flex min-h-6 cursor-pointer items-center gap-1.5 font-medium text-accent hover:underline disabled:opacity-50"
              >
                <Mark>
                  <PlusIcon className="text-accent" />
                </Mark>
                {t('assetInsights.meta.addToCampaign')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 min-w-[240px]"
            >
              {others.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={() => void add(c.id)}>
                  <CampaignMark id={c.id} name={c.name} />
                  <span className="truncate">{c.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      )}
    </ValueLines>
  )
}
