import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useWorkspacePlan } from '@/hooks/useEntitlements'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { noteComplimentary } from '@/lib/complimentaryMemory'

/**
 * The billing gate for a tab that is already open (CON-402).
 *
 * The root guard reads `billing_required` on navigation, which is before any
 * screen asks — but a gate that closes *while* somebody works is news that
 * arrives on the stream: an operator ends a tester's complimentary access,
 * `entity:billing` and `entity:entitlements` invalidate the plan, and the
 * refetch reads `billing_required: true`. Nothing navigates on that by itself,
 * and the 402 fallback only fires once the person happens to make a request.
 * This turns the refetch into the redirect, for owners and members alike —
 * `/plans` tells each which half of the gate they are on.
 *
 * It also remembers a comped workspace while it is one, so the gate can say
 * why it appeared (`lib/complimentaryMemory`).
 *
 * Mounted once, in `_authenticated`.
 */
export function useBillingGateWatch(): void {
  const navigate = useNavigate()
  const { data: plan } = useWorkspacePlan()
  const workspaceId = useWorkspace()?.id
  const required = plan?.billing.required === true

  useEffect(() => {
    noteComplimentary(workspaceId, plan)
  }, [workspaceId, plan])

  useEffect(() => {
    if (required) void navigate({ to: '/plans', replace: true })
  }, [required, navigate])
}
