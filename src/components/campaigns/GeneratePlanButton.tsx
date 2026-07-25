import { MagicWandIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useGenerateContentPlan } from '@/hooks/useContentPlan'
import { missingPlanRequirements } from '@/lib/contentPlanRequirements'
import { cn } from '@/lib'
import type { Campaign } from '@/types/campaigns'

function statusText(state: ReturnType<typeof useGenerateContentPlan>['state']): {
  text: string
  isError: boolean
  detail?: string
} | null {
  switch (state.status) {
    case 'running':
      if (state.postCount > 0)
        return { text: `${state.postCount} draft${state.postCount === 1 ? '' : 's'} created…`, isError: false }
      return { text: state.step ? `${state.step}…` : 'Generating…', isError: false }
    case 'done': {
      const base = `${state.postCount} draft${state.postCount === 1 ? '' : 's'} generated`
      if (state.warnings.length === 0) return { text: base, isError: false }
      return {
        text: `${base}, ${state.warnings.length} skipped`,
        isError: false,
        detail: state.warnings.join('\n'),
      }
    }
    case 'error':
      return { text: state.message, isError: true, detail: state.message }
    default:
      return null
  }
}

/**
 * Triggers AI draft content-plan generation (CON-39) and reports streaming
 * progress inline. Disabled — with a tooltip listing what's missing — until
 * the campaign brief satisfies the server's generation preconditions.
 */
export function GeneratePlanButton({ campaign }: { campaign: Campaign }) {
  const { state, generate } = useGenerateContentPlan(campaign.id)
  const missing = missingPlanRequirements(campaign)
  const running = state.status === 'running'
  const status = statusText(state)

  const button = (
    <Button
      variant="defaultInverted"
      onClick={generate}
      disabled={missing.length > 0}
      loading={running}
    >
      <MagicWandIcon className="size-4" />
      <span>GENERATE PLAN</span>
    </Button>
  )

  return (
    <div className="flex items-center gap-3">
      {status && (
        <span
          title={status.detail}
          className={cn(
            'hidden sm:block text-xs max-w-56 truncate',
            status.isError ? 'text-destructive' : 'text-tertiary-foreground',
          )}
        >
          {status.text}
        </span>
      )}
      {missing.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* span so the tooltip works over the disabled button */}
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-72">
            To generate a plan, the campaign still needs: {missing.join(', ')}.
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  )
}
