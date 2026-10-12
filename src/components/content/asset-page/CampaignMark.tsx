import { cn } from '@/lib'

/**
 * A campaign's initial on a small square — how the asset page names a
 * campaign in a list (the meta column's Campaigns, the lens picker). The tint
 * is seeded from the id, so one campaign wears the same colour in both places
 * and two neighbours rarely share one.
 */
export function CampaignMark({
  id,
  name,
  className,
}: {
  id: string
  name: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-semibold text-primary',
        className,
      )}
      style={{ backgroundColor: `hsl(${hue(id)} 45% 42%)` }}
    >
      {name.trim().charAt(0).toUpperCase() || '·'}
    </span>
  )
}

function hue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 360
}
