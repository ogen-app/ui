/**
 * The web-app half of the Figma plugin (CON-338 §7.2, CON-339).
 *
 * The plugin cannot use the browser's session, so it pairs instead: it opens
 * `/integrations/figma/connect?key=<write_key>` in the user's browser, the
 * signed-in user approves there, and the plugin collects a token by polling
 * with a read key that never leaves it. These are the calls that page makes,
 * plus the list and revoke behind Workspace Settings.
 *
 * The write key in the path can only preview, approve or deny — it is not the
 * token. Every unusable key (expired, unknown, already collected) answers the
 * same `410`, so the page says the same thing back for all of them.
 */

import type {
  PluginConnection,
  PluginPairingPreview,
} from '@/types/integrations'
import { apiJson, apiVoid } from './http'

const BASE = '/api/integrations/figma'

function pairingPath(key: string): string {
  return `${BASE}/pairings/${encodeURIComponent(key)}`
}

/** `GET …/pairings/:write_key` — what the plugin is asking for. */
export function previewFigmaPairing(
  key: string,
): Promise<PluginPairingPreview> {
  return apiJson<PluginPairingPreview>(
    pairingPath(key),
    'Unable to load the connection request',
  )
}

/**
 * `POST …/pairings/:write_key/approve` — mints the plugin's token in
 * `workspaceId`, which is the user's choice on the approval page and need not
 * be the tab's own workspace. The tab is not moved there. `409
 * pairing_not_pending` when the request was already answered.
 */
export async function approveFigmaPairing(
  key: string,
  workspaceId: string,
): Promise<PluginConnection> {
  const res = await apiJson<{ connection: PluginConnection }>(
    `${pairingPath(key)}/approve`,
    'Unable to connect the plugin',
    { method: 'POST', workspaceId },
  )
  return res.connection
}

/** `POST …/pairings/:write_key/deny` — the plugin's next poll is told no. */
export function denyFigmaPairing(
  key: string,
  workspaceId: string,
): Promise<void> {
  return apiVoid(`${pairingPath(key)}/deny`, 'Unable to decline the request', {
    method: 'POST',
    workspaceId,
  })
}

/**
 * `GET …/connections` — the caller's own connections in this workspace, or
 * every member's for an owner. Each row names its member either way.
 */
export async function listFigmaConnections(): Promise<PluginConnection[]> {
  const res = await apiJson<{ connections: PluginConnection[] | null }>(
    `${BASE}/connections`,
    'Unable to load Figma connections',
  )
  return res.connections ?? []
}

/**
 * `DELETE …/connections/:id` — the plugin's next call answers 401 and it
 * drops back to its Connect screen. Self or owner; anyone else gets 403.
 */
export function revokeFigmaConnection(id: string): Promise<void> {
  return apiVoid(
    `${BASE}/connections/${encodeURIComponent(id)}`,
    'Unable to disconnect the plugin',
    { method: 'DELETE' },
  )
}
