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
import { queryClient } from '@/lib/queryClient'
import { getActiveWorkspaceId, setActiveWorkspaceId } from '@/lib/activeWorkspace'
import { useFeatureFlag } from '@/config/featureFlags'
import { reconnectEvents } from '@/stores/eventStreamStore'
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
/** Multi-workspace only (CON-147, flagged) — the list of workspaces to choose between. */
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
 * that has moved. `GET /api/workspaces` carries a role per workspace, so with
 * the flag on the role is read from there and matched on the tenant the tab
 * actually got. The auth store stays the answer with the flag off, where an
 * account has exactly one workspace and the two can't disagree.
 *
 * Undefined until the tenant answers: callers show their loading state rather
 * than guess a role, since the role is what decides which controls exist.
 */
export function useWorkspace(): Workspace | undefined {
  const user = useAuthStore((s) => s.user)
  const multi = useFeatureFlag('multi-workspace')
  const { data: tenant } = useQuery({
    queryKey: WORKSPACE_KEY,
    queryFn: getWorkspace,
    staleTime: 30_000,
  })
  const { data: workspaces } = useWorkspaces({ enabled: multi })
  if (!tenant) return undefined
  const listed = workspaces?.find((w) => w.id === tenant.id)
  return { ...tenant, role: listed?.role ?? user?.role ?? 'member' }
}

/** Renames the workspace. Owner-gated server-side; a member's PUT is refused. */
export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => updateWorkspace(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEY }),
  })
}

/**
 * Everyone in the workspace. Keyed without the workspace id: a session is
 * bound to one workspace, and the server answers for that one — an id in the
 * key would suggest a choice the request doesn't have.
 */
export function useWorkspaceMembers() {
  const callerId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: WORKSPACE_MEMBERS_KEY,
    queryFn: () => listMembers(callerId as string),
    enabled: Boolean(callerId),
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
  const callerId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      updateMemberRole(userId, role, callerId ?? ''),
    onSuccess: (_member, { userId }) => {
      qc.invalidateQueries({ queryKey: WORKSPACE_MEMBERS_KEY })
      // Demoting yourself changes what the app is allowed to show you, and the
      // role lives on the signed-in user rather than in a query — so the
      // session is re-probed and the page reloaded into the new authority
      // instead of leaving owner-only controls on screen until the next
      // navigation happens to re-run the root guard.
      if (userId === callerId) {
        invalidateSession()
        window.location.reload()
      }
    },
  })
}

/**
 * Removes a member — which deletes their account and everything they created
 * (see `removeMember` in the service). Invitations are refreshed alongside: the
 * address is free to invite again the moment the account is gone.
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
 * Sends an invitation. Not a resend — the endpoint refuses an address that
 * already has a live one (409) — so the row's own re-invite is only offered
 * once the invitation has expired, which is the case the server replaces.
 */
export function useInviteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitePayload) => inviteMember(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_INVITATIONS_KEY }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_INVITATIONS_KEY }),
  })
}

/* ------------------------------------------------------------------------ *
 * Multi-workspace (CON-147), behind the `multi-workspace` flag. Nothing
 * outside the flag may call these.
 * ------------------------------------------------------------------------ */

/**
 * Every workspace the caller belongs to. Account-level: the request carries no
 * `X-Workspace-Id`, which is what keeps it answerable from a tab whose own
 * workspace has just become unreachable.
 *
 * Takes `enabled` because a component rendering nothing behind the flag must
 * not fire the request anyway.
 */
export function useWorkspaces({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: listWorkspaces,
    enabled,
    staleTime: 30_000,
  })
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
      setActiveWorkspaceId(id)
      queryClient.clear()
      // The event stream is a long-lived connection whose workspace was fixed
      // by the header on the request that opened it, so clearing the cache
      // does not reach it — left alone it would keep pushing the previous
      // workspace's events into this tab.
      reconnectEvents()
      // Deliberately not awaited before the UI moves, and deliberately not
      // allowed to reject: remembering the default is a convenience for the
      // *next* tab.
      void switchWorkspace(id).catch(() => {})
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
 * account's default, which is where it belongs. Deleting any other workspace
 * leaves the page alone.
 */
export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: (_void, id) => {
      if (getActiveWorkspaceId() === id) setActiveWorkspaceId(null)
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY })
    },
  })
}
