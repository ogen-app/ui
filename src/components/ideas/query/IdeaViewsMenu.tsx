import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { FilterMailSquareIcon } from '@hugeicons/core-free-icons'
import {
  CaretDownIcon,
  CheckIcon,
  DotsThreeIcon,
  PlusIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ModalContainer } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import { SAVED_VIEW_NAME_MAX, type SavedView } from '@/services/api/savedViews'

/**
 * The smart groups (CON-388 §5) as one dropdown opening the filter sentence's
 * line (CON-391),
 * naming what is open — "All ideas 30", or the group and whether it has been
 * edited. **A group is a saved filter, not a folder**: it holds the filters,
 * the grouping and the sort, never a list of ideas, so an idea is in it the
 * moment it matches and leaves when it stops.
 *
 * The menu: All ideas, then the groups, newest first, each with its undecided
 * count — the figure that falls as people answer — a people mark when shared,
 * dimmed with no count when its filter no longer parses. A group's ⋯ holds
 * what the viewer may do to it: everything on one they can change
 * (`can_edit`: its creator, or an owner when it is shared or its creator has
 * left), Duplicate alone on somebody else's shared one. Saving the current
 * filter as a group closes the menu; filtering never saves.
 */
export function IdeaViewsMenu({
  views,
  active,
  edited,
  allCount,
  canSave,
  onOpen,
  onSaveCurrent,
  onRename,
  onShare,
  onDuplicate,
  onDelete,
}: {
  views: SavedView[]
  /** The open group, or null for All ideas. */
  active: SavedView | null
  edited: boolean
  allCount: number
  /** Whether there is a filter to save — the menu's last item needs one. */
  canSave: boolean
  onOpen: (view: SavedView | null) => void
  onSaveCurrent: () => void
  onRename: (view: SavedView) => void
  onShare: (view: SavedView, shared: boolean) => void
  onDuplicate: (view: SavedView) => void
  onDelete: (view: SavedView) => void
}) {
  const { t, i18n } = useTranslation()
  const count = (n: number) => formatNumber(n, {}, i18n.language)
  const label = active?.name ?? t('ideas.views.all')
  const figure = active
    ? active.valid
      ? count(active.counts.undecided ?? 0)
      : null
    : count(allCount)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('ideas.views.trigger', { name: label })}
          // A ghost button opening the sentence's line (CON-391). Its 17px
          // inset puts the icon's centre at 26px — over the select-all box
          // in the rows' 20px inset, and so over every row's.
          className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 pr-2.5 pl-[17px] text-[15px] font-medium outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-accent data-[state=open]:bg-secondary"
        >
          <HugeiconsIcon
            icon={FilterMailSquareIcon}
            size={18}
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="max-w-56 truncate">{label}</span>
          {active?.shared && (
            <UsersIcon
              className="size-3.5 text-tertiary-foreground"
              aria-label={t('ideas.views.shared')}
            />
          )}
          {figure !== null && (
            <span className="text-accent tabular-nums">{figure}</span>
          )}
          {edited && (
            <span className="text-xs font-normal text-accent">
              {t('ideas.views.edited')}
            </span>
          )}
          <CaretDownIcon className="size-3.5 text-secondary-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-80 p-1.5">
        <DropdownMenuItem
          onSelect={() => onOpen(null)}
          className={cn('gap-2.5', !active && 'font-medium')}
        >
          <span className="flex size-4 shrink-0 items-center">
            {!active && <CheckIcon className="size-3.5 text-accent" />}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {t('ideas.views.all')}
          </span>
          <span className="text-xs text-accent tabular-nums">
            {count(allCount)}
          </span>
        </DropdownMenuItem>

        <DropdownMenuLabel className="pt-3">
          {t('ideas.views.groups')}
        </DropdownMenuLabel>
        {views.length === 0 ? (
          <p className="px-2 pb-2 text-xs text-secondary-foreground">
            {t('ideas.views.emptyMenu')}
          </p>
        ) : (
          views.map((view) => (
            <div key={view.id} className="flex items-center">
              <DropdownMenuItem
                onSelect={() => onOpen(view)}
                className={cn(
                  'min-w-0 flex-1 gap-2.5',
                  view.id === active?.id && 'font-medium',
                  !view.valid && 'text-tertiary-foreground',
                )}
              >
                <span className="flex size-4 shrink-0 items-center">
                  {view.id === active?.id && (
                    <CheckIcon className="size-3.5 text-accent" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{view.name}</span>
                {view.shared && (
                  <UsersIcon
                    className="size-3.5 shrink-0 text-tertiary-foreground"
                    aria-label={t('ideas.views.shared')}
                  />
                )}
                {view.valid && (
                  <span className="text-xs text-accent tabular-nums">
                    {count(view.counts.undecided ?? 0)}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  aria-label={t('ideas.views.menu', { name: view.name })}
                  className="h-8 w-8 shrink-0 justify-center px-0 [&>svg:last-child]:hidden"
                >
                  <DotsThreeIcon weight="bold" className="size-4" />
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {view.canEdit && (
                    <>
                      <DropdownMenuItem onSelect={() => onRename(view)}>
                        {t('ideas.views.rename')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onShare(view, !view.shared)}
                      >
                        {view.shared
                          ? t('ideas.views.unshare')
                          : t('ideas.views.share')}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onSelect={() => onDuplicate(view)}>
                    {t('ideas.views.duplicate')}
                  </DropdownMenuItem>
                  {view.canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => onDelete(view)}
                      >
                        {t('ideas.views.delete')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </div>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!canSave}
          onSelect={onSaveCurrent}
          className="gap-2.5"
        >
          <PlusIcon className="size-4" />
          {t('ideas.views.saveCurrent')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Saving the filter as a group — on demand, never as a side effect of
 * filtering. The name is suggested from the tokens; sharing is off unless
 * chosen; one line says what is kept.
 */
export function SaveGroupDialog({
  isOpen,
  suggested,
  title,
  confirm,
  withShare = true,
  saving,
  onClose,
  onSave,
}: {
  isOpen: boolean
  suggested: string
  title: string
  confirm: string
  /** Renaming asks for the name alone. */
  withShare?: boolean
  saving: boolean
  onClose: () => void
  onSave: (name: string, shared: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={title}
      size="small"
    >
      {/* Keyed so each opening starts from its own suggestion. */}
      {isOpen && (
        <SaveGroupForm
          key={suggested}
          suggested={suggested}
          confirm={confirm}
          withShare={withShare}
          saving={saving}
          onClose={onClose}
          onSave={onSave}
          what={t('ideas.views.save.what')}
        />
      )}
    </ModalContainer>
  )
}

function SaveGroupForm({
  suggested,
  confirm,
  withShare,
  saving,
  onClose,
  onSave,
  what,
}: {
  suggested: string
  confirm: string
  withShare: boolean
  saving: boolean
  onClose: () => void
  onSave: (name: string, shared: boolean) => void
  what: string
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(suggested.slice(0, SAVED_VIEW_NAME_MAX))
  const [shared, setShared] = useState(false)
  const trimmed = name.trim()
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed) onSave(trimmed, shared)
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-secondary-foreground">
        {t('ideas.views.save.name')}
        <Input
          value={name}
          autoFocus
          maxLength={SAVED_VIEW_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      {withShare && (
        <>
          <label className="flex items-center justify-between gap-3 text-sm">
            {t('ideas.views.save.share')}
            <Switch
              checked={shared}
              onCheckedChange={setShared}
              aria-label={t('ideas.views.save.share')}
            />
          </label>
          <p className="text-xs text-secondary-foreground">{what}</p>
        </>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('ideas.views.save.cancel')}
        </Button>
        <Button
          type="submit"
          variant="defaultInverted"
          disabled={!trimmed}
          loading={saving}
        >
          {confirm}
        </Button>
      </div>
    </form>
  )
}

/** Deleting a group asks; the ideas in it are untouched, and it says so. */
export function DeleteGroupDialog({
  view,
  deleting,
  onClose,
  onConfirm,
}: {
  view: SavedView | null
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <ModalContainer
      isOpen={view !== null}
      onClose={deleting ? () => {} : onClose}
      title={t('ideas.views.remove.title', { name: view?.name ?? '' })}
      size="small"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          {view?.shared
            ? t('ideas.views.remove.bodyShared')
            : t('ideas.views.remove.body')}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={deleting}
          >
            {t('ideas.views.remove.keep')}
          </Button>
          <Button
            type="button"
            variant="destructiveInverted"
            onClick={onConfirm}
            loading={deleting}
          >
            {t('ideas.views.remove.confirm')}
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
