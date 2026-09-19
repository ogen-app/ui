import { useEffect, useState } from 'react'

import { Spinner } from '@/components/ui/spinner'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

/** How long the panel takes to fade once `isLoading` goes false. */
const FADE_MS = 300

type AppLoaderProps = {
  isLoading: boolean
  /** The headline. Kept in the language currently on screen, not the one
   *  being loaded — it is the last thing the user reads before the swap. */
  title: string
  message?: string
}

/**
 * An opaque, app-wide waiting screen.
 *
 * Opaque and `fixed` rather than a translucent scrim: it exists to cover a
 * moment when what is underneath is briefly wrong (half-translated, mid-swap),
 * so nothing behind it should show through. Nothing unmounts — the app carries
 * on rendering underneath and keeps its scroll position, its query cache and
 * any in-flight edit.
 *
 * It sits at `ZIndex.appLoader`, above every other layer including toasts.
 */
export function AppLoader({ isLoading, title, message }: AppLoaderProps) {
  // Outlives `isLoading` by one fade, so the panel can animate out instead of
  // vanishing between frames.
  const [rendered, setRendered] = useState(isLoading)

  useEffect(() => {
    if (isLoading) {
      setRendered(true)
      return
    }
    const timer = setTimeout(() => setRendered(false), FADE_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  if (!rendered) return null

  return (
    <div
      id="app-loader"
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-0 flex items-center justify-center bg-background transition-opacity',
        isLoading ? 'opacity-100' : 'opacity-0',
      )}
      style={{ zIndex: ZIndex.appLoader, transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="flex max-w-xl flex-col items-center gap-4 px-4 text-center">
        <span className="font-display text-[2rem] leading-[46px] font-medium tracking-tight">
          {title}
        </span>
        {message && (
          <p className="text-[14px] leading-[24px] text-tertiary-foreground">
            {message}
          </p>
        )}
        <div className="mt-4 flex h-12 items-center justify-center">
          <Spinner tone="onSurface" className="h-[2px] w-80" />
        </div>
      </div>
    </div>
  )
}
