import { type FormEvent } from 'react'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { useLogin } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { useLoginSchema } from '@/hooks/useAuthSchemas'
import { safeRedirect } from '@/lib'
import { FormError } from '@/components/forms/shared/FormError'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'

/**
 * Email/password login form. On success it returns the user to the in-app
 * path the root guard bounced them from (`?redirect=`), defaulting to `/`.
 */
export function AuthLoginForm() {
  const router = useRouter()
  const { t } = useTranslation()
  // Only the return path. Why the user is here — an expired session, a
  // finished reset — is answered by the screen's subtitle, not by the form.
  const { redirect } = useSearch({ from: '/auth/login/' })
  const { mutate: login, isPending, error, reset } = useLogin()
  const { values, setField, fieldErrors, validate } = useFormValidation(useLoginSchema(), {
    email: '',
    password: '',
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const data = validate()
    if (!data) {
      focusFirstInvalid(e.currentTarget)
      return
    }

    login(data, {
      onSuccess: () => {
        // Only in-app paths are honored — the guard writes `location.href`
        // into the param, so its value is attacker-supplied. See
        // `lib/redirects.ts` for why `startsWith("/")` isn't the whole test.
        void router.navigate({ href: safeRedirect(redirect) })
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t('auth.login.emailLabel')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          variant="default"
          placeholder={t('auth.login.emailPlaceholder')}
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
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t('auth.login.passwordLabel')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          variant="default"
          placeholder={t('auth.login.passwordPlaceholder')}
          value={values.password}
          onChange={(e) => {
            setField('password', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          disabled={isPending}
        />
        {/* No password-policy hint here — the rules govern choosing a
            password, not typing one you already have, and repeating them on
            login only tells a visitor what our passwords look like. */}
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        )}
      </div>
      {/* Its own row rather than a note under the field: for a user who can't
          get in this is the only thing on the screen that helps, so it keeps a
          line of its own. Never conditional either — a field error must not be
          able to displace it.

          The row sits in the secondary colour and the link inside it lifts to
          the primary one on hover, so it reads as an aside until you reach for
          it rather than competing with the form for attention. */}
      <p className="text-[13px] leading-5 text-secondary-foreground">
        {/* One key with the link inside it, not prompt + action + a glued-on
            period: the full stop belongs to the sentence, and a translator has
            to be able to move the link within it. */}
        <Trans
          i18nKey="auth.login.forgot"
          components={{
            resetLink: (
              <Link
                to="/auth/forgot"
                className="font-medium transition-colors hover:text-primary-foreground"
              />
            ),
          }}
        />
      </p>
      <div className="w-full">
        <Button
          type="submit"
          variant="defaultInverted"
          size="default"
          className={'w-full justify-between'}
          loading={isPending}
          disabled={isPending}
        >
          <span>{t('auth.login.submit')}</span>
          <ArrowUpRightIcon />
        </Button>
        <FormError message={error?.message} />
      </div>
    </form>
  )
}
