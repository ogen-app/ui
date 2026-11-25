import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  putOnboarding,
  setupOf,
  setupToWire,
  type OnboardingState,
} from '@/services/api/onboarding'
import { getWorkspace, listWorkspaces } from '@/services/api/workspaces'
import type { Tenant, WireSetup } from '@/types/tenant'
import { WORKSPACE_KEY, WORKSPACES_KEY } from './useWorkspaces'

/**
 * Setup's state is the workspace's, so it is read off the workspace's own
 * query — the one `useWorkspace` reads, with the same key and freshness — and
 * a save writes it back there.
 */
const workspaceQuery = {
  queryKey: WORKSPACE_KEY,
  queryFn: getWorkspace,
  staleTime: 30_000,
}

export function useOnboarding() {
  return useQuery({ ...workspaceQuery, select: setupOf })
}

/**
 * Whether this tab's workspace owes its setup **to the person reading**: it is
 * `pending`, and they own it. A member is never sent to setup — the write is
 * an owner's — and a workspace with no setup never owed it. Read by the root
 * guard, off the shared cache.
 */
export async function owesSetup(qc: QueryClient): Promise<boolean> {
  const [tenant, workspaces] = await Promise.all([
    qc.fetchQuery(workspaceQuery),
    qc.fetchQuery({
      queryKey: WORKSPACES_KEY,
      queryFn: listWorkspaces,
      staleTime: 30_000,
    }),
  ])
  const role = workspaces.find((w) => w.id === tenant.id)?.role
  return setupOf(tenant)?.status === 'pending' && role === 'owner'
}

const withSetup = (setup: WireSetup) => (tenant: Tenant | undefined) =>
  tenant && { ...tenant, setup }

/**
 * Saves where setup stands. The cache takes the new value at once, so the
 * guard's next read agrees with the screen even before the write lands.
 *
 * One at a time, in the order they were made (`scope`): each step saves
 * without waiting for the last, and an older answer landing after a newer one
 * would put the cache back a step. No toast — this is a resume point written
 * behind every step, and a failed one costs a reload its place, nothing more.
 */
export function useSaveOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    scope: { id: 'onboarding-setup' },
    meta: { errorToast: false },
    mutationFn: (state: OnboardingState) => putOnboarding(state),
    onMutate: (state) => {
      const current = qc.getQueryData<Tenant>(WORKSPACE_KEY)?.setup
      qc.setQueryData<Tenant>(
        WORKSPACE_KEY,
        withSetup({
          finishedBy: null,
          finishedAt: null,
          ...current,
          ...setupToWire(state),
          updatedAt: new Date().toISOString(),
        }),
      )
    },
    onSuccess: (setup) =>
      qc.setQueryData<Tenant>(WORKSPACE_KEY, withSetup(setup)),
  })
}
