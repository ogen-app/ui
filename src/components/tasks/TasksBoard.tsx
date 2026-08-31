import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusCircleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { PageGridEmptyState } from '@/components/page-primitives/PageGridEmptyState'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import {
  useTaskReconciliation,
  useTasks,
  useTaskWriter,
} from '@/hooks/useTasks'
import { useTaskDescription } from '@/hooks/useTaskDescription'
import { useDateTimeLabel } from '@/hooks/useActivityLabels'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useWorkspaceMembers } from '@/hooks/useWorkspaces'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { openTasks, type Task } from '@/lib/tasks'
import { cn } from '@/lib'

/**
 * **Tasks** — the workspace's work, and a module of its own (CON-225).
 *
 * Not a card at the top of Activity, and not a tab inside it. What happened and
 * what is owed are two objects, opened at different times and for different
 * reasons: the feed is the thing you check, the board is the thing you come
 * back to.
 *
 * **A task is a line, and a line is what you scan.** The row says the four
 * things you need to triage — is it done, what is it, whose campaign, whose
 * desk — and it says them in one line each, so twenty tasks are twenty lines
 * rather than a page you scroll. The description rides along faded and cut off,
 * which is enough to tell two similarly-titled tasks apart and is the affordance
 * for the rest: it is visibly unfinished, and clicking finishes it.
 *
 * **Opening one expands it in place** rather than covering the list with a
 * dialog. The description moves out of the row into a section of its own, whole,
 * beside the record of who raised the task and when — and the delete, which
 * lives here and nowhere else because it is final and should cost a deliberate
 * stop rather than sit on a row somebody is scanning past. One at a time: an
 * accordion, because two open tasks make the list a wall again.
 *
 * Most of these were raised by the system from the campaigns' warnings, and the
 * board says nothing about which — a task is a task once it exists, and "the
 * computer noticed this" is not a category anyone works by. Where it does show
 * is what happens next: a system task whose warning clears resolves itself, and
 * the closure lands in the feed rather than disappearing silently from
 * someone's list.
 *
 * Done tasks stay for the rest of the day. A list that empties itself the
 * instant you tick something takes the evidence with it, and "did that save?"
 * is the one question this screen must never raise.
 */
export function TasksBoard() {
  const { t } = useTranslation()
  const { tasks, isLoading, isError } = useTasks()
  const [creating, setCreating] = useState(false)
  // By id, not by index: the list re-sorts under the open row the moment
  // something is ticked, and the task you opened should stay the open one.
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // The other half of the client-side subsystem the Activity feed runs: raising
  // tasks for new warnings and resolving the ones whose warning has gone. Both
  // screens do it because either can be the one you open, and they are separate
  // destinations, so only ever one of them is mounted. See
  // `useTaskReconciliation`.
  useTaskReconciliation()

  const open = openTasks(tasks)
  // Everything closed since midnight, newest first — `sortTasks` has already
  // put the open ones on top and ordered both halves.
  const recentlyDone = useMemo(() => {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    return tasks.filter(
      (task) =>
        task.status === 'done' &&
        task.closedAt &&
        Date.parse(task.closedAt) >= since.getTime(),
    )
  }, [tasks])

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <PageError header={t('tasks.loadFailed')} />
      </PageContainer>
    )
  }

  const visible = [...open, ...recentlyDone]

  return (
    <PageContainer variant="fullFlex">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader
          title={t('tasks.title')}
          actions={
            // The corner contract reserves top-right for views, with one
            // exception it names: a list has creation rather than commit, which
            // is why ADD CAMPAIGN lives there too. This is the same thing.
            //
            // Ghost, like the feed's MARK ALL READ next door: these two modules
            // share a corner as far as anyone moving between them is concerned,
            // and a solid button on one of them would read as the louder screen.
            <Button variant="ghost" size="lg" onClick={() => setCreating(true)}>
              <PlusCircleIcon weight="bold" className="size-4" />
              <span>{t('tasks.add')}</span>
            </Button>
          }
        />

        {visible.length === 0 ? (
          <div className="grow grid px-3 lg:px-6 pb-6">
            <PageGridEmptyState
              title={t('tasks.empty.title')}
              subtitle={t('tasks.empty.subtitle')}
            />
          </div>
        ) : (
          // Tighter than the feed's stack of days: these are rows of one line,
          // and the feed's gap between them would read as one card each.
          <div className="flex flex-col gap-2 px-3 lg:px-6 pt-4 pb-10">
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                expanded={task.id === expandedId}
                onToggle={() =>
                  setExpandedId((id) => (id === task.id ? null : task.id))
                }
              />
            ))}
          </div>
        )}
      </div>

      <CreateTaskDialog open={creating} onClose={() => setCreating(false)} />
    </PageContainer>
  )
}

function TaskRow({
  task,
  expanded,
  onToggle,
}: {
  task: Task
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const { completeTask, reopenTask, assignTask, deleteTask } = useTaskWriter()
  const { data: members } = useWorkspaceMembers()
  const { data: campaigns } = useCampaigns()
  const describe = useTaskDescription()
  const when = useDateTimeLabel()

  const done = task.status === 'done'
  const assignee = members?.find((member) => member.id === task.assigneeId)
  const assigneeName = assignee ? assignee.name || assignee.email : null
  const campaign = campaigns?.find((c) => c.id === task.campaignId)
  const campaignName = task.campaignId
    ? campaign?.name.trim() || t('nav.untitledCampaign')
    : null
  const description = describe(task)

  const memberName = (id: string | null) => {
    if (!id) return null
    const member = members?.find((candidate) => candidate.id === id)
    return member ? member.name || member.email : null
  }

  // Whole statements joined, never a sentence built from fragments — the same
  // separator the daily report uses for the same reason.
  const record = [
    task.source.kind === 'rule'
      ? t('tasks.createdBySystem', { at: when(task.createdAt) })
      : memberName(task.createdBy)
        ? t('tasks.createdBy', {
            name: memberName(task.createdBy),
            at: when(task.createdAt),
          })
        : when(task.createdAt),
    done && task.closedAt
      ? task.closedReason === 'auto'
        ? t('tasks.autoResolved')
        : memberName(task.closedBy)
          ? t('tasks.closedBy', {
              name: memberName(task.closedBy),
              at: when(task.closedAt),
            })
          : when(task.closedAt)
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="w-full max-w-content mx-auto rounded-md bg-primary px-4 py-3 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* The app's checkbox, not one drawn here: finishing a task is the same
            gesture as every other tick in the product. The slot is a fixed 16px
            so the column does not move if the control ever changes size. */}
        <span className="flex w-4 shrink-0 items-center justify-center">
          <Checkbox
            checked={done}
            onCheckedChange={() =>
              void (done ? reopenTask(task.id) : completeTask(task.id))
            }
            aria-label={done ? t('tasks.reopen') : t('tasks.complete')}
          />
        </span>

        {/* Title and the start of the description are one target, because they
            are one sentence read left to right. Not the whole row: the tick, the
            campaign and the assignee are controls of their own, and a row that
            was also a button would be swallowing clicks meant for them.

            The title takes the width it needs and the description fills what is
            left, so a long title is never cut to make room for a preview. */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left cursor-pointer"
        >
          <span
            className={cn(
              'min-w-0 truncate text-sm',
              done
                ? 'text-tertiary-foreground line-through'
                : 'text-primary-foreground',
            )}
          >
            {task.title}
          </span>
          {/* Faded and cut off on purpose — enough to tell two tasks apart, and
              visibly unfinished, which is what says the row opens. It leaves the
              line when the section below takes it: the same words twice would
              make the expansion look like it had done nothing. */}
          {!expanded && (
            // A floor of 96px under it, which is the one case the title yields
            // in: a preview cut to two characters is noise, and the title has
            // an ellipsis to say the rest is there.
            <span className="min-w-24 flex-1 truncate text-sm text-quaternary-foreground">
              {description || t('tasks.noDescription')}
            </span>
          )}
        </button>

        {task.campaignId && campaignName && (
          // Where the task sits, in the same mark the sidebar and the campaigns
          // list use — recognised before it is read. The name is the label for
          // it; below `sm` the mark travels alone rather than eating the row.
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-tertiary-foreground">
            <CampaignIcon
              abbr={identityAbbr(campaignName)}
              color={identityColorVar(task.campaignId)}
              className="size-5"
            />
            <span className="hidden sm:inline max-w-32 truncate">
              {campaignName}
            </span>
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Whose desk it is, at the size of a glance. The name is the
                button's accessible name rather than its contents: initials read
                out as letters, and "AV" is not an answer to whose task this
                is. */}
            <button
              type="button"
              className="shrink-0 cursor-pointer"
              aria-label={
                assigneeName
                  ? t('tasks.assignedTo', { name: assigneeName })
                  : t('tasks.assign')
              }
            >
              {task.assigneeId ? (
                // Drawn from the *id*, not from the name it resolves to: the
                // member list is a second request, and for as long as it is in
                // flight every assigned task would otherwise show the empty
                // seat — the one thing on the row that must never lie. The
                // initials fill in when the names arrive.
                //
                // Quieter than the app's avatar elsewhere, where it stands in
                // for a person at the size of a portrait. Twenty rows of
                // knocked-out black would be the loudest thing on a screen
                // whose job is the titles.
                <Avatar className="size-6">
                  <AvatarFallback className="bg-quaternary text-[10px] font-medium text-tertiary-foreground">
                    {identityAbbr(assigneeName ?? '')}
                  </AvatarFallback>
                </Avatar>
              ) : (
                // An empty seat, drawn as one: the dashed square is the size the
                // filled one will be, so assigning does not move the row.
                <span className="flex size-6 items-center justify-center border border-dashed border-senary-foreground text-tertiary-foreground">
                  <PlusIcon className="size-3" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onSelect={() => void assignTask(task.id, null)}>
              {t('tasks.unassigned')}
            </DropdownMenuItem>
            {(members ?? []).map((member) => (
              <DropdownMenuItem
                key={member.id}
                onSelect={() => void assignTask(task.id, member.id)}
              >
                {member.name || member.email}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Animated by grid rows rather than height, so the panel can be its own
          size and still open from nothing — the collapsed row keeps its exact
          height, which is what makes a list of them scannable. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {/* `pl-7` is the 16px tick slot plus the 12px gap — the section starts
              in the title's column, not the row's. */}
          <div className="flex flex-col gap-2 pl-7 pt-3">
            <p
              className={cn(
                'text-sm whitespace-pre-line',
                description
                  ? 'text-secondary-foreground'
                  : 'text-tertiary-foreground',
              )}
            >
              {description || t('tasks.noDescription')}
            </p>

            {/* A hairline between the task and its record, not a division of the
                card: the lightest rule the palette has, and 8px either side of
                it. The two things it separates belong to each other. */}
            <div className="flex items-center justify-between gap-3 border-t border-quaternary pt-2">
              <p className="min-w-0 text-[13px] leading-5 text-tertiary-foreground">
                {record}
              </p>
              {/* A bin rather than the words: the row underneath is one line,
                  and DELETE TASK in full weighs more than everything above it.
                  The caps survive where they are still read — the button's
                  accessible name. Opening the task is the confirmation step; a
                  second "are you sure" on top of it would train people to click
                  through both. */}
              <Button
                variant="ghost"
                size="smIcon"
                // Pulled 4px right, which is what puts the glyph's centre on
                // the avatar's above it: a 32px button around a 16px icon is
                // otherwise inset further than the 24px tile.
                className="-mr-1 shrink-0"
                aria-label={t('tasks.delete')}
                onClick={() => void deleteTask(task.id)}
              >
                <TrashIcon className="size-4 text-tertiary-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
