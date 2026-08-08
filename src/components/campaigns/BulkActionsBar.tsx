import { useState } from 'react'
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
import { toast } from '@/stores/toastStore'
import type { Post } from '@/types/posts'

type Props = {
  /** The selected posts themselves, not their ids — every action reads status. */
  posts: Post[]
  onClear: () => void
  onApply: (plan: BulkPlan) => void
  onDelete: (posts: Post[]) => void
  busy?: boolean
}

/**
 * Replaces the posts toolbar while a selection is live: what is selected on
 * the left, the action groups in the middle, and the way out on the right.
 *
 * It stands in for the toolbar rather than sitting under it so the table
 * never moves. The white fill is the 40px band the toolbar's controls
 * occupy — the surrounding 8px stays transparent, so this row is exactly as
 * tall as the one it replaced and keeps the same gap above the table.
 */
export function BulkActionsBar({ posts, onClear, onApply, onDelete, busy = false }: Props) {
  const [action, setAction] = useState<BulkAction | null>(null)

  const applyPlan = (plan: BulkPlan) => {
    onApply(plan)
    toast.success(describeResult(plan.changes.length, plan.skipped))
  }

  const deletePosts = (targets: Post[]) => {
    onDelete(targets)
    toast.success(`${targets.length} ${targets.length === 1 ? 'post' : 'posts'} deleted`)
  }

  return (
    <div className="py-2 shrink-0">
      <div className="flex h-10 items-center gap-4 bg-primary px-4">
        {/* Fixed width, tabular figures: the count changes on every tick and
            the actions beside it must not slide as it does. */}
        <span className="w-32 shrink-0 text-[13px]/4 font-medium tabular-nums whitespace-nowrap">
          {posts.length} selected
        </span>

        <div className="flex flex-1 items-center gap-2">
          <ActionGroup
            label="Publication date & time"
            disabled={busy}
            items={[
              { id: 'date', label: 'Change date' },
              { id: 'time', label: 'Change time' },
            ]}
            onSelect={setAction}
          />
          <ActionGroup
            label="Status"
            disabled={busy}
            items={[
              { id: 'unschedule', label: 'Unschedule' },
              { id: 'delete', label: 'Delete', destructive: true },
            ]}
            onSelect={setAction}
          />
        </div>

        <Button variant="ghost" onClick={onClear} disabled={busy}>
          <XIcon />
          <span>CLEAR</span>
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
