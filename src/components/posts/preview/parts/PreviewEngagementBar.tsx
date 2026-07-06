import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib'

export type EngagementItem = {
  icon: Icon
  label?: string
}

type Props = {
  items: EngagementItem[]
  // 'between' spreads labelled actions full-width (LinkedIn);
  // 'start' clusters icon-only actions on the left (Threads).
  align?: 'between' | 'start'
}

export function PreviewEngagementBar({ items, align = 'between' }: Props) {
  return (
    <div
      className={cn(
        'flex items-center pt-1 text-tertiary-foreground',
        align === 'between' ? 'justify-between' : 'gap-5',
      )}
    >
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[13px] font-medium">
          <it.icon className="size-[18px]" />
          {it.label ? <span>{it.label}</span> : null}
        </div>
      ))}
    </div>
  )
}
