import { useTranslation } from 'react-i18next'

import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageError } from '@/components/page-primitives/PageError'
import { Button } from '@/components/ui/button'

/**
 * Last-resort fallback for the app-root error boundary (CON-304). A React
 * render crash reaches here rather than a white screen; the boundary that
 * mounts it also reports the error to Sentry when telemetry is on.
 *
 * The action reloads rather than linking home: the router may be the thing that
 * broke, so `<Link>` can't be trusted — a full reload re-runs the root guard
 * and rebuilds the tree from scratch.
 */
export function AppErrorFallback() {
  const { t } = useTranslation()
  return (
    <PageContainer variant="fullscreen">
      <PageError
        subHeader={t('errors.crash.code')}
        header={t('errors.crash.title')}
        message={t('errors.crash.message')}
        errorType={t('errors.crash.type')}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('errors.crash.reload')}
          </Button>
        }
      />
    </PageContainer>
  )
}
