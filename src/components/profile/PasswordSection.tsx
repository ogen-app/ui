import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRequestPasswordReset } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib'

/**
 * The password, on the account page — changed by email, and only by email.
 *
 * There used to be a form here: current password, new, confirm. It is gone
 * deliberately. `PUT /api/users/:id` takes a new password from any live
 * session without asking for the old one, and revokes nothing afterwards
 * (CON-193), so the in-app path had two problems the client could not fix. We
 * papered over the first by re-authenticating before the write — a lock on our
 * own door, not on the endpoint — and could do nothing at all about the second.
 *
 * The emailed reset has neither problem: it proves control of the mailbox
 * before it changes anything, and `POST /api/password-reset/confirm` revokes
 * every session on the way out. Since that is also what someone changing their
 * password because they think another device is in the account actually wants,
 * the weaker path was not worth keeping alongside it.
 *
 * The address isn't typed here — it is read from the session, so this cannot
 * be aimed at another account.
 */
export function PasswordSection() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { mutate: request, isPending, error, reset } = useRequestPasswordReset()
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState(false)

  if (!user) return null

  const send = () => {
    setResent(false)
    if (error) reset()
    request(user.email, {
      onSuccess: () => (sent ? setResent(true) : setSent(true)),
    })
  }

  return (
    <SettingsCard title={t('profile.password.title')}>
      <div className="flex max-w-150 flex-col items-start gap-4">
        {sent ? (
          <p className="text-sm text-secondary-foreground">
            <Trans
              i18nKey="profile.password.sentBody"
              values={{ email: user.email }}
              components={{ email: <span className="font-medium text-foreground" /> }}
            />
          </p>
        ) : (
          /* The reason is the feature, so it is stated rather than left to be
             discovered: people change a password because they suspect someone
             else has it, and the emailed route is the one that acts on that. */
          <p className="text-sm text-tertiary-foreground">
            <Trans
              i18nKey="profile.password.body"
              values={{ email: user.email }}
              components={{ email: <span className="font-medium text-foreground" /> }}
            />
          </p>
        )}

        <Button
          type="button"
          variant={sent ? 'outline' : 'defaultInverted'}
          onClick={send}
          loading={isPending}
          disabled={isPending}
        >
          {sent ? t('profile.password.resend') : t('profile.password.send')}
        </Button>

        {/* One region for both answers to the same click, so a stale "sent"
            can't sit beside the refusal that contradicts it. A 429 here means
            the first link is already on its way — not a failure of the reset. */}
        <p
          role="status"
          className={cn(
            'min-h-5 text-xs',
            error ? 'text-destructive' : 'text-tertiary-foreground',
          )}
        >
          {error ? error.message : resent ? t('profile.password.resentNote') : ''}
        </p>
      </div>
    </SettingsCard>
  )
}
