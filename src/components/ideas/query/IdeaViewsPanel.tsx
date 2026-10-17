import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  DotsThreeIcon,
  SidebarSimpleIcon,
  UsersIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ModalContainer } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import { SAVED_VIEW_NAME_MAX, type SavedView } from '@/services/api/savedViews'

/**
 * The smart groups (CON-388 §5): a floating card beside the list, under the
 * title and the capture field. **A group is a saved filter, not a folder** —
 * it holds the filters, the grouping and the sort, never a list of ideas, so
 * an idea is in it the moment it matches and leaves when it stops.
 *
 * All ideas, then the groups, newest first, each with its undecided count —
 * the figure that falls as people answer, as the rail's Ideas row has it. A
 * row's ⋯ offers what the viewer may do to it: everything on a group they can
 * change (`can_edit` — its creator, or an owner when it is shared or its
 * creator has left), and only Duplicate on somebody else's shared one. A group
 * whose filter no longer parses is listed dimmed, with no count.
 */
export function IdeaViewsPanel({
  views,
  activeId,
  allCount,
  onOpen,
  onFold,
  onRename,
  onShare,
  onDuplicate,
  onDelete,
  floating = false,
}: {
  views: SavedView[]
  /** The open group, or null for All ideas. */
  activeId: string | null
  allCount: number
  onOpen: (view: SavedView | null) => void
  onFold: () => void
  onRename: (view: SavedView) => void
  onShare: (view: SavedView, shared: boolean) => void
  onDuplicate: (view: SavedView) => void
  onDelete: (view: SavedView) => void
  /**
   * Over the list, under the Views button, when the column has no room to
   * dock it. Escape or a click elsewhere puts it away.
   */
  floating?: boolean
}) {
  const { t, i18n } = useTranslation()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!floating) return
    const away = (event: MouseEvent) => {
      const target = event.target as Node
      // Its own menus render in a portal, outside the panel; and the Views
      // button toggles it itself — closing here on mousedown would let its
      // click open the panel straight back up.
      if (
        ref.current?.contains(target) ||
        (target instanceof Element &&
          target.closest('[role="menu"], [data-views-trigger]'))
      )
        return
      onFold()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFold()
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [floating, onFold])
  return (
    <nav
      ref={ref}
      aria-label={t('ideas.views.heading')}
      className={cn(
        'flex flex-col gap-1 rounded-md bg-primary p-2 shadow-md',
        floating
          ? 'absolute top-full left-0 mt-2 w-60'
          : 'sticky top-4 self-start',
      )}
      style={floating ? { zIndex: ZIndex.popover } : undefined}
    >
      <div className="flex items-center justify-between pl-2">
        <h2 className="text-xs font-semibold tracking-wide text-secondary-foreground uppercase">
          {t('ideas.views.heading')}
        </h2>
        <Button
          variant="ghost"
          size="smIcon"
          aria-label={t('ideas.views.fold')}
          onClick={onFold}
        >
          <SidebarSimpleIcon className="text-secondary-foreground" />
        </Button>
      </div>

      <ViewLink
        label={t('ideas.views.all')}
        count={formatNumber(allCount, {}, i18n.language)}
        active={activeId === null}
        onOpen={() => onOpen(null)}
      />

      <h3 className="px-2 pt-3 pb-1 text-[11px] tracking-wide text-tertiary-foreground uppercase">
        {t('ideas.views.groups')}
      </h3>
      {views.length === 0 ? (
        <p className="px-2 pb-2 text-xs text-secondary-foreground">
          <Trans
            i18nKey="ideas.views.empty"
            components={{ b: <b className="font-medium text-foreground" /> }}
          />
        </p>
      ) : (
        <ul className="flex flex-col">
          {views.map((view) => (
            <li key={view.id} className="group/view relative">
              <ViewLink
                label={view.name}
                shared={view.shared}
                dim={!view.valid}
                count={
                  view.valid
                    ? formatNumber(
                        view.counts.undecided ?? 0,
                        {},
                        i18n.language,
                      )
                    : null
                }
                active={view.id === activeId}
                onOpen={() => onOpen(view)}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="smIcon"
                    aria-label={t('ideas.views.menu', { name: view.name })}
                    className="absolute top-0 right-0 opacity-0 group-hover/view:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                  >
                    <DotsThreeIcon weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={4}>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

function ViewLink({
  label,
  count,
  active,
  shared = false,
  dim = false,
  onOpen,
}: {
  label: string
  count: string | null
  active: boolean
  shared?: boolean
  dim?: boolean
  onOpen: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active || undefined}
      className={cn(
        'flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm pr-8 pl-2 text-left text-sm transition-colors hover:bg-secondary',
        active && 'bg-secondary font-medium',
        dim && 'text-tertiary-foreground',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shared && (
        <UsersIcon
          className="size-3.5 shrink-0 text-secondary-foreground"
          aria-label={t('ideas.views.shared')}
        />
      )}
      {count !== null && (
        <span className="shrink-0 text-xs text-accent tabular-nums">
          {count}
        </span>
      )}
    </button>
  )
}

/** The panel folded: one button that brings it back, with how many groups there are. */
export function ViewsButton({
  count,
  onUnfold,
}: {
  count: number
  onUnfold: () => void
}) {
  const { t, i18n } = useTranslation()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onUnfold}
      aria-label={t('ideas.views.unfold')}
      data-views-trigger
    >
      <SidebarSimpleIcon />
      {t('ideas.views.heading')}
      <span className="text-secondary-foreground tabular-nums">
        {formatNumber(count, {}, i18n.language)}
      </span>
    </Button>
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
