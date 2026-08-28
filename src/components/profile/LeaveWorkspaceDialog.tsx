import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { useLeaveWorkspace } from '@/hooks/useAuth'
import type { User } from '@/types/user'

type Props = {
  user: User
  isOpen: boolean
  onClose: () => void
}

/**
 * Leaving the workspace this tab is in.
 *
 * The confirmation asks the user to type their email rather than offering a
 * plain confirm button, because the blast radius is much larger than "leaving"
 * suggests: the membership cascades through `created_by` into the campaigns,
 * posts, assets and tags this person made here, so everything they created in
 * the workspace is destroyed with them — including out from under their
 * colleagues. Typing the address is the only step that makes that deliberate.
 *
 * What survives is the other half of the copy's job: the login, and any other
 * workspace. There is no account deletion on the API since CON-147 — this is
 * the whole of what the server offers, and the copy must not promise more.
 *
 * A sole owner can't leave (the server guards the ≥1-owner invariant, 409);
 * that message renders inline, where the retry is.
 */
export function LeaveWorkspaceDialog({ user, isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const { mutate: leave, isPending, error, reset } = useLeaveWorkspace()
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
  const workspace = user.tenant?.name ?? t('profile.leave.thisWorkspace')

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={t('profile.leave.title', { workspace })}
      size="small"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm text-secondary-foreground">
          <p>
            <Trans
              i18nKey="profile.leave.body"
              values={{ email: user.email }}
              components={{ strong: <strong /> }}
            />
          </p>
          <p>
            <Trans
              i18nKey="profile.leave.shared"
              values={{ workspace }}
              components={{ strong: <strong /> }}
            />
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmEmail">
            <Trans
              i18nKey="profile.leave.confirmLabel"
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
            {t('profile.leave.keep')}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            // On success the hook does a full load of `/` — the cache and the
            // pin belong to the workspace just left — so there is no onSuccess
            // navigation here.
            onClick={() => confirmed && leave()}
            disabled={!confirmed || isPending}
            loading={isPending}
          >
            {/* Literal caps in the catalogue, not an `uppercase` class — see
                CLAUDE.md on destructive labels. Every translation keeps them. */}
            <span>{t('profile.leave.confirm')}</span>
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
