import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VoicesSection } from '@/components/brand/VoicesSection'
import { BrandDetail } from '@/components/brand/detail'
import type { BrandData } from '@/components/brand/types'
import { useUsedBy } from '@/components/brand/usedBy'

/**
 * `/foundation/voices` — the cast, one level down from the Overview.
 *
 * The first Brand section with a level below it: a voice is a screen of its own
 * again (`brand_/voices/$voiceId`), because writing one is pasting posts,
 * promoting samples and setting rules, and none of that fits in a card.
 * Audiences is the second, and takes this file's shape exactly.
 *
 * Every way out of this screen leads to that same editor: writing one, forking
 * a starter and opening an existing voice differ only in what the editor opens
 * with. That is why the section takes three callbacks and not three flows.
 */
export const Route = createFileRoute('/_authenticated/foundation/voices')({
  component: VoicesPage,
})

function VoicesPage() {
  return (
    <BrandDetail section="voices">
      {(brand) => <VoicesList brand={brand} />}
    </BrandDetail>
  )
}

/**
 * The list in a component of its own, so the campaigns that say what uses
 * each voice (`useUsedBy`) are read by a hook that runs once the brand has.
 */
function VoicesList({ brand }: { brand: BrandData }) {
  const navigate = useNavigate()
  const usedBy = useUsedBy('voices', brand)

  return (
    <VoicesSection
      voices={brand.voices}
      usedBy={usedBy}
      onAdd={() =>
        navigate({
          to: '/foundation/voices/$voiceId',
          params: { voiceId: 'new' },
        })
      }
      onOpen={(voiceId) =>
        navigate({ to: '/foundation/voices/$voiceId', params: { voiceId } })
      }
      onStart={(from) =>
        navigate({
          to: '/foundation/voices/$voiceId',
          params: { voiceId: 'new' },
          search: { from },
        })
      }
    />
  )
}
