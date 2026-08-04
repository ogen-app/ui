import { type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { useRequestPasswordReset } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { forgotPasswordSchema, cn } from '@/lib'

/**
 * Step one of a password reset: name the account.
 *
 * The success panel replaces the form rather than sitting under it, because
 * the useful next action is in the user's inbox, not on this screen. Resending
 * is offered from there — the same address, one click — since a link that
 * hasn't arrived is the single most likely reason anyone is still looking at
 * this page.
 */
export function AuthForgotPasswordForm() {
  const { mutate: request, isPending, isSuccess, error, reset } = useRequestPasswordReset()
  const { values, setField, fieldErrors, validate } = useFormValidation(forgotPasswordSchema, {
    email: '',
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const data = validate()
    if (!data) return
    request(data.email)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500">
        <div className="flex items-start gap-3">
          <EnvelopeSimpleIcon className="size-5 shrink-0 mt-0.5" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Check your inbox</p>
            {/* Phrased as a conditional on purpose: the endpoint answers the
                same way for an address with no account, so stating that mail
                is on its way would be a claim we can't make. */}
            <p className="text-[13px] leading-5 text-secondary-foreground">
              If <span className="font-medium">{values.email}</span> has an Ogen account, a
              link to set a new password is on its way. It expires in an hour.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="default"
            className="w-full justify-between"
            onClick={() => request(values.email)}
            loading={isPending}
            disabled={isPending}
          >
            <span>SEND IT AGAIN</span>
            <ArrowUpRightIcon />
          </Button>
          <Link
            to="/auth/login"
            className="text-primary-foreground text-[13px] font-medium"
          >
            Back to log in
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
          disabled={isPending}
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
      </div>
      <div className="w-full">
        <Button
          type="submit"
          variant="defaultInverted"
          size="default"
          className="w-full justify-between"
          loading={isPending}
          disabled={isPending}
        >
          <span>SEND RESET LINK</span>
          <ArrowUpRightIcon />
        </Button>
        <div className="h-4 my-4">
          <span
            className={cn(
              'text-sm text-destructive transition-opacity duration-300',
              error ? 'opacity-100' : 'opacity-0'
            )}
          >
            {error && error.message}
          </span>
        </div>
      </div>
    </form>
  )
}
