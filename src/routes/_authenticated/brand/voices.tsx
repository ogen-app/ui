import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VoicesSection } from '@/components/brand/VoicesSection'
import { BrandDetail } from '@/components/brand/detail'

/**
 * `/brand/voices` — the cast, one level down from the Overview.
 *
 * The only Brand section with a level below it: a voice is a screen of its own
 * again (`brand_/voices/$voiceId`), because writing one is pasting posts,
 * promoting samples and setting rules, and none of that fits in a card.
 *
 * Every way out of this screen leads to that same editor: writing one, forking
 * a starter and opening an existing voice differ only in what the editor opens
 * with. That is why the section takes three callbacks and not three flows.
 */
export const Route = createFileRoute('/_authenticated/brand/voices')({
  component: VoicesPage,
})

function VoicesPage() {
  const navigate = useNavigate()

  return (
    <BrandDetail section="voices">
      {(brand) => (
        <VoicesSection
          voices={brand.voices}
          onAdd={() =>
            navigate({ to: '/brand/voices/$voiceId', params: { voiceId: 'new' } })
          }
          onOpen={(voiceId) =>
            navigate({ to: '/brand/voices/$voiceId', params: { voiceId } })
          }
          onStart={(from) =>
            navigate({
              to: '/brand/voices/$voiceId',
              params: { voiceId: 'new' },
              search: { from },
            })
          }
        />
      )}
    </BrandDetail>
  )
}
