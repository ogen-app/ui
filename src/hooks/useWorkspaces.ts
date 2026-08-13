import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
 * The workspace the session is bound to, with the caller's role in it.
 *
 * Two sources, joined here: the tenant is a query so a rename refreshes every
 * screen showing the name, and the role rides on the signed-in user, which is
 * where the server keeps it. Undefined until the tenant answers — callers show
 * their loading state rather than guessing a role, since the role is what
 * decides which controls exist.
 */
export function useWorkspace(): Workspace | undefined {
  const user = useAuthStore((s) => s.user)
  const { data: tenant } = useQuery({
    queryKey: WORKSPACE_KEY,
    queryFn: getWorkspace,
    staleTime: 30_000,
  })
  if (!tenant) return undefined
  return { ...tenant, role: user?.role ?? 'member' }
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
 * Multi-workspace (CON-147). No API — stub-served, and reachable only behind
 * the `multi-workspace` flag. Nothing outside the flag may call these.
 * ------------------------------------------------------------------------ */

/**
 * Every workspace the caller belongs to.
 *
 * Takes `enabled` because the route it calls only answers behind the stub: with
 * the flag off the real API 404s, and a component that renders nothing must not
 * fire the request anyway.
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
 * Switches workspace, then throws away everything the app knows.
 *
 * This is deliberately blunt. Campaigns, posts, assets, platform accounts and
 * the allowlist are all tenant-scoped, so after the session is rebound every
 * cached entry belongs to the workspace the user just left — showing any of it
 * for even one frame would be showing another client's content. `clear()`
 * beats targeted invalidation here: a key that is missed leaks, and the list
 * of tenant-scoped keys grows with every feature.
 *
 * The full page reload that follows is the same argument applied to component
 * state, which no cache reset can reach.
 */
export function useSwitchWorkspace() {
  return useMutation({
    mutationFn: async (id: string) => {
      const started = Date.now()
      await switchWorkspace(id)

      // A switch that resolves in 40ms and then blanks the screen for a reload
      // reads as a glitch. Held to a floor so the cover, the word "Switching"
      // and the reload are one deliberate movement instead of three flickers —
      // see `WorkspaceSwitchOverlay`, whose fade this floor is measured
      // against.
      const elapsed = Date.now() - started
      if (elapsed < MIN_SWITCH_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SWITCH_MS - elapsed))
      }

      queryClient.clear()
      invalidateSession()
      window.location.assign('/')

      // Deliberately never resolves. `assign` only *schedules* the navigation,
      // so a resolved mutation would drop `isPending` — and with it the
      // overlay — for the few frames before the document is replaced, showing
      // the old workspace on the way out. A rejection still settles normally,
      // which is what lets a failed switch put the page back.
      return new Promise<void>(() => {})
    },
  })
}

/**
 * The floor on a switch, from request to reload: 500ms of it is the overlay's
 * fade (300ms, after a 200ms delay on the spinner), leaving a full second of
 * "Switching" on screen.
 */
const MIN_SWITCH_MS = 1500

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => createWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  })
}

/**
 * Deletes a workspace. If it was the active one the session has nothing to be
 * bound to, so the caller reloads into whatever the server picks next —
 * handled by the dialog rather than here, since deleting a *non-active*
 * workspace shouldn't disturb the page.
 */
export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACES_KEY }),
  })
}
