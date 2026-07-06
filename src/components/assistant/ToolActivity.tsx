import { CheckIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import type { AssistantToolActivity } from '@/types/assistant'

const TOOL_LABELS: Record<string, string> = {
  listAssets: 'Listing assets',
  getAssetChunks: 'Reading asset',
  searchAssetChunks: 'Searching assets',
  getCurrentContent: 'Reading current draft',
  clonePost: 'Creating clone',
  restoreVersion: 'Restoring version',
  schedulePost: 'Scheduling post',
}

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name
}

/** Renders the model's tool calls as muted activity rows ("Reading asset…"). */
export function ToolActivity({ tools }: { tools: AssistantToolActivity[] }) {
  return (
    <div className="flex flex-col gap-1">
      {tools.map((tool) => (
        <div
          key={tool.ref}
          className="flex items-center gap-2 text-xs text-secondary-foreground"
        >
          {!tool.done ? (
            <Spinner className="w-3" />
          ) : tool.ok ? (
            <CheckIcon className="size-3.5 text-tertiary-foreground" />
          ) : (
            <WarningCircleIcon className="size-3.5 text-destructive" />
          )}
          <span>{toolLabel(tool.name)}</span>
        </div>
      ))}
    </div>
  )
}
