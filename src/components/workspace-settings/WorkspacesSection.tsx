import { memo, useState } from 'react'
import {
  ArrowsLeftRightIcon,
  CheckCircleIcon,
  PlusIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useSwitchWorkspace, useWorkspaces } from '@/hooks/useWorkspaces'
import { currentTimeIn, utcOffset } from '@/lib/timezones'
import { ROLE_LABELS, type Workspace } from '@/types/workspace'
import { cn } from '@/lib'
import { toast } from '@/stores/toastStore'
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog'

/**
 * Every workspace the user belongs to, and the way between them.
 *
 * The switcher in the sidebar is the fast path; this is the one that shows
 * what each workspace *is* — who else is in it, what time it keeps, what the
 * user is allowed to do there — which is what you need when deciding whether
 * to go there at all.
 */
function WorkspacesSectionComponent() {
  const { data: workspaces, isLoading, isError } = useWorkspaces()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <>
      <SettingsCard
        title="Workspaces"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon />
            <span>New workspace</span>
          </Button>
        }
      >
        {isLoading ? (
          <p className="text-sm text-tertiary-foreground">Loading…</p>
        ) : isError || !workspaces ? (
          <p className="text-sm text-destructive">Failed to load your workspaces.</p>
        ) : (
          <>
            <p className="text-sm text-tertiary-foreground max-w-150">
              Each workspace keeps its own campaigns, content and connected accounts.
              Because a set of social accounts belongs to exactly one workspace, running
              a second LinkedIn page — your own and a client's — means a second
              workspace.
            </p>
            <ul className="flex flex-col divide-y divide-quaternary">
              {workspaces.map((w) => (
                <WorkspaceRow key={w.id} workspace={w} />
              ))}
            </ul>
          </>
        )}
      </SettingsCard>

      <CreateWorkspaceDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const { mutate: switchTo, isPending } = useSwitchWorkspace()
  const { is_active: active } = workspace

  const handleSwitch = () => {
    switchTo(workspace.id, {
      onError: (err) => {
        toast.error('Unable to switch workspace', {
          description: err instanceof Error ? err.message : undefined,
        })
      },
    })
  }

  const zone = workspace.timezone
  const time = currentTimeIn(zone)

  return (
    <li className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 min-w-0">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'text-base font-medium truncate',
              active ? 'text-primary-foreground' : 'text-secondary-foreground',
            )}
          >
            {workspace.name}
          </span>
          {active && (
            <span className="flex items-center gap-1 text-xs text-tertiary-foreground shrink-0">
              <CheckCircleIcon weight="fill" className="size-3.5" />
              Current
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-tertiary-foreground min-w-0">
          <span>{ROLE_LABELS[workspace.role]}</span>
          <span className="flex items-center gap-1">
            <UsersThreeIcon className="size-3.5" />
            {workspace.member_count}
          </span>
          {/* The local time is the quickest way to tell two client workspaces
              apart at a glance, and it's the setting most likely to be wrong. */}
          <span className="truncate">
            {zone.replace(/_/g, ' ')}
            {time && ` · ${time}`}
            {utcOffset(zone) && ` · ${utcOffset(zone)}`}
          </span>
        </div>
      </div>

      {!active && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSwitch}
          loading={isPending}
          disabled={isPending}
          className="shrink-0"
        >
          <ArrowsLeftRightIcon />
          <span>Switch</span>
        </Button>
      )}
    </li>
  )
}

export const WorkspacesSection = memo(WorkspacesSectionComponent)
