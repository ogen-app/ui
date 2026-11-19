import { useTranslation } from 'react-i18next'
import { PlusIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useAddPost } from '@/hooks/usePosts'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate'

/**
 * The posts list's toolbar: how many posts the filter leaves, and ADD POST.
 *
 * The calendar's controls are in its header (`calendar/CalendarHeader`), not
 * here: the list is not a view of a week and has no range to move through.
 *
 * `campaignId: null` is the workspace list, which drops ADD POST — a new post
 * needs a campaign to be created in.
 */
export function PostsToolbar({
  campaignId,
  subheading,
}: {
  campaignId: string | null
  /** The filter's result, said once (CON-486). */
  subheading?: string
}) {
  const { t } = useTranslation()
  // Never called where the button isn't drawn; hooks don't take a branch.
  const addPost = useAddPost(campaignId ?? '')
  // ADD POST is where a post allowance is answered (see `CalendarHeader`).
  const gate = useUpgradeGate('posts_total')

  return (
    <div className="flex items-center justify-between gap-4 py-2 shrink-0 flex-wrap">
      {/* A count, not a heading (CON-486): the page's header already names
          the screen, so it is quiet beside ADD POST. A live region, so a
          change of filter is announced. */}
      <span
        role="status"
        aria-live="polite"
        className="flex h-6 items-center text-[13px] text-tertiary-foreground tabular-nums"
      >
        {subheading}
      </span>
      {campaignId !== null && (
        <Button
          variant="default"
          onClick={gate.intent(() => {
            addPost()
          })}
        >
          <PlusIcon />
          <span>{t('calendar.addPost')}</span>
        </Button>
      )}
      <UpgradeDialog gate={gate} />
    </div>
  )
}
