import { Spinner } from '@/components/ui/spinner'

type PageLoaderProps = {
  /** Written in capitals, like the rest of the app's status copy. */
  message?: string
}

export function PageLoader({ message }: PageLoaderProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col gap-4 items-center justify-center max-w-xl">
        <Spinner tone="onSurface" className="w-40" />
        <span className="font-grotesk text-sm font-medium tracking-[0.01em]">
          {message ? message : 'LOADING'}
        </span>
      </div>
    </div>
  )
}
