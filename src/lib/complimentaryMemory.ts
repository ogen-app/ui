import type { WorkspacePlan } from '@/types/entitlements'

/**
 * Which workspaces this browser has seen with complimentary beta access
 * (CON-402), so the billing gate can say why it appeared.
 *
 * When an operator ends a tester's access the workspace becomes an ordinary
 * gated one: `complimentary: false, billing_required: true`, exactly what a
 * workspace that never paid reads. Nothing on the plan read says it *used to*
 * be free, so the gate's "your complimentary beta access has ended" notice
 * rests on this browser's memory of having seen it so.
 *
 * **`localStorage`, per device, on purpose** — a per-viewer convenience, not a
 * record. A device that never saw the workspace comped shows the gate without
 * the notice, which is still true, merely less kind. If that matters, the fix
 * is a field on the server's plan read, not a wider memory here.
 */

const KEY = 'ogen.complimentarySeen'

function read(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

function write(ids: string[]): void {
  try {
    if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids))
    else localStorage.removeItem(KEY)
  } catch {
    // Blocked storage: the gate shows without its notice.
  }
}

/** Called wherever the plan is read; remembers a workspace while it is comped. */
export function noteComplimentary(
  workspaceId: string | null | undefined,
  plan: WorkspacePlan | undefined,
): void {
  if (!workspaceId || !plan?.billing.complimentary) return
  const ids = read()
  if (!ids.includes(workspaceId)) write([...ids, workspaceId])
}

/** Whether this gated workspace was last seen comped — the notice is owed. */
export function complimentaryEnded(
  workspaceId: string | null | undefined,
  plan: WorkspacePlan | undefined,
): boolean {
  if (!workspaceId || !plan) return false
  if (plan.billing.complimentary || !plan.billing.required) return false
  return read().includes(workspaceId)
}

/** The notice has been shown; it is shown once per workspace. */
export function forgetComplimentary(workspaceId: string): void {
  write(read().filter((id) => id !== workspaceId))
}
