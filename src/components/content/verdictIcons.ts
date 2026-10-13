import type { IconSvgElement } from '@hugeicons/react'
import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  DashedLineCircleIcon,
} from '@hugeicons/core-free-icons'
import type { VerdictKey } from '@/lib/assetList'

/**
 * Each verdict's mark (CON-370) — the Assets list's pill and the asset page's
 * piles, so a verdict looks the same wherever it is counted.
 */
export const VERDICT_ICON: Record<VerdictKey, IconSvgElement> = {
  waiting: DashedLineCircleIcon,
  yes: CheckmarkCircle02Icon,
  later: Clock01Icon,
  no: CancelCircleIcon,
}
