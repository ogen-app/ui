import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { useCreateWorkspace, useSwitchWorkspace } from '@/hooks/useWorkspaces'
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
  const { t } = useTranslation()
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
            // Re-pins this tab and navigates to the new workspace's index —
            // see `useSwitchWorkspace`. The dialog goes with the screen.
            switchTo(workspace.id)
            return
          }
          toast.success(
            t('workspaces.createDialog.created', { name: workspace.name }),
            {
              description: t('workspaces.createDialog.createdNote'),
            },
          )
          setName('')
          onClose()
        },
        onError: (err) => {
          toast.error(t('workspaces.createDialog.createFailed'), {
            description: err instanceof Error ? err.message : undefined,
          })
        },
      },
    )
  }

  return (
    <>
      <ModalContainer
        isOpen={isOpen}
        onClose={busy ? () => {} : onClose}
        title={t('workspaces.createDialog.title')}
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
            {t('workspaces.createDialog.body')}
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name">
              {t('workspaces.createDialog.nameLabel')}
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workspaces.createDialog.namePlaceholder')}
              autoFocus
              disabled={busy}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
            >
              {t('workspaces.createDialog.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={!trimmed || busy}
            >
              {t('workspaces.createDialog.createOnly')}
            </Button>
            <Button type="submit" disabled={!trimmed || busy} loading={busy}>
              {t('workspaces.createDialog.createAndSwitch')}
            </Button>
          </div>
        </form>
      </ModalContainer>
    </>
  )
}
