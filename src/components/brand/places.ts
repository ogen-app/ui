import { useNavigate } from '@tanstack/react-router'
import type { BrandSectionId } from '@/lib/brandSections'
import type { FactSubject } from './facts'

/**
 * Each of the guardrails page's four cards, as the anchor a row on the hub
 * lands on — `GuardrailsEditor` gives its cards these ids.
 */
export const GUARDRAIL_PARTS = [
  'may-claim',
  'never-claim',
  'banned-words',
  'disclaimer',
] as const
export type GuardrailPart = (typeof GUARDRAIL_PARTS)[number]

/**
 * One thing inside a Foundation section, which a row on the hub or on a
 * campaign's Strategy opens: an entry of a library, one card of the guardrails,
 * or the ledger on one tab.
 */
export type BrandPlace =
  | { section: 'voices' | 'audiences' | 'series'; id: string }
  | { section: 'guardrails'; part: GuardrailPart }
  | { section: 'facts'; tab?: FactSubject }

/** Goes to a section, or to one thing inside it. */
export function useOpenBrand() {
  const navigate = useNavigate()
  return {
    section: (id: BrandSectionId) => navigate({ to: `/foundation/${id}` }),
    place: (place: BrandPlace) => {
      switch (place.section) {
        case 'voices':
          return navigate({
            to: '/foundation/voices/$voiceId',
            params: { voiceId: place.id },
          })
        case 'audiences':
          return navigate({
            to: '/foundation/audiences/$audienceId',
            params: { audienceId: place.id },
          })
        case 'series':
          return navigate({
            to: '/foundation/series/$seriesId',
            params: { seriesId: place.id },
          })
        case 'guardrails':
          return navigate({ to: '/foundation/guardrails', hash: place.part })
        case 'facts':
          return navigate({
            to: '/foundation/facts',
            search: place.tab ? { tab: place.tab } : {},
          })
      }
    },
  }
}
