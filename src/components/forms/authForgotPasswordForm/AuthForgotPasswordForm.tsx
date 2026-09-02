import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { useRequestPasswordReset } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useForgotPasswordSchema } from '@/hooks/useAuthSchemas'
import { FormError } from '@/components/forms/shared/FormError'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'
import { cn } from '@/lib'

/**
 * Step one of a password reset: name the account.
 *
 * The success panel replaces the form rather than sitting under it, because
 * the useful next action is in the user's inbox, not on this screen. Resending
 * is offered from there — the same address, one click — since a link that
 * hasn't arrived is the single most likely reason anyone is still looking at
 * this page.
 *
 * Which is why the panel is latched in local state instead of read off the
 * mutation's `isSuccess`: resending reuses the same mutation, so a rejected
 * resend would flip that flag back to false and yank the panel out from under
 * the user — losing the address they were told about and the resend button
 * itself. The endpoint is rate-limited per address (CON-161), so a rejected
 * resend is a normal outcome of clicking the button twice, not an edge case.
 * Once we've sent one link the panel stays; a failed resend reports itself
 * inside it.
 */
export function AuthForgotPasswordForm() {
  const { t } = useTranslation()
  const { mutate: request, isPending, error, reset } = useRequestPasswordReset()
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState(false)
  const { values, setField, fieldErrors, validate } = useFormValidation(
    useForgotPasswordSchema(),
    { email: '' },
  )

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }
    request(data.email, { onSuccess: () => setSent(true) })
  }

  /**
   * A second send has no visible consequence — the panel is already up and
   * says the same thing it said before the click. Without an answer here the
   * button reads as broken, and the obvious response to that is to press it
   * again, which is the one thing the rate limit will refuse.
   */
  const handleResend = () => {
    setResent(false)
    if (error) reset()
    request(values.email, { onSuccess: () => setResent(true) })
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500">
        {/* `role="status"`: the panel replaces the form the user just
            submitted, and focus stays where the submit button was — without a
            live region a screen reader hears nothing about the request having
            succeeded. On the message block, not the whole panel: `status`
            implies `aria-atomic`, and wrapping the resend region too would
            re-announce all of this on every resend. */}
        <div role="status" className="flex items-start gap-3">
          <EnvelopeSimpleIcon className="size-5 shrink-0 mt-0.5" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{t('auth.forgot.sentTitle')}</p>
            {/* Phrased as a conditional on purpose: the endpoint answers the
                same way for an address with no account, so stating that mail
                is on its way would be a claim we can't make.

                One key, not three fragments — `<Trans>` keeps the sentence
                whole so a translator can move the address within it. */}
            <p className="text-[13px] leading-5 text-secondary-foreground">
              <Trans
                i18nKey="auth.forgot.sentBody"
                values={{ email: values.email }}
                components={{ strong: <span className="font-medium" /> }}
              />
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="default"
            className="w-full justify-between"
            onClick={handleResend}
            loading={isPending}
            disabled={isPending}
          >
            <span>{t('auth.forgot.resend')}</span>
            <ArrowUpRightIcon />
          </Button>
          {/* Both answers to the same click share one region, so the previous
              one is replaced rather than sitting next to its contradiction.
              `status` rather than `alert` even for the failure: it is almost
              always the per-address rate limit (CON-161), which means the
              first link is already on its way — "you don't need to", not a
              failure of the reset. The copy above stays true either way, and
              nothing here is worth interrupting a screen reader mid-sentence
              for. */}
          <p
            role="status"
            className={cn(
              'min-h-5 text-[13px] leading-5',
              error ? 'text-destructive' : 'text-tertiary-foreground',
            )}
          >
            {error ? error.message : resent ? t('auth.forgot.resentNote') : ''}
          </p>
          <Link
            to="/auth/login"
            className="text-primary-foreground text-[13px] font-medium"
          >
            {t('auth.forgot.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('auth.forgot.emailLabel')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          variant="default"
          placeholder={t('auth.forgot.emailPlaceholder')}
          value={values.email}
          onChange={(e) => {
            setField('email', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          disabled={isPending}
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        )}
        {/* The note every other form's last field has, and the reason the
            button no longer sits right under the input. It also answers the
            question this screen reliably produces — which of my addresses? */}
        <p className="text-xs text-tertiary-foreground">
          {t('auth.forgot.emailHint')}
        </p>
      </div>
      <div className="w-full pt-2">
        <Button
          type="submit"
          variant="defaultInverted"
          size="default"
          className="w-full justify-between"
          loading={isPending}
          disabled={isPending}
        >
          <span>{t('auth.forgot.submit')}</span>
          <ArrowUpRightIcon />
        </Button>
        <FormError message={error?.message} />
      </div>
    </form>
  )
}
