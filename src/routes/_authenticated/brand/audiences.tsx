import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AudiencesSection } from '@/components/brand/AudiencesSection'
import { BrandDetail } from '@/components/brand/detail'

/**
 * `/brand/audiences` — who the content is for.
 *
 * The second section with a level below it, and wired exactly as Voices is:
 * describing one, forking a starter and opening an existing entry all lead to
 * the same editor and differ only in what it opens with. That is why the
 * section takes three callbacks and not three flows.
 */
export const Route = createFileRoute('/_authenticated/brand/audiences')({
  component: AudiencesPage,
})

function AudiencesPage() {
  const navigate = useNavigate()

  return (
    <BrandDetail section="audiences">
      {(brand) => (
        <AudiencesSection
          audiences={brand.audiences}
          onAdd={() =>
            navigate({
              to: '/brand/audiences/$audienceId',
              params: { audienceId: 'new' },
            })
          }
          onOpen={(audienceId) =>
            navigate({ to: '/brand/audiences/$audienceId', params: { audienceId } })
          }
          onStart={(from) =>
            navigate({
              to: '/brand/audiences/$audienceId',
              params: { audienceId: 'new' },
              search: { from },
            })
          }
        />
      )}
    </BrandDetail>
  )
}
