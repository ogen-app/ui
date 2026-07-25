import { cn } from '@/lib'

/**
 * Campaign nav icon: an 18×14 card (in a 20×20 frame, matching the size-5
 * icon slot) with the campaign's abbreviation inside. Follows currentColor so
 * it picks up the menu button's text color; when active it inverts — filled
 * card with letters in the sidebar background color.
 */
type CampaignIconProps = {
  abbr: string
  active?: boolean
  className?: string
}

export function CampaignIcon({ abbr, active = false, className }: CampaignIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect
        x="1"
        y="3"
        width="18"
        height="14"
        rx="2"
        strokeWidth="1.25"
        stroke="currentColor"
        fill={active ? 'currentColor' : 'none'}
      />
      <text
        x="10"
        y="10"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fontWeight="700"
        className={cn('font-grotesk uppercase', active ? 'fill-sidebar' : 'fill-current')}
      >
        {abbr}
      </text>
    </svg>
  )
}

export function campaignAbbr(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '·'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
