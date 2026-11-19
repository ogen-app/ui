/**
 * Whether this workspace still owes its setup, and how far it got.
 *
 * The API has no onboarding state of its own, so this is one row in the
 * workspace's settings (`/api/settings`, key `onboarding`). **The workspace's,
 * not a person's**: what setup produces — the brand, the accounts — belongs to
 * the workspace, so a teammate invited later lands in a workspace that is
 * already set up and is never sent through it. Nothing here is sensitive.
 *
 * No row means the workspace predates setup, or was made before the flag was
 * on: it is never sent here. Signup writes `pending`; finishing writes `done`,
 * skipping `skipped`. The flag's comment says what the server should replace
 * this with.
 */
import {
  ONBOARDING_STEPS,
  type OnboardingRole,
  type OnboardingStep,
} from '@/components/onboarding/flow'
import { getSetting, putSetting } from './settings'

export const ONBOARDING_SETTING = 'onboarding'

export type OnboardingStatus = 'pending' | 'done' | 'skipped'

export type OnboardingState = {
  status: OnboardingStatus
  /** The step to open on — where the person was when they left. */
  step: OnboardingStep
  /** The furthest step reached; the header lets them go back that far. */
  reached: OnboardingStep
  role: OnboardingRole | null
  /** The brand read setup started, so a reload finds it again. */
  runId: string | null
  updatedAt: string
}

const STATUSES: OnboardingStatus[] = ['pending', 'done', 'skipped']

const isStep = (v: unknown): v is OnboardingStep =>
  ONBOARDING_STEPS.includes(v as OnboardingStep)

/** A row anyone in the workspace can write, so it is read defensively. */
function parse(raw: string): OnboardingState | null {
  let v: Record<string, unknown>
  try {
    v = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  if (!v || typeof v !== 'object') return null
  if (!STATUSES.includes(v.status as OnboardingStatus)) return null
  const step = isStep(v.step) ? v.step : 'you'
  return {
    status: v.status as OnboardingStatus,
    step,
    reached: isStep(v.reached) ? v.reached : step,
    role: v.role === 'client' || v.role === 'own' ? v.role : null,
    runId: typeof v.runId === 'string' ? v.runId : null,
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : '',
  }
}

/** `null` when setup was never owed here. */
export async function getOnboarding(): Promise<OnboardingState | null> {
  const raw = await getSetting(ONBOARDING_SETTING)
  return raw === null ? null : parse(raw)
}

export function putOnboarding(
  state: Omit<OnboardingState, 'updatedAt'>,
): Promise<OnboardingState> {
  const row = { ...state, updatedAt: new Date().toISOString() }
  return putSetting(ONBOARDING_SETTING, JSON.stringify(row)).then(() => row)
}

/** Setup from the start — written at signup, and by the `/flags` reset. */
export function startOnboarding(): Promise<OnboardingState> {
  return putOnboarding({
    status: 'pending',
    step: 'you',
    reached: 'you',
    role: null,
    runId: null,
  })
}
