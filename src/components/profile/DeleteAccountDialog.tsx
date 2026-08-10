import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { useDeleteAccount } from '@/hooks/useAuth'
import type { User } from '@/types/user'

type Props = {
  user: User
  isOpen: boolean
  onClose: () => void
}

/**
 * Deleting your own account.
 *
 * The confirmation asks the user to type their email rather than offering a
 * plain confirm button, because the blast radius is much larger than "the
 * account": `users.id` cascades into campaigns, posts, assets, tags and post
 * attachments through `created_by`, so everything this person made is
 * destroyed with them — including out from under their colleagues in a shared
 * workspace. Typing the address is the only step that makes that deliberate.
 *
 * The copy states the consequences instead of gesturing at them. "This cannot
 * be undone" is true of deleting a draft too; it doesn't tell anyone that the
 * campaigns their team is working from are about to disappear.
 */
export function DeleteAccountDialog({ user, isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutate: deleteAccount, isPending, error, reset } = useDeleteAccount()
  const [typed, setTyped] = useState('')

  // Reopening after a cancel or a failure must not present a pre-armed
  // confirm button, or a stale error about the previous attempt.
  useEffect(() => {
    if (isOpen) {
      setTyped('')
      reset()
    }
  }, [isOpen, reset])

  const confirmed = typed.trim().toLowerCase() === user.email.toLowerCase()

  const handleDelete = () => {
    if (!confirmed) return
    deleteAccount(user.id, {
      // The session died with the account, so there is nothing to log out of;
      // the local teardown already ran in the hook. Login is the only screen
      // left that will render for them.
      onSuccess: () => void navigate({ to: '/auth/login' }),
    })
  }

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={t('profile.delete.title')}
      size="small"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm text-secondary-foreground">
          <p>
            <Trans
              i18nKey="profile.delete.body"
              values={{ email: user.email }}
              components={{ strong: <strong /> }}
            />
          </p>
          <p>
            <Trans
              i18nKey="profile.delete.shared"
              values={{
                workspace: user.tenant?.name ?? t('profile.delete.thisWorkspace'),
              }}
              components={{ strong: <strong /> }}
            />
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmEmail">
            <Trans
              i18nKey="profile.delete.confirmLabel"
              values={{ email: user.email }}
              components={{ email: <span className="font-medium" /> }}
            />
          </Label>
          <Input
            id="confirmEmail"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            disabled={isPending}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t('profile.delete.keep')}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={handleDelete}
            disabled={!confirmed || isPending}
            loading={isPending}
          >
            {/* Literal caps in the catalogue, not an `uppercase` class — see
                CLAUDE.md on destructive labels. Every translation keeps them. */}
            <span>{t('profile.delete.confirm')}</span>
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
