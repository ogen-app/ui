import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { cn } from '@/lib'
import { AddPostAction } from './AddPostAction'

/**
 * The page both posts lists sit in — a campaign's and the workspace's: the
 * header with ADD POST in its top-right, the list under it, and the warnings
 * drawer at the right edge, beside the header as well as the table, as the
 * calendar's drawer is.
 *
 * The list owns this rather than the campaign layout, for the reason Assets
 * owns its page: the header carries an action that only means something here,
 * and the drawer squeezes the header along with the table.
 *
 * `drawer` null is closed. The panel last shown stays drawn while it slides
 * shut, so it closes with its content rather than emptying first.
 */
export function PostsListFrame({
  campaignId,
  drawer,
  children,
}: {
  campaignId: string | null
  drawer: ReactNode | null
  children: ReactNode
}) {
  const { t } = useTranslation()
  const [shown, setShown] = useState<ReactNode | null>(drawer)
  if (drawer !== null && drawer !== shown) setShown(drawer)
  const open = drawer !== null
  return (
    <PageContainer variant="fullFlex" className="flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageHeader
          title={t('nav.campaign.posts')}
          actions={<AddPostAction campaignId={campaignId} />}
        />
        <div className="page-content-motion flex min-h-0 flex-1 flex-col px-3 lg:px-6">
          {children}
        </div>
      </div>
      <aside
        aria-hidden={!open}
        className={cn(
          'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
          open ? 'w-90' : 'w-0',
        )}
      >
        <div
          className={cn(
            'h-full w-90 border-l border-border bg-primary',
            !open && 'pointer-events-none',
          )}
        >
          {shown}
        </div>
      </aside>
    </PageContainer>
  )
}
