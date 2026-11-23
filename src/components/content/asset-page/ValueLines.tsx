import type { ReactNode } from 'react'
import { Mark } from '@/components/posts/quickBar/parts'
import { cn } from '@/lib'

/**
 * A value of several items in the Overview's two columns (`SettingRow`): one
 * item a line, each with its 16px mark in front, so the values read straight
 * down the column as About's single values do. A long item wraps under its
 * own text rather than under the mark.
 */
export function ValueLines({ children }: { children: ReactNode }) {
  return <ul className="flex w-full min-w-0 flex-col">{children}</ul>
}

export function ValueLine({
  mark,
  className,
  children,
}: {
  mark: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <li className={cn('flex min-w-0 gap-1.5', className)}>
      <span className="flex h-6 shrink-0 items-center">
        <Mark>{mark}</Mark>
      </span>
      <span className="min-w-0 flex-1 py-0.5 break-words">{children}</span>
    </li>
  )
}
