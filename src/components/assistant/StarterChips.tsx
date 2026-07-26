/**
 * The campaign assistant's capabilities, one starter per shipped tool. Nine
 * tools are otherwise undiscoverable from an empty composer, so the empty
 * thread lists them; a starter only *prefills* the box, never sends, because
 * every one of these except the reviews writes to the campaign.
 */
const CAMPAIGN_STARTERS = [
  {
    group: 'Plan & create',
    items: [
      {
        label: 'Generate a content plan',
        text: 'Generate a content plan for this campaign.',
      },
      {
        label: 'Add a few posts',
        text: 'Add a few Threads posts in the current phase for the upcoming weeks.',
      },
    ],
  },
  {
    group: 'Brief',
    items: [
      {
        label: 'Improve the brief',
        text: 'Improve the campaign brief — make the tone more technical and benchmark-driven.',
      },
      {
        label: 'Review consistency',
        text: 'Is the brief consistent? Review it and suggest improvements.',
      },
    ],
  },
  {
    group: 'Schedule',
    items: [
      {
        label: 'Move the end date',
        text: 'Move the campaign end to the beginning of next month.',
      },
      {
        label: 'Redistribute drafts',
        text: 'Redistribute the drafts and unpublished posts across the campaign timeline.',
      },
    ],
  },
  {
    group: 'Review & insight',
    items: [
      {
        label: 'Quick overview',
        text: 'Give me a quick overview of this campaign and how the content is distributed.',
      },
      {
        label: 'Check posts vs brief',
        text: 'Do the posts follow the brief? Flag any that drift.',
      },
    ],
  },
]

export function StarterChips({
  onPick,
  disabled = false,
}: {
  onPick: (text: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      {CAMPAIGN_STARTERS.map((section) => (
        <div key={section.group} className="flex flex-col gap-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-quaternary-foreground">
            {section.group}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {section.items.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={disabled}
                onClick={() => onPick(item.text)}
                title={item.text}
                className="rounded-full border border-border px-3 py-1 text-xs text-secondary-foreground transition-colors cursor-pointer hover:border-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
