import { Spinner } from '@/components/ui/spinner'

type PageLoaderProps = {
  /** Written in capitals, like the rest of the app's status copy. */
  message?: string
}

/**
 * The stand-in for a screen that has not arrived yet.
 *
 * It holds itself invisible for the first quarter-second (`page-loader-motion`
 * in `index.css`): most waits in this app are a warm cache away from instant,
 * and a spinner that appears and vanishes inside two frames reads as a glitch.
 * Nothing here has to know how long the wait will be — a loader that unmounts
 * before the delay is up simply never becomes visible.
 */
export function PageLoader({ message }: PageLoaderProps) {
  return (
    <div className="page-loader-motion flex h-full items-center justify-center">
      <div className="flex flex-col gap-4 items-center justify-center max-w-xl">
        <Spinner tone="onSurface" className="w-40" />
        <span className="font-grotesk text-sm font-medium tracking-[0.01em]">
          {message ? message : 'LOADING'}
        </span>
      </div>
    </div>
  )
}
