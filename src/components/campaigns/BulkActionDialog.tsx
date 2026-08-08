import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import {
  planClearDate,
  planDelete,
  planSetDate,
  planSetTime,
  type BulkPlan,
} from '@/lib/bulkPostEdits'
import { getLocalTimezoneLabel } from '@/lib/postSchedule'
import type { Post } from '@/types/posts'

/** The four things a selection can be put through. */
export type BulkAction = 'date' | 'time' | 'unschedule' | 'delete'

type Props = {
  /** `null` closes the dialog. */
  action: BulkAction | null
  posts: Post[]
  onClose: () => void
  onApply: (plan: BulkPlan) => void
  onDelete: (posts: Post[]) => void
  busy?: boolean
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const TITLES: Record<BulkAction, string> = {
  date: 'Change publication date',
  time: 'Change publication time',
  unschedule: 'Unschedule posts',
  delete: 'Delete posts',
}

/**
 * What the action will do, said before it does it: how many posts it reaches
 * and how many it will refuse. The refusals are the point — a bulk action
 * that quietly skips half the selection is indistinguishable from one that
 * worked, so the count is on screen before the user commits.
 */
function planSummary(plan: BulkPlan, verb: string): string {
  const n = plan.changes.length
  const head =
    n === 0 ? `No posts will be ${verb}` : `${n} ${n === 1 ? 'post' : 'posts'} will be ${verb}`
  if (plan.skipped.length === 0) return `${head}.`
  const tail = plan.skipped.map((s) => `${s.count} ${s.reason}`).join(', ')
  return `${head}. Left alone: ${tail}.`
}

export function BulkActionDialog({ action, posts, onClose, onApply, onDelete, busy }: Props) {
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState('')
  const tzLabel = getLocalTimezoneLabel()

  if (!action) return null

  const close = () => {
    setDate(null)
    setTime('')
    onClose()
  }

  const apply = (plan: BulkPlan) => {
    onApply(plan)
    close()
  }

  const body = () => {
    switch (action) {
      case 'date': {
        const plan = date ? planSetDate(posts, date.slice(0, 10)) : null
        return (
          <>
            <div className="flex flex-col gap-2">
              <Label asChild>
                <span>New date</span>
              </Label>
              <DatePicker value={date} onChange={setDate} placeholder="Pick a date" />
              <p className="text-xs text-tertiary-foreground">
                Each post keeps its own time of day. Posts with no date yet get 09:00.
              </p>
            </div>
            <Summary text={plan ? planSummary(plan, 'moved') : null} />
            <Actions
              confirmLabel="CHANGE DATE"
              disabled={!plan || plan.changes.length === 0}
              busy={busy}
              onCancel={close}
              onConfirm={() => plan && apply(plan)}
            />
          </>
        )
      }
      case 'time': {
        const plan = TIME_PATTERN.test(time) ? planSetTime(posts, time) : null
        return (
          <>
            <div className="flex flex-col gap-2">
              <Label asChild>
                <span>New time ({tzLabel})</span>
              </Label>
              <Input
                type="time"
                className="w-32"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <p className="text-xs text-tertiary-foreground">
                Each post keeps its own date. Posts with no date are left alone.
              </p>
            </div>
            <Summary text={plan ? planSummary(plan, 'moved') : null} />
            <Actions
              confirmLabel="CHANGE TIME"
              disabled={!plan || plan.changes.length === 0}
              busy={busy}
              onCancel={close}
              onConfirm={() => plan && apply(plan)}
            />
          </>
        )
      }
      case 'unschedule': {
        const plan = planClearDate(posts)
        return (
          <>
            <p className="text-sm text-secondary-foreground">
              The publication date and time are cleared. The posts stay as drafts and go
              nowhere until they are scheduled again.
            </p>
            <Summary text={planSummary(plan, 'unscheduled')} />
            <Actions
              confirmLabel="UNSCHEDULE"
              disabled={plan.changes.length === 0}
              busy={busy}
              onCancel={close}
              onConfirm={() => apply(plan)}
            />
          </>
        )
      }
      case 'delete': {
        const { deletable, blocked } = planDelete(posts)
        return (
          <>
            <p className="text-sm text-secondary-foreground">
              These posts are permanently deleted from Ogen. This cannot be undone.
            </p>
            <Summary
              text={
                `${deletable.length} ${deletable.length === 1 ? 'post' : 'posts'} will be deleted.` +
                (blocked > 0
                  ? ` Left alone: ${blocked} scheduled or published, which have to be cancelled first.`
                  : '')
              }
            />
            <Actions
              confirmLabel="DELETE POSTS"
              destructive
              disabled={deletable.length === 0}
              busy={busy}
              onCancel={close}
              onConfirm={() => {
                onDelete(deletable)
                close()
              }}
            />
          </>
        )
      }
    }
  }

  return (
    <ModalContainer
      isOpen
      onClose={busy ? () => {} : close}
      title={TITLES[action]}
      size="small"
      closeOnBackdropClick={!busy}
      closeOnEscape={!busy}
    >
      <div className="flex flex-col gap-4">{body()}</div>
    </ModalContainer>
  )
}

function Summary({ text }: { text: string | null }) {
  if (!text) return null
  return <p className="bg-secondary px-4 py-3 text-sm">{text}</p>
}

function Actions({
  confirmLabel,
  onCancel,
  onConfirm,
  disabled,
  busy,
  destructive = false,
}: {
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  disabled?: boolean
  busy?: boolean
  destructive?: boolean
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
        CANCEL
      </Button>
      <Button
        type="button"
        variant={destructive ? 'destructiveInverted' : 'default'}
        onClick={onConfirm}
        disabled={disabled}
        loading={busy}
      >
        {confirmLabel}
      </Button>
    </div>
  )
}
