import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  inviteMember,
  listInvitations,
  listMembers,
  listWorkspaces,
  removeMember,
  revokeInvitation,
  switchWorkspace,
  updateMemberRole,
  updateWorkspace,
} from '@/services/api/workspaces'
import { invalidateSession } from '@/services/api/sessions'
import { flushAllPendingSaves } from '@/lib/pendingSaves'
import { queryClient } from '@/lib/queryClient'
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from '@/lib/activeWorkspace'
import { reconnectEvents } from '@/stores/eventStreamStore'
import { reconnectNotifications } from '@/stores/notificationStreamStore'
import { useAuthStore } from '@/stores/authStore'
import type {
  CreateWorkspacePayload,
  InvitePayload,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceRole,
} from '@/types/workspace'

export const WORKSPACE_KEY = ['workspace'] as const
export const WORKSPACE_MEMBERS_KEY = ['workspace', 'members'] as const
export const WORKSPACE_INVITATIONS_KEY = ['workspace', 'invitations'] as const
/** The account's workspaces — the list the chooser chooses between (CON-147). */
export const WORKSPACES_KEY = ['workspaces'] as const

/**
 * The workspace **this tab** is working in, with the caller's role in it.
 *
 * The tenant comes from a query — `GET /api/tenants/current`, which is
 * workspace-scoped, so it answers for whichever workspace this tab's header
 * names — and a rename therefore refreshes every screen showing the name.
 *
 * The role is the subtle half. It normally rides on the signed-in user, but
 * `GET /api/current_user` is account-level and deliberately sends no workspace
 * header (see `services/api/base.ts`), so once one account can hold several
 * workspaces `user.role` is the role in the *default* one — wrong for any tab
 * that has moved. `GET /api/workspaces` carries a role per workspace, so the
 * role is read from there, matched on the tenant the tab actually got.
 *
 * Undefined until **both** queries answer and the roles can be matched:
 * callers show their loading state rather than guess a role, since the role is
 * what decides which controls exist. There is deliberately no stopgap from the
 * auth store while the list is in flight — after a switch clears the cache the
 * two queries land independently, and a tenant that resolves first would pair
 * with the *default* workspace's role for a frame, drawing owner controls for
 * a member (or hiding them from an owner) in whichever workspace the tab
 * actually moved to.
 */
export function useWorkspace(): Workspace | undefined {
  const { data: tenant } = useQuery({
    queryKey: WORKSPACE_KEY,
    queryFn: getWorkspace,
    staleTime: 30_000,
  })
  const { data: workspaces } = useWorkspaces()
  if (!tenant) return undefined
  const listed = workspaces?.find((w) => w.id === tenant.id)
  if (!listed) return undefined
  return { ...tenant, role: listed.role }
}

/** Renames the workspace. Owner-gated server-side; a member's PUT is refused. */
export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) =>
      updateWorkspace(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEY }),
  })
}

/**
 * Everyone in the workspace. Keyed without the workspace id: the request is
 * scoped by this tab's `X-Workspace-Id` header, and a switch clears the whole
 * tab cache (`useSwitchWorkspace`) — which is what keeps an unkeyed entry
 * from ever surviving into another workspace.
 */
export function useWorkspaceMembers() {
  // The email, not the id: the id names the default workspace's membership
  // and is wrong in a switched tab — see `listMembers`.
  const callerEmail = useAuthStore((s) => s.user?.email)
  return useQuery({
    queryKey: WORKSPACE_MEMBERS_KEY,
    queryFn: () => listMembers(callerEmail as string),
    enabled: Boolean(callerEmail),
    staleTime: 30_000,
  })
}

/**
 * Outstanding invitations — owner only. A member's request answers 403, so the
 * query is left disabled for them rather than fetching an error the UI would
 * have to hide.
 */
export function useWorkspaceInvitations(enabled: boolean) {
  return useQuery({
    queryKey: WORKSPACE_INVITATIONS_KEY,
    queryFn: listInvitations,
    enabled,
    staleTime: 30_000,
  })
}

/**
 * Role changes refresh the signed-in user too: the caller can be the row that
 * changed (an owner appointing a co-owner and stepping down), and their own
 * role is what gates every control on the page.
 */
export function useUpdateMemberRole() {
  const qc = useQueryClient()
  const callerEmail = useAuthStore((s) => s.user?.email)
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      updateMemberRole(userId, role, callerEmail ?? ''),
    onSuccess: (member) => {
      qc.invalidateQueries({ queryKey: WORKSPACE_MEMBERS_KEY })
      // Demoting yourself changes what the app is allowed to show you, and the
      // role lives on the signed-in user rather than in a query — so the
      // session is re-probed and the page reloaded into the new authority
      // instead of leaving owner-only controls on screen until the next
      // navigation happens to re-run the root guard. Detected off the
      // response's `is_self` (matched by email), not the caller's id — the id
      // names the default workspace's membership, not this one's.
      if (member.is_self) {
        invalidateSession()
        window.location.reload()
      }
    },
  })
}

/**
 * Removes a member from this workspace — their account survives, everything
 * they created *here* does not (see `removeMember` in the service).
 * Invitations are refreshed alongside: the address is free to invite again
 * the moment the membership is gone.
 */
export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKSPACE_MEMBERS_KEY })
      qc.invalidateQueries({ queryKey: WORKSPACE_INVITATIONS_KEY })
    },
  })
}

/**
 * Sends an invitation — and re-sends one. The endpoint is idempotent per email
 * (CON-147 §7.3): a pending invite for the address, live or expired, is
 * replaced with a fresh token, expiry and email, so the row's RESEND is this
 * same mutation and there is no separate resend endpoint.
 */
export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitePayload) => inviteMember(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: WORKSPACE_INVITATIONS_KEY }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: WORKSPACE_INVITATIONS_KEY }),
  })
}

/* ------------------------------------------------------------------------ *
 * Multi-workspace (CON-147): the account's workspaces and moving between them.
 * ------------------------------------------------------------------------ */

/**
 * Every workspace the caller belongs to. Account-level: the request carries no
 * `X-Workspace-Id`, which is what keeps it answerable from a tab whose own
 * workspace has just become unreachable.
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: listWorkspaces,
    staleTime: 30_000,
  })
}

/**
 * The pending "remember as the account's default" write — step 3 of a switch.
 *
 * Module-level, because the race it prevents outlives any one component: rapid
 * switches used to fire one detached `POST …/switch` each, and whichever
 * *response* landed last set the default — an early request completing late
 * would overwrite the newer choice, so the next fresh tab opened in a
 * workspace the user had already left. Only the newest target is worth
 * writing, so a later call replaces the pending one, and at most one request
 * is in flight at a time: a target arriving mid-flight is sent by the next
 * lap of the loop rather than by a parallel request, which is what keeps the
 * responses from ever crossing.
 *
 * Still fire-and-forget from the caller's point of view — nothing awaits it,
 * and failures are swallowed, because the tab's own switch has already
 * happened (see `useSwitchWorkspace`, step 3).
 */
let pendingDefaultId: string | null = null
let defaultWriteRunning = false

function rememberAccountDefault(id: string): void {
  pendingDefaultId = id
  if (defaultWriteRunning) return
  defaultWriteRunning = true
  void (async () => {
    while (pendingDefaultId !== null) {
      const target = pendingDefaultId
      pendingDefaultId = null
      try {
        await switchWorkspace(target)
      } catch {
        // Best-effort by design: remembering the default is a convenience for
        // the *next* tab, and this one has already moved on.
      }
    }
    defaultWriteRunning = false
  })()
}

/**
 * Moves *this tab* to another workspace.
 *
 * Not a session rebind and not a page load. The session identifies the account;
 * which workspace a request acts in is decided per request by the header this
 * tab sends (`lib/activeWorkspace`). So a switch is two local acts and one
 * optional remote one:
 *
 * 1. **Re-pin the tab.** Every request after this one names the new workspace.
 * 2. **Throw away the cache.** Campaigns, posts, assets, accounts and the
 *    allowlist are all workspace-scoped, so every cached entry belongs to the
 *    workspace just left — showing one for even a frame would be showing
 *    another client's content. `clear()` beats targeted invalidation: a missed
 *    key leaks, and the list of scoped keys grows with every feature. It is
 *    scoped to this tab's memory, so the other tabs keep theirs.
 * 3. **Tell the server, best-effort.** `POST …/switch` only sets the account's
 *    *default* — where the next fresh tab or login starts. Nothing about this
 *    tab depends on it, so a failure is swallowed rather than surfaced: the
 *    switch has already happened.
 *
 * Navigating to `/` afterwards is what handles component state, which no cache
 * reset reaches — the previous screen unmounts and its editor buffers go with
 * it.
 */
export function useSwitchWorkspace() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (id: string) => {
      // A debounced edit still waiting in an editor belongs to the workspace
      // being left. Flush it before the re-pin, or its PUT goes out carrying
      // the *new* workspace's header, 404s against tenant scoping, and the
      // user's last keystrokes are dropped with a misdirected error toast.
      // (Same rule as the event stream's reconcile.)
      await flushAllPendingSaves()
      setActiveWorkspaceId(id)
      queryClient.clear()
      // The event stream is a long-lived connection whose workspace was fixed
      // by the header on the request that opened it, so clearing the cache
      // does not reach it — left alone it would keep pushing the previous
      // workspace's events into this tab.
      reconnectEvents()
      // Same argument for the notification stream, plus one of its own: its
      // replay cursor is a `seq` in the log of the workspace being left, so
      // reopening without dropping it would ask the new workspace to replay
      // from a position in another one's. The cleared cache is what drops it.
      reconnectNotifications()
      // Deliberately not awaited before the UI moves, and deliberately not
      // allowed to reject: remembering the default is a convenience for the
      // *next* tab. Coalesced rather than fired directly — see
      // `rememberAccountDefault` for the race that requires it.
      rememberAccountDefault(id)
      await navigate({ to: '/' })
    },
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => createWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  })
}

/**
 * Deletes a workspace (soft, server-side — see `deleteWorkspace`).
 *
 * If it was the one this tab is pinned to, the pin is dropped here rather than
 * left for the 403 recovery to find: the tab has to stop naming a workspace
 * that is gone *before* its next request, and unpinning falls back to the
 * account's default, which is where it belongs. And the teardown is the same
 * as a switch's, for the same reason: every cached entry belongs to the
 * workspace that no longer exists, and invalidating only the list would leave
 * the tenant, members, campaigns — everything scoped — quietly serving the
 * deleted workspace's data while new requests answer for the default. The
 * event and notification streams are rebound too; both connections were
 * opened under the deleted workspace's header. Deleting any other workspace leaves the page alone and
 * just refreshes the list.
 */
export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: (_void, id) => {
      if (getActiveWorkspaceId() === id) {
        setActiveWorkspaceId(null)
        qc.clear()
        reconnectEvents()
        reconnectNotifications()
      } else {
        qc.invalidateQueries({ queryKey: WORKSPACES_KEY })
      }
    },
  })
}
