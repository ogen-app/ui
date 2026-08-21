import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VoicesSection } from '@/components/brand/VoicesSection'
import { BrandTabScroll } from '@/components/brand/tabScroll'
import { EMPTY_BRAND } from '@/components/brand/types'

/**
 * `/brand/voices` — the cast, on its own screen.
 *
 * Every way out of this screen leads to the same editor: writing one, forking a
 * starter and opening an existing voice differ only in what the editor opens
 * with. That is why the section takes three callbacks and not three flows.
 */
export const Route = createFileRoute('/_authenticated/brand/voices')({
  component: VoicesTab,
})

function VoicesTab() {
  const navigate = useNavigate()

  return (
    <BrandTabScroll>
      <VoicesSection
        voices={EMPTY_BRAND.voices}
        onAdd={() => navigate({ to: '/brand/voices/$voiceId', params: { voiceId: 'new' } })}
        onOpen={(voiceId) => navigate({ to: '/brand/voices/$voiceId', params: { voiceId } })}
        onStart={(from) =>
          navigate({
            to: '/brand/voices/$voiceId',
            params: { voiceId: 'new' },
            search: { from },
          })
        }
      />
    </BrandTabScroll>
  )
}
