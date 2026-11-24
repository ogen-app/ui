import { createFileRoute } from '@tanstack/react-router'
import { ConnectPicker } from '@/components/workspace-settings/ConnectPicker'
import type { ConnectReturn } from '@/types/integrations'

/**
 * `/workspace-settings/connect/:connectionId` — the in-Ogen target picker
 * (CON-217).
 *
 * Nothing in the app links here. The backend redirects the browser to it after
 * an authorization that covered more than one publishable page or profile, and
 * the id in the path is the only thing tying this screen to that connect.
 * Authenticated like the rest of settings: the id alone is not enough, the
 * session has to belong to the workspace that started the connect, and the
 * server checks that too. A connect started from setup arrives with
 * `?returnTo=onboarding`, and goes back there.
 */
export const Route = createFileRoute(
  '/_authenticated/workspace-settings/connect/$connectionId',
)({
  validateSearch: (
    search: Record<string, unknown>,
  ): { returnTo?: ConnectReturn } =>
    search.returnTo === 'onboarding' ? { returnTo: 'onboarding' } : {},
  component: ConnectPickerRoute,
})

function ConnectPickerRoute() {
  const { connectionId } = Route.useParams()
  const { returnTo } = Route.useSearch()
  return <ConnectPicker connectionId={connectionId} returnTo={returnTo} />
}
