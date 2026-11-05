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

/** The five stages the progress bar names, and which steps sit in each. */
export const STAGES: { label: string; steps: Step[] }[] = [
  { label: 'About you', steps: ['you'] },
  { label: 'What Ogen reads', steps: ['sources', 'reading'] },
  { label: 'The brand', steps: ['brand'] },
  { label: 'Accounts', steps: ['accounts'] },
  { label: 'First campaign', steps: ['campaign', 'planning'] },
]
