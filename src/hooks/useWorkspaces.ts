import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkspace,
  deleteWorkspace,
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
import type {
  CreateWorkspacePayload,
  InvitePayload,
  UpdateWorkspacePayload,
  Workspace,
  WorkspaceRole,
} from '@/types/workspace'

export const WORKSPACES_KEY = ['workspaces'] as const
export const workspaceMembersKey = (id: string) => ['workspaces', id, 'members'] as const
export const workspaceInvitationsKey = (id: string) =>
  ['workspaces', id, 'invitations'] as const

/** Every workspace the caller belongs to. */
export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: listWorkspaces,
    staleTime: 30_000,
  })
}

/**
 * The workspace the session is currently bound to.
 *
 * Derived from the list rather than fetched separately — one request answers
 * both "which am I in" and "which can I switch to", and they can't disagree.
 */
export function useActiveWorkspace(): Workspace | undefined {
  const { data } = useWorkspaces()
  return data?.find((w) => w.is_active) ?? data?.[0]
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

export function useUpdateWorkspace(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => updateWorkspace(id, payload),
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

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceMembersKey(workspaceId ?? ''),
    queryFn: () => listMembers(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  })
}

export function useWorkspaceInvitations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceInvitationsKey(workspaceId ?? ''),
    queryFn: () => listInvitations(workspaceId as string),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  })
}

/**
 * Role changes refresh the workspace list too, because the caller's own role is
 * what gates every control on the page and it can be the row that changed.
 */
export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceMembersKey(workspaceId) })
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY })
    },
  })
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workspaceMembersKey(workspaceId) })
      qc.invalidateQueries({ queryKey: WORKSPACES_KEY })
    },
  })
}

/**
 * Sends an invitation — and re-sends one, since the endpoint is idempotent per
 * email. A "resend" is this same mutation with the row's own email and role,
 * which is why there is no separate hook for it.
 */
export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InvitePayload) => inviteMember(workspaceId, payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceInvitationsKey(workspaceId) }),
  })
}

export function useRevokeInvitation(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(workspaceId, invitationId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceInvitationsKey(workspaceId) }),
  })
}
