import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { useCreateWorkspace, useSwitchWorkspace } from '@/hooks/useWorkspaces'
import { WorkspaceSwitchOverlay } from './WorkspaceSwitchOverlay'
import { toast } from '@/stores/toastStore'

type Props = {
  isOpen: boolean
  onClose: () => void
}

/**
 * Creates a workspace and offers to move into it.
 *
 * Switching is a separate, explicit step rather than an automatic follow-on:
 * creating a workspace for a client you'll set up next week shouldn't tear
 * down the one you're working in.
 */
export function CreateWorkspaceDialog({ isOpen, onClose }: Props) {
  const [name, setName] = useState('')
  const { mutate: create, isPending } = useCreateWorkspace()
  const { mutate: switchTo, isPending: switching } = useSwitchWorkspace()

  const trimmed = name.trim()
  const busy = isPending || switching

  const submit = (thenSwitch: boolean) => {
    create(
      { name: trimmed },
      {
        onSuccess: (workspace) => {
          if (thenSwitch) {
            // The reload lives in `useSwitchWorkspace`; nothing after this runs.
            switchTo(workspace.id)
            return
          }
          toast.success(`${workspace.name} created`, {
            description: 'Switch to it from the workspace menu when you need it.',
          })
          setName('')
          onClose()
        },
        onError: (err) => {
          toast.error('Unable to create the workspace', {
            description: err instanceof Error ? err.message : undefined,
          })
        },
      },
    )
  }

  return (
    <>
      {/* Create-and-switch ends in the same reload as any other switch, so it
          gets the same cover — over the dialog, which is why the overlay
          portals to the body. */}
      <WorkspaceSwitchOverlay active={switching} />
      <ModalContainer
        isOpen={isOpen}
        onClose={busy ? () => {} : onClose}
        title="New workspace"
        size="default"
        closeOnBackdropClick={!busy}
        closeOnEscape={!busy}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (trimmed) submit(true)
          }}
        >
          <p className="text-sm text-tertiary-foreground">
            A workspace has its own campaigns, content and connected accounts — and
            its own set of social accounts, so a second workspace is how you run a
            second LinkedIn or Facebook page alongside this one.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northwind Client"
              autoFocus
              disabled={busy}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={!trimmed || busy}
            >
              Create only
            </Button>
            <Button type="submit" disabled={!trimmed || busy} loading={busy}>
              Create and switch
            </Button>
          </div>
        </form>
      </ModalContainer>
    </>
  )
}
