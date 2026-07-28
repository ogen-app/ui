import { useState } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useActiveWorkspace,
  useDeleteWorkspace,
  useWorkspaces,
} from '@/hooks/useWorkspaces'
import { toast } from '@/stores/toastStore'

/**
 * Deleting the current workspace — owner only, and the widest-blast-radius
 * action in the app: campaigns, posts, assets and the workspace's connected
 * social accounts all go with it.
 *
 * Confirmation is by typing the name, not by clicking twice. The user may be
 * holding several similar client workspaces, and "are you sure?" does nothing
 * to catch the case that actually hurts — being sure, about the wrong one.
 *
 * Renders nothing for anyone but the owner, so the page has no disabled
 * control teasing an action that will never become available.
 */
export function DeleteWorkspaceCard() {
  const workspace = useActiveWorkspace()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const { mutate: remove, isPending } = useDeleteWorkspace()
  const { data: workspaces } = useWorkspaces()

  const isLast = (workspaces?.length ?? 1) <= 1
  const matches = typed.trim() === workspace?.name

  const close = () => {
    if (isPending) return
    setTyped('')
    setOpen(false)
  }

  if (!workspace || workspace.role !== 'owner') return null

  const handleDelete = () => {
    remove(workspace.id, {
      onSuccess: () => {
        // This was the active workspace, so the session has nothing left to be
        // bound to; a reload lands on whatever the server picks next.
        window.location.assign('/')
      },
      onError: (err) => {
        toast.error('Unable to delete the workspace', {
          description: err instanceof Error ? err.message : undefined,
        })
      },
    })
  }

  return (
    <>
      <SettingsCard title="Danger Zone">
        <div className="flex flex-col gap-3 items-start">
          <p className="max-w-150 text-sm text-tertiary-foreground">
            Deleting this workspace removes its campaigns, posts, assets and connected
            social accounts, and every member loses access. Already-published posts stay
            live on the social networks. This cannot be undone.
          </p>
          {isLast && (
            <p className="max-w-150 text-sm text-warning">
              This is your only workspace. Deleting it leaves you with nowhere to work —
              create another one first.
            </p>
          )}
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={() => setOpen(true)}
            disabled={isLast}
          >
            <TrashIcon />
            {/* Literal caps, not `uppercase` — see CLAUDE.md on destructive labels. */}
            <span>DELETE WORKSPACE</span>
          </Button>
        </div>
      </SettingsCard>

      <ModalContainer
        isOpen={open}
        onClose={close}
        title={`Delete ${workspace.name}?`}
        size="small"
        closeOnBackdropClick={!isPending}
        closeOnEscape={!isPending}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (matches) handleDelete()
          }}
        >
          <p className="text-sm text-secondary-foreground">
            Everything in this workspace is deleted, for every member. Type{' '}
            <strong className="text-primary-foreground">{workspace.name}</strong> to
            confirm.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-workspace-name">Workspace name</Label>
            <Input
              id="confirm-workspace-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={workspace.name}
              autoFocus
              disabled={isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
              Keep workspace
            </Button>
            <Button
              type="submit"
              variant="destructiveInverted"
              disabled={!matches || isPending}
              loading={isPending}
            >
              <span>DELETE WORKSPACE</span>
            </Button>
          </div>
        </form>
      </ModalContainer>
    </>
  )
}
