import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { TrashIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useDeleteWorkspace,
  useWorkspace,
  useWorkspaces,
} from '@/hooks/useWorkspaces'
import { ApiError } from '@/services/api/errors'
import { toast } from '@/stores/toastStore'

/**
 * Deleting the current workspace — owner only, and the widest-blast-radius
 * action in the app: campaigns, posts, assets and the workspace's connected
 * social accounts all go with it.
 *
 * The server soft-deletes, but the copy does not offer that as comfort. A
 * retained row is an operational safety net for support, not an undo — there is
 * no self-serve restore, so telling the user it's recoverable would invite the
 * click that the confirmation exists to slow down.
 *
 * Confirmation is by typing the name, not by clicking twice. The user may be
 * holding several similar client workspaces, and "are you sure?" does nothing
 * to catch the case that actually hurts — being sure, about the wrong one.
 *
 * Renders nothing for anyone but the owner, so the page has no disabled
 * control teasing an action that will never become available.
 *
 * Deleting the only workspace an account has would be a way of locking
 * yourself out rather than a feature — the server refuses it with a 409, and
 * the card greys DELETE out first (`isLast`). Deleting your own *account* is a
 * different act and lives on Profile, where it always has.
 */
export function DeleteWorkspaceCard() {
  const { t } = useTranslation()
  const workspace = useWorkspace()
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
        // The tab was pinned to this workspace and `useDeleteWorkspace` has
        // just unpinned it. A full load, not a navigation: the cache is still
        // full of the deleted workspace's content, and the root guard re-seeds
        // the tab from the account's default on the way back in.
        window.location.assign('/')
      },
      onError: (err) => {
        // 409 is the server's own last-workspace guard — the same rule as the
        // warning above, arriving from the other side (another tab may have
        // deleted the workspace this count was drawn from). It reads as a fact
        // about the account, not a failure of the click.
        const only = err instanceof ApiError && err.status === 409
        toast.error(
          only
            ? t('workspaceSettings.dangerZone.onlyWorkspace')
            : t('workspaceSettings.dangerZone.deleteFailed'),
          {
            description: only
              ? t('workspaceSettings.dangerZone.onlyWorkspaceNote')
              : err instanceof Error
                ? err.message
                : undefined,
          },
        )
      },
    })
  }

  return (
    <>
      <SettingsCard title={t('workspaceSettings.dangerZone.title')}>
        <div className="flex flex-col gap-3 items-start">
          <p className="max-w-150 text-sm text-tertiary-foreground">
            {t('workspaceSettings.dangerZone.body')}
          </p>
          {isLast && (
            <p className="max-w-150 text-sm text-warning">
              {t('workspaceSettings.dangerZone.lastWorkspace')}
            </p>
          )}
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={() => setOpen(true)}
            disabled={isLast}
          >
            <TrashIcon />
            {/* Literal caps in every language — see CLAUDE.md on destructive labels. */}
            <span>{t('workspaceSettings.dangerZone.action')}</span>
          </Button>
        </div>
      </SettingsCard>

      <ModalContainer
        isOpen={open}
        onClose={close}
        title={t('workspaceSettings.dangerZone.confirmTitle', { name: workspace.name })}
        size="default"
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
            {/* One sentence, one key: the name sits mid-sentence, so `<Trans>`
                places the <strong> — translations may move it. */}
            <Trans
              i18nKey="workspaceSettings.dangerZone.confirmBody"
              values={{ name: workspace.name }}
              components={{ strong: <strong className="text-primary-foreground" /> }}
            />
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-workspace-name">
              {t('workspaceSettings.dangerZone.confirmLabel')}
            </Label>
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
              {t('workspaceSettings.dangerZone.keep')}
            </Button>
            <Button
              type="submit"
              variant="destructiveInverted"
              disabled={!matches || isPending}
              loading={isPending}
            >
              <span>{t('workspaceSettings.dangerZone.confirm')}</span>
            </Button>
          </div>
        </form>
      </ModalContainer>
    </>
  )
}
