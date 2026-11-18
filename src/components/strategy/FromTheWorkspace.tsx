import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BrandSectionCards } from '@/components/brand/BrandOverview'
import { useBrand } from '@/hooks/useBrand'
import { useFacts } from '@/hooks/useFacts'
import { useGuardrailsStance } from '@/hooks/useGuardrailsStance'
import { fetched } from '@/lib/fetched'

/**
 * Strategy for one campaign, second group: the Foundation, as this campaign
 * has it — the same cards Strategy for all campaigns is made of.
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
  const navigate = useNavigate()
  const brand = useBrand()
  const { facts } = useFacts()
  const stance = useGuardrailsStance()

  return (
    <div className="flex flex-col gap-4">
      {children}
      <BrandSectionCards
        sections={['guardrails', 'facts']}
        brand={fetched(brand)}
        facts={facts}
        stance={stance}
        onOpen={(id) => navigate({ to: `/foundation/${id}` })}
      />
    </div>
  )
}
