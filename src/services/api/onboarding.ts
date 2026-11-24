/**
 * Whether this workspace still owes its setup, and how far it got — the
 * workspace's own `setup` (CON-513), read off `GET /api/tenants/current` and
 * written with `PUT /api/tenants/current/setup`.
 *
 * **The workspace's, not a person's**: what setup produces — the brand, the
 * accounts — belongs to the workspace, so a teammate invited later lands in a
 * workspace that is already set up and is never sent through it. Only an
 * owner may write it (a member gets 403), which is why only owners are sent
 * to setup at all.
 *
 * `null` means the workspace predates setup: it is never sent here. The server
 * writes `pending` itself when a workspace is made — at signup and from the
 * switcher — and stamps who finished or skipped it, and when.
 */
import {
  ONBOARDING_STEPS,
  type OnboardingRole,
  type OnboardingStep,
} from '@/components/onboarding/flow'
import type { Tenant, WireSetup } from '@/types/tenant'
import { apiJson } from './http'

export type OnboardingStatus = WireSetup['status']

export type OnboardingState = {
  status: OnboardingStatus
  /** The step to open on — where the person was when they left. */
  step: OnboardingStep
  /** The furthest step reached; the header lets them go back that far. */
  reached: OnboardingStep
  role: OnboardingRole | null
  /** The brand read setup started, so a reload finds it again. */
  runId: string | null
}

const isStep = (v: unknown): v is OnboardingStep =>
  ONBOARDING_STEPS.includes(v as OnboardingStep)

/**
 * The server keeps whatever step names the client sends, so a name this
 * build doesn't have (one a later build wrote) opens on the first step.
 */
function fromWire(setup: WireSetup): OnboardingState {
  const step = isStep(setup.step) ? setup.step : 'you'
  return {
    status: setup.status,
    step,
    reached: isStep(setup.reached) ? setup.reached : step,
    role: setup.role === '' ? null : setup.role,
    runId: setup.runId,
  }
}

/** The workspace's setup, `null` when it was never owed. */
export function setupOf(tenant: Tenant): OnboardingState | null {
  return tenant.setup ? fromWire(tenant.setup) : null
}

/** The write's body, as the server takes it. */
export function setupToWire(
  state: OnboardingState,
): Pick<WireSetup, 'status' | 'step' | 'reached' | 'role' | 'runId'> {
  return { ...state, role: state.role ?? '' }
}

/** Owners only: 403 for a member, 422 `invalid_setup` naming a bad field. */
export async function putOnboarding(
  state: OnboardingState,
): Promise<WireSetup> {
  return apiJson<WireSetup>(
    '/api/tenants/current/setup',
    'Unable to save where setup is',
    { method: 'PUT', body: setupToWire(state) },
  )
}

/** Setup from the start — the `/flags` reset. */
export function startOnboarding(): Promise<WireSetup> {
  return putOnboarding({
    status: 'pending',
    step: 'you',
    reached: 'you',
    role: null,
    runId: null,
  })
}
