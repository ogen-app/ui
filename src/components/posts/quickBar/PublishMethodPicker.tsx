import { CaretDownIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  PUBLISH_METHOD_HINTS,
  PUBLISH_METHOD_LABELS,
  type PublishMethod,
} from '@/lib/postStatusMachine'
import { cn } from '@/lib'
import { QuickBarTrigger } from './parts'

const PUBLISH_METHODS: PublishMethod[] = ['auto', 'manual']

/**
 * Auto-publish vs manual. This is the one scheduling decision the status
 * machine can't hold — there is no field for it, the choice *is* which
 * status SCHEDULE moves the post into — so it's made here, in the open,
 * rather than by picking between two identically-named menu entries.
 */
export function PublishMethodPicker({
  method,
  onChange,
  platformName,
  hasAccount,
  autoAllowed,
}: {
  method: PublishMethod
  onChange: (method: PublishMethod) => void
  platformName: string | null
  hasAccount: boolean
  /** The workspace allowlists this platform for auto-publishing. */
  autoAllowed: boolean
}) {
  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change how this post publishes">
        <span>{PUBLISH_METHOD_LABELS[method]}</span>
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start" className="max-w-[300px]">
        {PUBLISH_METHODS.map((m) => {
          // Auto is not offered where the workspace hasn't allowed it: the
          // schedule endpoint would route the post to manual regardless, so
          // presenting it as a choice would be a promise the server breaks.
          const blocked = m === 'auto' && !autoAllowed
          return (
            <DropdownMenuItem
              key={m}
              disabled={blocked}
              className="flex-col items-start gap-0.5"
              onSelect={() => {
                if (blocked) return
                onChange(m)
              }}
            >
              <span className={cn(m === method && 'font-medium')}>
                {PUBLISH_METHOD_LABELS[m]}
              </span>
              <span className="text-xs text-tertiary-foreground">
                {PUBLISH_METHOD_HINTS[m]}
              </span>
              {blocked && (
                <span className="text-xs text-tertiary-foreground">
                  Not allowed for {platformName ?? 'this platform'} in this
                  workspace — change it in Workspace Settings.
                </span>
              )}
              {/* Auto needs a connected publisher; without one the server
                  routes it to manual anyway, so say that up front. */}
              {m === 'auto' && !blocked && !hasAccount && (
                <span className="text-xs text-warning">
                  No {platformName ?? 'publishing'} account is connected — this
                  will fall back to a reminder.
                </span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
