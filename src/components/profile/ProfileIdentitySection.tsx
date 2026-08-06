import { useCallback, useId, useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useRegisterSettingsSave } from '@/components/settings/settingsSave'
import { useUpdateProfile } from '@/hooks/useAuth'
import { profileSchema } from '@/lib'
import type { User } from '@/types/user'

type Draft = { firstName: string; lastName: string; email: string }

/**
 * Name and email, edited inline and applied by the page header's Save button —
 * the same pattern as Workspace Settings, so the two settings screens behave
 * identically.
 *
 * All three fields register as **one** save entry rather than three. The
 * endpoint requires `name` and `email` together on every call, so three
 * independent entries would fire three racing PUTs on a multi-field edit and
 * the last one home would win.
 */
export function ProfileIdentitySection({ user }: { user: User }) {
  const firstId = useId()
  const lastId = useId()
  const emailId = useId()

  // null = pristine; reseeded from the saved user after every successful save.
  const [draft, setDraft] = useState<Draft | null>(null)
  const values: Draft = draft ?? {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  }

  const parsed = profileSchema.safeParse(values)
  const errors = parsed.success
    ? {}
    : Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      )

  const changed =
    values.firstName.trim() !== user.firstName ||
    values.lastName.trim() !== user.lastName ||
    values.email.trim() !== user.email
  // Invalid input registers as not-dirty, so the header's Save never appears
  // for something the server would reject — the inline errors are the feedback.
  const dirty = parsed.success && changed
  const emailChanged = values.email.trim() !== user.email

  const { mutateAsync: save } = useUpdateProfile()
  const persist = useCallback(
    () =>
      save({
        id: user.id,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
      }).then(() => setDraft(null)),
    [save, user.id, values.firstName, values.lastName, values.email],
  )
  useRegisterSettingsSave('profile-identity', dirty, persist)

  const set = (field: keyof Draft) => (value: string) =>
    setDraft({ ...values, [field]: value })

  const initials =
    `${values.firstName[0] ?? ''}${values.lastName[0] ?? ''}`.toUpperCase() || '?'

  return (
    <SettingsCard title="Account">
      <div className="flex items-center gap-4">
        <Avatar className="size-12">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <p className="text-sm text-tertiary-foreground">
          Personal details. Workspace-level settings, including who else has access,
          live in Workspace Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
        <Field
          id={firstId}
          label="First name"
          value={values.firstName}
          error={errors.firstName}
          onChange={set('firstName')}
        />
        <Field
          id={lastId}
          label="Last name"
          value={values.lastName}
          error={errors.lastName}
          onChange={set('lastName')}
        />
        <div className="lg:col-span-2 flex flex-col gap-1.5">
          <Field
            id={emailId}
            label="Email"
            type="email"
            autoComplete="email"
            value={values.email}
            error={errors.email}
            onChange={set('email')}
          />
          {/* Not an Explainer: this is a warning the user needs while working,
              and Explainers can be dismissed for good (CLAUDE.md). It shows
              only once the address is actually being changed, so it reads as a
              consequence of what they just did rather than ambient noise. */}
          {emailChanged && !errors.email && (
            <p className="text-xs text-warning">
              This is the address you log in with. It changes as soon as you save, and
              nothing sends a confirmation to check it works — a typo here locks you out
              at your next login.
            </p>
          )}
        </div>
      </div>
    </SettingsCard>
  )
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
