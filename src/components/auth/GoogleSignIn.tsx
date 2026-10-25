import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { googleStartUrl, type GoogleIntent } from '@/services/api/googleAuth'
import { useGoogleSignInEnabled } from '@/hooks/useGoogleSignIn'
import { GoogleMark } from './GoogleMark'

type Props = {
  intent?: GoogleIntent
  /** Where to land after signing in — already passed through `safeRedirect`. */
  returnTo?: string
  inviteToken?: string
  /** Runs on the click, before the browser leaves for Google. */
  onClick?: () => void
}

/**
 * CONTINUE WITH GOOGLE: the white sibling of the card's black submit button.
 *
 * A link, not a button with a handler — the flow starts with a full-page
 * navigation to the API, which redirects to Google and back. It carries no
 * arrow on purpose: one arrowed CTA per card, so the card's own submit stays
 * the primary action. The same words on login and register, because the
 * server decides which of the two a Google account needs.
 */
export function GoogleSignInButton({
  intent,
  returnTo,
  inviteToken,
  onClick,
}: Props) {
  const { t } = useTranslation()
  return (
    <Button
      asChild
      variant="outline"
      size="default"
      className="w-full justify-start gap-3"
    >
      <a
        href={googleStartUrl({ intent, returnTo, inviteToken })}
        onClick={onClick}
      >
        <GoogleMark />
        <span>{t('auth.google.continue')}</span>
      </a>
    </Button>
  )
}

/**
 * A hairline with a few words in it, between Google and the email form. Not a
 * second card: both ways in stay in view, nothing is folded away.
 */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-tertiary-foreground">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}

/**
 * The Google button and the divider under it, or nothing when Google is not
 * offered here — the flag is off, or this server has no OAuth client. Forms
 * render this above their fields and are untouched when it is empty.
 */
export function GoogleSignInOption({
  divider,
  hint,
  ...props
}: Props & {
  /** The divider's words, e.g. "or with your email". */
  divider: string
  /** A line under the button, said before the click — the invite's address rule. */
  hint?: ReactNode
}) {
  const enabled = useGoogleSignInEnabled()
  if (!enabled) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <GoogleSignInButton {...props} />
        {hint && (
          <p className="text-[13px] leading-5 text-secondary-foreground">
            {hint}
          </p>
        )}
      </div>
      <AuthDivider label={divider} />
    </div>
  )
}
