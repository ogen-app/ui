/**
 * What happens when this tab's workspace stops being ours (CON-147).
 *
 * Membership is re-validated on every request now, which is the security win of
 * per-request resolution — and the new failure mode. A workspace deleted from
 * another tab, or an owner removing you while you work, turns every scoped call
 * in this tab into a 403, and the tab has no way back on its own: its pinned
 * `X-Workspace-Id` is precisely what the server is refusing.
 *
 * This is the counterpart to `sessionExpiry.ts`, and takes the same shape for
 * the same reasons — one place, latched once, ending in a full page load so the
 * root guard re-seeds identity through the same path a cold boot does.
 *
 * The one difference is that it **verifies before acting**. A 403 is also the
 * honest answer to a member calling an owner-only route (renaming the
 * workspace, listing invitations), and tearing the tab down over a permission
 * error would be far worse than the bug it fixes. So the recovery asks the
 * account-level list — which is header-free, and therefore still answers — and
 * only acts when this tab's workspace is genuinely not on it.
 */

import { isFeatureEnabled } from "@/config/featureFlags";
import { apiUrl } from "@/services/api/base";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "./activeWorkspace";

let handled = false;
let checking = false;

/**
 * Called from the API layer for every 403 on a request that actually carried
 * `X-Workspace-Id`. Fire-and-forget: the caller's own error path stays intact
 * and runs to completion while the check is in flight.
 */
export function handleForbidden(): void {
  if (handled || checking) return;
  if (!isFeatureEnabled("multi-workspace")) return;
  const active = getActiveWorkspaceId();
  if (!active) return;

  checking = true;
  void verify(active).finally(() => {
    checking = false;
  });
}

async function verify(active: string): Promise<void> {
  let workspaces: Array<{ id?: string }>;
  try {
    // Deliberately a bare `fetch`, not `apiJson`: this module is imported from
    // the API layer's own response check, and routing the recovery back through
    // it would close an import cycle — and could re-enter this handler.
    const res = await fetch(apiUrl("/api/workspaces"), {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return; // Can't tell — leave the tab alone.
    workspaces = (await res.json()) as Array<{ id?: string }>;
  } catch {
    // Offline or the server went away. Neither means the workspace is gone.
    return;
  }

  if (!Array.isArray(workspaces)) return;
  if (workspaces.some((w) => w.id === active)) return; // A permission error, not a stale tab.

  handled = true;
  // Drop the pin and reload. The root guard re-seeds this tab from the
  // account's default; if the account has no workspace left, it lands where a
  // session with nothing to show belongs.
  setActiveWorkspaceId(null);
  window.location.assign("/");
}
