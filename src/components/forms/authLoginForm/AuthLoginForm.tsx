import { type FormEvent } from 'react'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { useLogin } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { loginSchema, safeRedirect } from '@/lib'
import { FormError } from '@/components/forms/shared/FormError'
import { focusFirstInvalid } from '@/components/forms/shared/focusFirstInvalid'

/**
 * Email/password login form. On success it returns the user to the in-app
 * path the root guard bounced them from (`?redirect=`), defaulting to `/`.
 */
export function AuthLoginForm() {
  const router = useRouter()
  // Only the return path. Why the user is here — an expired session, a
  // finished reset — is answered by the screen's subtitle, not by the form.
  const { redirect } = useSearch({ from: '/auth/login/' })
  const { mutate: login, isPending, error, reset } = useLogin()
  const { values, setField, fieldErrors, validate } = useFormValidation(loginSchema, {
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          variant="default"
          placeholder="Enter your email"
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          variant="default"
          placeholder="Enter password"
          value={values.password}
          onChange={(e) => {
            setField('password', e.target.value)
            if (error) reset()
          }}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          disabled={isPending}
        />
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        )}
        {/* The slot every other password field gives to `PasswordRules` — the
            rules themselves have no business here, since they govern choosing
            a password rather than typing one you already have, and printing
            them on a public screen only tells a visitor what our passwords
            look like. The way out of not knowing it goes here instead, on its
            own line and never conditional: it is the one link a user who
            can't get in actually needs. */}
        <p className="text-xs text-tertiary-foreground">
          Forgot your password?{' '}
          <Link to="/auth/forgot" className="font-medium text-primary-foreground">
            Reset it here
          </Link>
          .
        </p>
      </div>
      <div className="w-full">
        <Button
          type="submit"
          variant="defaultInverted"
          size="default"
          className={'w-full justify-between'}
          loading={isPending}
          disabled={isPending}
        >
          <span>LOG IN</span>
          <ArrowUpRightIcon />
        </Button>
        <FormError message={error?.message} />
      </div>
    </form>
  )
}
