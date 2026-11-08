export const STEPS = [
  'you',
  'sources',
  'reading',
  'brand',
  'accounts',
  'campaign',
  'planning',
  'workspace',
] as const

export type Step = (typeof STEPS)[number]

/** The five stages the rail names, which steps sit in each, and roughly how long each takes. */
export const STAGES: { label: string; minutes: number; steps: Step[] }[] = [
  { label: 'About you', minutes: 1, steps: ['you'] },
  { label: 'What Ogen reads', minutes: 3, steps: ['sources', 'reading'] },
  { label: 'The brand', minutes: 5, steps: ['brand'] },
  { label: 'Accounts', minutes: 2, steps: ['accounts'] },
  { label: 'First campaign', minutes: 5, steps: ['campaign', 'planning'] },
]
