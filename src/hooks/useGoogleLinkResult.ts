import { useEffect, useRef } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { googleErrorMessage } from '@/lib/googleSignInError'
import { queryClient } from '@/lib/queryClient'
import { toast } from '@/stores/toastStore'
import { AUTH_METHODS_KEY } from './useGoogleSignIn'

/**
 * Says how connecting Google from Profile went, once (CON-396).
 *
 * The flow leaves the app and comes back as a full page load carrying
 * `?linked=google` or `?error=<code>`. Either is turned into a toast and then
 * dropped from the address, so a reload or a shared link doesn't say it again.
 * The ref holds the answer across StrictMode's double effect.
 */
export function useGoogleLinkResult(): void {
  const { t } = useTranslation()
  const navigate = useNavigate({ from: '/profile/' })
  const { linked, error } = useSearch({ from: '/_authenticated/profile/' })
  const said = useRef(false)

  useEffect(() => {
    if (said.current || (!linked && !error)) return
    said.current = true
    if (linked) {
      toast.success(t('profile.signInMethods.connectedToast'))
      void queryClient.invalidateQueries({ queryKey: AUTH_METHODS_KEY })
    } else {
      toast.error(t('profile.signInMethods.connectFailedToast'), {
        description: googleErrorMessage(t, error),
      })
    }
    void navigate({ search: {}, replace: true })
  }, [linked, error, navigate, t])
}
