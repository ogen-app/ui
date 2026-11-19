import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChromeMenuContent,
  ChromeMenuItem,
  ChromeMenuLabel,
} from '@/components/layout/chrome'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useAddPostTo } from '@/hooks/usePosts'
import { identityColorVar } from '@/lib/identity'

/**
 * A grid day's add control, for both calendars.
 *
 * On a campaign's calendar it creates the post there. On the workspace
 * calendar there is no campaign to put it in, and a post has to have one, so
 * the same button asks which — every active campaign, in the switcher's order
 * and with its colour — and a workspace with one campaign is not asked.
 *
 * The button stays drawn while its menu is open (`data-[state=open]`): the
 * grid shows it on hover, and the pointer leaves the column to reach the menu.
 */
export function AddPostButton({
  campaignId,
  day,
  title,
  className,
  children,
}: {
  campaignId: string | null
  day: Date
  title: string
  className: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const addPostTo = useAddPostTo()
  const { data: campaigns = [] } = useCampaigns()
  const target = campaignId ?? (campaigns.length === 1 ? campaigns[0].id : null)

  if (target !== null || campaigns.length === 0) {
    return (
      <button
        type="button"
        disabled={target === null}
        onClick={() => target && addPostTo(target, day)}
        title={title}
        className={className}
      >
        {children}
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger title={title} className={className}>
        {children}
      </DropdownMenuTrigger>
      <ChromeMenuContent align="start">
        <ChromeMenuLabel>{t('calendar.addPostTo')}</ChromeMenuLabel>
        {campaigns.map((campaign) => (
          <ChromeMenuItem
            key={campaign.id}
            onSelect={() => addPostTo(campaign.id, day)}
          >
            <span
              aria-hidden
              style={{ backgroundColor: identityColorVar(campaign.id) }}
              className="size-2 shrink-0 rounded-full"
            />
            <span className="truncate">
              {campaign.name.trim() || t('nav.untitledCampaign')}
            </span>
          </ChromeMenuItem>
        ))}
      </ChromeMenuContent>
    </DropdownMenu>
  )
}
