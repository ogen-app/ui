import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  CheckIcon,
  CircleDashedIcon,
} from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isLensWaiting, lensKey } from '@/lib/assetAnalysis'
import { formatNumber } from '@/lib/intl'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { CampaignMark } from './CampaignMark'

type Props = {
  lenses: AssetAnalysis[]
  current: AssetAnalysis
  onChange: (key: string) => void
}

/**
 * "Reading for Spring launch · 88% ▾" — which reading of the asset the
 * Insights tab shows (CON-366).
 *
 * A dropdown rather than tabs: an asset can serve any number of campaigns,
 * and a row of segments stops fitting at the third. Every lens is listed with
 * its fit, and one still being analysed says so with a spinner, so choosing it
 * and getting a skeleton is not a surprise.
 */
export function LensPicker({ lenses, current, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-md border border-quaternary px-3 text-sm hover:bg-secondary"
        >
          <span className="shrink-0 text-secondary-foreground">
            {t('assetInsights.lens.readingFor')}
          </span>
          <LensName lens={current} />
          <CaretDownIcon className="size-4 shrink-0 text-tertiary-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[260px]">
        {lenses.map((lens) => {
          const key = lensKey(lens)
          const selected = key === lensKey(current)
          return (
            <DropdownMenuItem key={key} onSelect={() => onChange(key)}>
              <CheckIcon
                className={selected ? 'opacity-100' : 'opacity-0'}
                aria-hidden
              />
              <LensName lens={lens} withFit={false} />
              <span className="ml-auto pl-4">
                {isLensWaiting(lens) ? (
                  <CircleDashedIcon
                    className="size-4 animate-spin text-tertiary-foreground"
                    aria-hidden
                  />
                ) : (
                  <Fit lens={lens} />
                )}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LensName({
  lens,
  withFit = true,
}: {
  lens: AssetAnalysis
  withFit?: boolean
}) {
  const { t } = useTranslation()
  if (lens.campaign_id === null) {
    return (
      <span className="truncate font-medium text-foreground">
        {t('assetInsights.lens.workspace')}
      </span>
    )
  }
  const name = lens.campaign_name ?? t('assetInsights.lens.campaign')
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CampaignMark id={lens.campaign_id} name={name} />
      <span className="truncate font-medium text-foreground">{name}</span>
      {withFit && lens.relevance && (
        <span className="shrink-0 text-secondary-foreground">
          · <Fit lens={lens} />
        </span>
      )}
    </span>
  )
}

function Fit({ lens }: { lens: AssetAnalysis }) {
  const { i18n } = useTranslation()
  if (!lens.relevance) return null
  return (
    <span className="text-xs tabular-nums text-secondary-foreground">
      {formatNumber(
        lens.relevance.score / 100,
        { style: 'percent' },
        i18n.language,
      )}
    </span>
  )
}
