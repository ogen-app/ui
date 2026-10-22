import { CheckCircleIcon, XIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
    <section className="relative mx-auto flex w-full max-w-content flex-col gap-2 bg-primary px-6 py-5">
      <Button
        variant="ghost"
        size="smIcon"
        className="absolute top-3 right-3"
        aria-label={t('brand.distill.saved.dismiss')}
        onClick={() => setSaved(null)}
      >
        <XIcon />
      </Button>
      <h2 className="flex items-center gap-2 pr-10 font-display text-lg font-medium leading-6 tracking-tight">
        <CheckCircleIcon
          weight="fill"
          aria-hidden
          className="size-5 shrink-0 text-positive"
        />
        {t('brand.distill.saved.title')}
      </h2>
      <p className="max-w-2xl text-sm leading-5 text-secondary-foreground">
        {savedSentence(t, saved, i18n.language)}
      </p>
    </section>
  )
}
