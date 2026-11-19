/**
 * Onboarding's steps and the five stages the header names.
 *
 * The flow sets up what a marketer would set up anyway — who the work is for,
 * what Ogen can read about them, the brand that comes out of it, the accounts
 * it posts to — and then lets go. The first campaign is not a step: setup
 * ends on the Campaigns list's empty state, and the campaign is made there
 * through the same dialog as every later one, so nobody learns a second way
 * to do it. Every step is resumable because everything it writes is the
 * server's (the workspace, the brand read, the brand, the connections); the
 * step is derived from those, not remembered.
 */
export const ONBOARDING_STEPS = ['you', 'sources', 'brand', 'accounts'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/** The header's stages — one per step since the campaign left the flow. */
export type OnboardingStage = OnboardingStep

export const STAGE_OF: Record<OnboardingStep, OnboardingStage> = {
  you: 'you',
  sources: 'sources',
  brand: 'brand',
  accounts: 'accounts',
}

export const ONBOARDING_STAGES: OnboardingStage[] = [...ONBOARDING_STEPS]

/**
 * Who the workspace is for. It changes the wording only — "your client" or
 * "your business" — never what is asked.
 */
export type OnboardingRole = 'client' | 'own'
