/**
 * Onboarding's steps and the five stages the header names.
 *
 * The flow sets up what a marketer would set up anyway — who the work is for,
 * what Ogen can read about them, the brand that comes out of it, the accounts
 * it posts to — and ends with the first campaign planned. Every step is
 * resumable because everything it writes is the server's (the workspace, the
 * brand read, the brand, the connections, the campaign); the step is derived
 * from those, not remembered.
 */
export const ONBOARDING_STEPS = [
  'you',
  'sources',
  'brand',
  'accounts',
  'campaign',
  'planning',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export type OnboardingStage =
  'you' | 'sources' | 'brand' | 'accounts' | 'campaign'

/** Which stage each step sits in — planning is the campaign's second half. */
export const STAGE_OF: Record<OnboardingStep, OnboardingStage> = {
  you: 'you',
  sources: 'sources',
  brand: 'brand',
  accounts: 'accounts',
  campaign: 'campaign',
  planning: 'campaign',
}

export const ONBOARDING_STAGES: OnboardingStage[] = [
  'you',
  'sources',
  'brand',
  'accounts',
  'campaign',
]

/**
 * Who the workspace is for. It changes the wording only — "your client" or
 * "your business" — never what is asked.
 */
export type OnboardingRole = 'client' | 'own'
