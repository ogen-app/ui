import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { savedSentence } from '@/lib/brandDistillCopy'
import { useBrandDistillStore } from '@/stores/brandDistillStore'

/**
 * What a save came to, said once on the hub it lands on (CON-400 board 6A).
 *
 * One card, closable, and it does not come back: the saved material is
 * already in its usual cards under it, each with an origin line saying where
 * it was read from, so this is the receipt and not the record. It says what
 * was saved and what was not and why — the commit's `applied` and `skipped`
 * — because "2 facts were already in your ledger" is the difference between a
 * save that dropped things and one that declined to repeat them.
 */
export function SavedCard() {
  const { t, i18n } = useTranslation()
  const saved = useBrandDistillStore((s) => s.saved)
  const setSaved = useBrandDistillStore((s) => s.setSaved)
  if (!saved) return null

  return (
    <Card
      icon={CheckmarkCircle02Icon}
      tone="var(--positive)"
      title={t('brand.distill.saved.title')}
      onDismiss={() => setSaved(null)}
      capped
    >
      <p className="text-sm">{savedSentence(t, saved, i18n.language)}</p>
    </Card>
  )
}
