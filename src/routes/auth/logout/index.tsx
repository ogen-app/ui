import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageStatusFooter } from '@/components/page-primitives/PageStatusFooter'
import { Button } from '@/components/ui/button'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'
import { clearAllApplicationData } from '@/lib/cache-utils'

export const Route = createFileRoute('/auth/logout/')({
  component: LogoutPage,
})

/**
 * The logout screen.
 *
 * Its one rule: **it always finishes.** `DELETE /api/sessions` fails whenever
 * the session is already gone — an expired cookie, a second tab that logged
 * out first, React's StrictMode running the effect twice in dev — and every
 * one of those used to leave the page spinning forever on an unhandled
 * rejection, with the local data still on disk. A failed server call changes
 * nothing about what has to happen here: the credentials are cleared locally
 * either way, and the user reaches the same screen.
 */
function LogoutPage() {
  const logout = useAuthStore((state) => state.logout)
  const [isDone, setIsDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const performReset = async () => {
      try {
        await logout()
      } catch {
        // Already logged out server-side, or the server is unreachable. The
        // local half below is what actually matters, and it must still run.
      }
      try {
        await clearAllApplicationData()
      } catch {
        // Best-effort: a storage API refusing us must not strand the user.
      }
      if (!cancelled) setIsDone(true)
    }
    void performReset()
    return () => {
      cancelled = true
    }
  }, [logout])

  return (
    <PageContainer variant="fullscreen">
      <div className="flex-1 flex h-0 items-center justify-center gap-4 text-center">
        <div className="flex flex-col gap-4 items-center justify-stretch max-w-xl px-4">
          <span className="text-[11px] leading-[16px] font-medium font-sans tracking-[0.03em] text-tertiary-foreground">
            &nbsp;
          </span>
          <span className="text-[2rem] leading-[46px] font-medium font-display tracking-tight">
            {isDone ? "You've Been Logged Out" : 'Logging Out...'}
          </span>
          <p className="text-[14px] leading-[24px] text-tertiary-foreground">
            {isDone ? 'See you next time!' : 'This may take a few seconds'}
          </p>
          <div className="mt-4 h-12 flex items-center justify-center">
            {isDone ? (
              <Button
                variant="defaultInverted"
                size={'lg'}
                className={'gap-10'}
                onClick={() => navigate({ to: '/' })}
              >
                <span>TAKE ME HOME</span>
                <ArrowUpRightIcon className={'size-4'} />
              </Button>
            ) : (
              <Spinner tone="onSurface" className={'w-80 h-[2px]'} />
            )}
          </div>
        </div>
      </div>
      <PageStatusFooter message={'LOGOUT'} />
    </PageContainer>
  )
}
