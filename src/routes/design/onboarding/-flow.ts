export const STEPS = [
  'start',
  'reading',
  'review',
  'channels',
  'writing',
  'workspace',
] as const

export type Step = (typeof STEPS)[number]
