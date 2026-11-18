import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { BrandSectionCards } from '@/components/brand/BrandOverview'
import { useBrand } from '@/hooks/useBrand'
import { useFacts } from '@/hooks/useFacts'
import { useGuardrailsStance } from '@/hooks/useGuardrailsStance'
import { fetched } from '@/lib/fetched'

/**
 * Strategy for one campaign, last part: what it takes from the workspace's
 * Foundation.
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
    <>
      <div className="mx-auto flex w-full max-w-content flex-col gap-1 pt-2">
        <h2 className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
          {t('campaigns.strategy.fromWorkspace.title')}
        </h2>
        <p className="text-sm text-secondary-foreground">
          {t('campaigns.strategy.fromWorkspace.body')}
        </p>
      </div>
      {children}
      <BrandSectionCards
        sections={['guardrails', 'facts']}
        brand={fetched(brand)}
        facts={facts}
        stance={stance}
        onOpen={(id) => navigate({ to: `/foundation/${id}` })}
      />
    </>
  )
}
