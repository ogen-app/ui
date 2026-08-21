import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BrandOverview } from '@/components/brand/BrandOverview'
import { EMPTY_BRAND } from '@/components/brand/types'

/**
 * `/brand` — the Overview tab.
 *
 * No flag guard: the parent layout (`brand.tsx`) owns it, so every tab is
 * gated once rather than five times.
 */
export const Route = createFileRoute('/_authenticated/brand/')({
  component: BrandOverviewTab,
})

function BrandOverviewTab() {
  const navigate = useNavigate()
  return (
    <BrandOverview
      state={{ isPending: false, data: EMPTY_BRAND }}
      onOpen={(id) => navigate({ to: `/brand/${id}` })}
    />
  )
}
