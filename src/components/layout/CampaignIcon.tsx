import { cn } from '@/lib'

/**
 * Campaign nav icon: a rounded card matching the front card of Phosphor's
 * CardsThree (regular weight, 16-unit stroke on a 256 viewBox) with the
 * campaign's abbreviation inside. When active it inverts (filled card,
 * sidebar-colored letters), mirroring Phosphor's fill weight.
 */
type CampaignIconProps = {
  abbr: string
  active?: boolean
  className?: string
}

export function CampaignIcon({ abbr, active = false, className }: CampaignIconProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect
        x="40"
        y="72"
        width="176"
        height="112"
        rx="12"
        strokeWidth="16"
        stroke="currentColor"
        fill={active ? 'currentColor' : 'none'}
      />
      <text
        x="128"
        y="134"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="64"
        fontWeight="700"
        letterSpacing="2"
        className={cn('font-mono', active ? 'fill-sidebar' : 'fill-current')}
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
