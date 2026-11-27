import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrashIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { SelectionLine } from '@/components/page-primitives/SelectionLine'
import { BulkActionDialog, type BulkAction } from './BulkActionDialog'
import { describeResult, type BulkPlan } from '@/lib/bulkPostEdits'
import { counted } from '@/lib/intl'
import { toast } from '@/stores/toastStore'
import { ZIndex } from '@/config/zIndex'
import type { Post } from '@/types/posts'

type Props = {
  /** The selected posts themselves, not their ids — every action reads status. */
  posts: Post[]
  onClear: () => void
  /** Resolves with the number of changes that failed, for honest reporting. */
  onApply: (plan: BulkPlan) => Promise<number>
  /** Resolves with the number of deletions that failed. */
  onDelete: (posts: Post[]) => Promise<number>
  busy?: boolean
  /**
   * Every post the filter matches is ticked (CON-482): the line says so, as
   * the Ideas and Assets heads do, because that is what the assistant hears.
   */
  allMatching?: boolean
}

/**
 * A campaign's ticked posts, in the line the filter stood in on the posts
 * list (`SelectionLine`, the Ideas and Assets head): how many, the way out,
 * and the four things that can be done to them — each a button of its own
 * rather than a menu of menus, the way the other lists offer theirs. Delete
 * is ghost like the rest and red in its icon; the dialog behind every one of
 * them says what will happen before it does.
 */
export function PostSelectionLine({
  posts,
  onClear,
  onApply,
  onDelete,
  busy = false,
  allMatching = false,
}: Props) {
  const { t } = useTranslation()
  const [action, setAction] = useState<BulkAction | null>(null)

  // Success is claimed only for what succeeded, and only once it has: the
  // requests fan out and any of them can fail. Failures raise their own error
  // toasts through the mutations, so the count here just stays truthful.
  const applyPlan = (plan: BulkPlan) => {
    void onApply(plan).then((failed) => {
      const applied = plan.changes.length - failed
      if (applied > 0) toast.success(describeResult(applied, plan.skipped))
    })
  }

  const deletePosts = (targets: Post[]) => {
    void onDelete(targets).then((failed) => {
      const deleted = targets.length - failed
      if (deleted > 0)
        toast.success(t('campaigns.bulk.deleted', counted(deleted)))
    })
  }

  const act = (id: BulkAction, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={() => setAction(id)}
    >
      {id === 'delete' && <TrashIcon className="text-destructive" />}
      <span>{label}</span>
    </Button>
  )

  return (
    <>
      <SelectionLine
        status={
          allMatching
            ? t('campaigns.bulk.allMatching', counted(posts.length))
            : t('campaigns.bulk.selected', counted(posts.length))
        }
        clear={{
          label: t('campaigns.bulk.clear'),
          onClick: onClear,
          disabled: busy,
        }}
      >
        {act('date', t('campaigns.bulk.changeDate'))}
        {act('time', t('campaigns.bulk.changeTime'))}
        {act('unschedule', t('campaigns.bulk.unschedule'))}
        {act('delete', t('campaigns.bulk.delete'))}
      </SelectionLine>

      <BulkActionDialog
        action={action}
        posts={posts}
        onClose={() => setAction(null)}
        onApply={applyPlan}
        onDelete={deletePosts}
        busy={busy}
      />
    </>
  )
}

/**
 * The same line on the calendar, floated over the grid's foot (CON-486): the
 * calendar has no list head — its header is the week's navigation and its
 * search, which a selection is no reason to take away — so the line comes to
 * rest where the ticked cards are.
 */
export function CalendarSelectionBar(props: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <div className="pointer-events-auto flex h-12 items-center bg-primary px-4 shadow-lg">
        <PostSelectionLine {...props} />
      </div>
    </div>
  )
}
