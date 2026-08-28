import { createFileRoute } from '@tanstack/react-router'
import { ConnectPicker } from '@/components/workspace-settings/ConnectPicker'

/**
 * `/workspace-settings/connect/:connectionId` — the in-Ogen target picker
 * (CON-217).
 *
 * Nothing in the app links here. The backend redirects the browser to it after
 * an authorization that covered more than one publishable page or profile, and
 * the id in the path is the only thing tying this screen to that connect.
 * Authenticated like the rest of settings: the id alone is not enough, the
 * session has to belong to the workspace that started the connect, and the
 * server checks that too.
 */
export const Route = createFileRoute(
  '/_authenticated/workspace-settings/connect/$connectionId',
)({
  component: ConnectPickerRoute,
})

function ConnectPickerRoute() {
  const { connectionId } = Route.useParams()
  return <ConnectPicker connectionId={connectionId} />
}
