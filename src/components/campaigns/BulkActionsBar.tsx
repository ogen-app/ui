import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CaretDownIcon, XIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
   * Every post the filter matches is ticked (CON-482): the bar says so, as
   * the Ideas and Assets bars do, because that is what the assistant hears.
   */
  allMatching?: boolean
  /**
   * Floats over the foot of the grid instead of standing in for the toolbar —
   * the calendar's form (CON-486), where the toolbar is the week's navigation
   * and must stay while posts are ticked.
   */
  floating?: boolean
}

/**
 * What is selected on the left, the action groups in the middle, and the way
 * out on the right.
 *
 * On the list it replaces the posts toolbar while a selection is live, so the
 * table never moves. The white fill is the 40px band the toolbar's controls
 * occupy — the surrounding 8px stays transparent, so this row is exactly as
 * tall as the one it replaced and keeps the same gap above the table.
 *
 * On the calendar it floats: the toolbar there holds the week's arrows,
 * WEEK / MONTH and ADD POST, which a selection is no reason to take away.
 */
export function BulkActionsBar({
  posts,
  onClear,
  onApply,
  onDelete,
  busy = false,
  allMatching = false,
  floating = false,
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

  return (
    <div
      className={
        floating
          ? // Over the grid's foot, centred, as the Ideas bar sits over its
            // list; only the bar itself takes the pointer.
            'pointer-events-none absolute inset-x-0 bottom-4 flex justify-center'
          : 'py-2 shrink-0'
      }
      style={floating ? { zIndex: ZIndex.pageActionBar } : undefined}
    >
      <div
        className={
          floating
            ? 'pointer-events-auto flex h-12 items-center gap-3 bg-primary px-4 shadow-lg'
            : 'flex h-10 items-center gap-4 bg-primary px-4'
        }
      >
        {/* Fixed width on the list, tabular figures: the count changes on
            every tick and the actions beside it must not slide as it does. */}
        <span
          className={
            floating
              ? 'shrink-0 text-[13px]/4 font-medium tabular-nums whitespace-nowrap'
              : 'min-w-32 shrink-0 text-[13px]/4 font-medium tabular-nums whitespace-nowrap'
          }
        >
          {allMatching
            ? t('campaigns.bulk.allMatching', counted(posts.length))
            : t('campaigns.bulk.selected', counted(posts.length))}
        </span>
        {floating && (
          <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
        )}

        <div
          className={
            floating
              ? 'flex items-center gap-1'
              : 'flex flex-1 items-center gap-2'
          }
        >
          <ActionGroup
            label={t('campaigns.bulk.when')}
            disabled={busy}
            items={[
              { id: 'date', label: t('campaigns.bulk.changeDate') },
              { id: 'time', label: t('campaigns.bulk.changeTime') },
            ]}
            onSelect={setAction}
          />
          <ActionGroup
            label={t('campaigns.bulk.status')}
            disabled={busy}
            items={[
              { id: 'unschedule', label: t('campaigns.bulk.unschedule') },
              {
                id: 'delete',
                label: t('campaigns.bulk.delete'),
                destructive: true,
              },
            ]}
            onSelect={setAction}
          />
        </div>

        <Button variant="ghost" onClick={onClear} disabled={busy}>
          <XIcon />
          <span>{t('campaigns.bulk.clear')}</span>
        </Button>
      </div>

      <BulkActionDialog
        action={action}
        posts={posts}
        onClose={() => setAction(null)}
        onApply={applyPlan}
        onDelete={deletePosts}
        busy={busy}
      />
    </div>
  )
}

function ActionGroup({
  label,
  items,
  onSelect,
  disabled,
}: {
  label: string
  items: { id: BulkAction; label: string; destructive?: boolean }[]
  onSelect: (action: BulkAction) => void
  disabled?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" disabled={disabled}>
          <span>{label}</span>
          <CaretDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            variant={item.destructive ? 'destructive' : undefined}
            onSelect={() => onSelect(item.id)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
