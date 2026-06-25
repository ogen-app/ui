import { type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { useSignup } from '@/hooks/useAuth'
import { useFormValidation } from '@/hooks/useFormValidation'
import { signupSchema, PASSWORD_RULES, cn } from '@/lib'

export function AuthRegisterForm() {
  const navigate = useNavigate()
  const { mutate: signup, isPending, error } = useSignup()
  const { values, setField, fieldErrors, validate } = useFormValidation(signupSchema, {
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const data = validate()
    if (!data) return

    // Signup opens a session (the cookie is set on the response), so we land
    // the user straight in the app — no separate login step.
    signup(data, {
      onSuccess: () => {
        navigate({ to: '/' })
      },
    })
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 shrink-0 animate-in fade-in duration-500"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="organizationName">Organization Name</Label>
          <Input
            id="organizationName"
            type="text"
            autoComplete="organization"
            variant="default"
            placeholder="Enter your organization name"
            value={values.organizationName}
            onChange={(e) => setField('organizationName', e.target.value)}
            aria-invalid={!!fieldErrors.organizationName}
            disabled={isPending}
          />
          {fieldErrors.organizationName && (
            <p className="text-xs text-destructive">{fieldErrors.organizationName}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            autoComplete="given-name"
            variant="default"
            placeholder="Enter your first name"
            value={values.firstName}
            onChange={(e) => setField('firstName', e.target.value)}
            aria-invalid={!!fieldErrors.firstName}
            disabled={isPending}
          />
          {fieldErrors.firstName && (
            <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            autoComplete="family-name"
            variant="default"
            placeholder="Enter your last name"
            value={values.lastName}
            onChange={(e) => setField('lastName', e.target.value)}
            aria-invalid={!!fieldErrors.lastName}
            disabled={isPending}
          />
          {fieldErrors.lastName && (
            <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            variant="default"
            placeholder="Enter your email"
            value={values.email}
            onChange={(e) => setField('email', e.target.value)}
            aria-invalid={!!fieldErrors.email}
            disabled={isPending}
          />
          {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            variant="default"
            placeholder="Enter password"
            value={values.password}
            onChange={(e) => setField('password', e.target.value)}
            aria-invalid={!!fieldErrors.password}
            disabled={isPending}
          />
          {(() => {
            const allPassed = PASSWORD_RULES.every(({ test }) => test(values.password))
            return (
              <p className={`text-xs ${allPassed ? 'text-positive' : 'text-tertiary-foreground'}`}>
                {PASSWORD_RULES.map(({ test, label }, i) => {
                  const passed = test(values.password)
                  const isLast = i === PASSWORD_RULES.length - 1
                  return (
                    <span key={label}>
                      <span
                        className={`text-xs ${allPassed ? 'text-positive' : passed ? 'text-positive' : 'text-tertiary-foreground'}`}
                      >
                        {isLast ? 'and ' : ''}
                        {label}
                        {isLast ? '' : ', '}
                      </span>
                    </span>
                  )
                })}
                {allPassed && '  \u2713'}
              </p>
            )
          })()}
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
            <span>SIGN UP</span>
            <ArrowUpRightIcon className="size-4" />
          </Button>
          <div className="h-4 my-4">
            <span
              className={cn(
                'text-sm text-destructive transition-opacity duration-300',
                error ? ' opacity-100' : 'opacity-0'
              )}
            >
              {error && error.message}
            </span>
          </div>
        </div>
      </form>
    </>
  )
}
