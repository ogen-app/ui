import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AudiencesSection } from '@/components/brand/AudiencesSection'
import { BrandDetail } from '@/components/brand/detail'
import type { BrandData } from '@/components/brand/types'
import { useUsedBy } from '@/components/brand/usedBy'

/**
 * `/foundation/audiences` — who the content is for.
 *
 * The second section with a level below it, and wired exactly as Voices is:
 * describing one, forking a starter and opening an existing entry all lead to
 * the same editor and differ only in what it opens with. That is why the
 * section takes three callbacks and not three flows.
 */
export const Route = createFileRoute('/_authenticated/foundation/audiences')({
  component: AudiencesPage,
})

function AudiencesPage() {
  return (
    <BrandDetail section="audiences">
      {(brand) => <AudiencesList brand={brand} />}
    </BrandDetail>
  )
}

/** Voices' arrangement: the list reads what uses each audience (`useUsedBy`). */
function AudiencesList({ brand }: { brand: BrandData }) {
  const navigate = useNavigate()
  const usedBy = useUsedBy('audiences', brand)

  return (
    <AudiencesSection
      audiences={brand.audiences}
      usedBy={usedBy}
      onAdd={() =>
        navigate({
          to: '/foundation/audiences/$audienceId',
          params: { audienceId: 'new' },
        })
      }
      onOpen={(audienceId) =>
        navigate({
          to: '/foundation/audiences/$audienceId',
          params: { audienceId },
        })
      }
      onStart={(from) =>
        navigate({
          to: '/foundation/audiences/$audienceId',
          params: { audienceId: 'new' },
          search: { from },
        })
      }
    />
  )
}
