import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DistillPage } from '@/components/brand/distill/DistillPage'
import { QuestionsScreen } from '@/components/brand/distill/QuestionsScreen'
import { isFeatureEnabled } from '@/config/featureFlags'

/**
 * `/foundation/questions` — the offer's third route (CON-400 board 5A): a
 * handful of questions for a brand nothing is written down for. DRAFT IT
 * starts a read and moves to it, so this page is only ever the way in.
 *
 * Gated here as well as on the hub's tile — every entry point, including an
 * address somebody kept.
 */
export const Route = createFileRoute('/_authenticated/foundation/questions')({
  beforeLoad: () => {
    if (!isFeatureEnabled('brand-distill'))
      throw redirect({ to: '/foundation' })
  },
  component: QuestionsPage,
})

function QuestionsPage() {
  const { t } = useTranslation()
  return (
    <DistillPage title={t('brand.distill.questions.title')}>
      <QuestionsScreen />
    </DistillPage>
  )
}
