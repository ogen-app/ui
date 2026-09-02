import { memo, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalContainer } from '@/components/ui/modal'
import { TextSelect } from '@/components/ui/text-select'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useInviteMember,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
  useWorkspace,
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from '@/hooks/useWorkspaces'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib'
import {
  ROLE_ABILITY_KEYS,
  ROLE_LABEL_KEYS,
  canActOnMember,
  canManageWorkspace,
  grantableRoles,
  invitationState,
  isLastOwner,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceRole,
} from '@/types/workspace'

/**
 * Members and invitations are different rows saying the same thing, so their
 * columns are fixed rather than content-sized: the roles line up on one edge
 * whether the row carries a select, a locked label, or a pending invite.
 */
const ROLE_COL = 'w-24 shrink-0 flex items-center'
const ACTION_COL = 'w-44 shrink-0 flex items-center justify-end gap-2'

/** Section heading inside a card — quieter than the card's own title. */
function SubHeader({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-[0.01em] text-tertiary-foreground">
      {children}
    </h3>
  )
}

function initialsOf(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

/** Whole days between now and `iso`, negative once it is in the past. */
function daysUntil(iso: string): number {
  const ms = Date.parse(iso) - Date.now()
  return Number.isNaN(ms) ? 0 : Math.round(ms / 86_400_000)
}

/**
 * The people in the current workspace, and the invitations that haven't been
 * answered yet (CON-26).
 *
 * Members and invitations are one section rather than two because they are one
 * question — "who has access" — and an invitation is just a membership that
 * hasn't been accepted. Splitting them made the pending row easy to miss,
 * which is exactly the row that needs chasing.
 *
 * Everything that changes anything here is owner-only server-side
 * (`requireOwner`), including *reading* the invitation list — so a member sees
 * the people and nothing else, and the invitations query is never fired for
 * them rather than fetching a 403 the UI would have to swallow.
 */
function PeopleSectionComponent() {
  const { t } = useTranslation()
  const workspace = useWorkspace()
  const callerRole = workspace?.role
  const canManage = callerRole ? canManageWorkspace(callerRole) : false

  const { data: members, isLoading: membersLoading } = useWorkspaceMembers()
  const { data: invitations } = useWorkspaceInvitations(canManage)

  // Accepted ones became members; revoked ones are dead. Expired stay — they
  // are the rows that need sending again, and the only ones the server will
  // let you re-issue.
  const pending = useMemo(
    () =>
      (invitations ?? [])
        .map((inv) => ({ inv, state: invitationState(inv) }))
        .filter(({ state }) => state === 'pending' || state === 'expired'),
    [invitations],
  )

  // Several owners are allowed, so an owner row is editable — right up until
  // it's the only one left. Counted here rather than per row: the invariant is
  // about the list, not about any single member.
  const owners = (members ?? []).filter((m) => m.role === 'owner').length

  // `invited_by` is a user id; the people who could have sent an invitation are
  // in the list above it, so the name is looked up rather than fetched.
  const nameById = useMemo(
    () => new Map((members ?? []).map((m) => [m.id, m.name])),
    [members],
  )

  return (
    <SettingsCard title={t('workspaceSettings.people.title')}>
      {!workspace || membersLoading ? (
        <p className="text-sm text-tertiary-foreground">
          {t('common.loading')}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <SubHeader>
              {t('workspaceSettings.people.membersHeading')}
            </SubHeader>
            <ul className="flex flex-col divide-y divide-quaternary">
              {(members ?? []).map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  callerRole={callerRole ?? 'member'}
                  lastOwner={isLastOwner(m, owners)}
                />
              ))}
            </ul>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-quaternary pt-6">
              <SubHeader>
                {t('workspaceSettings.people.pendingHeading')}
              </SubHeader>
              <ul className="flex flex-col divide-y divide-quaternary">
                {pending.map(({ inv, state }) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={inv}
                    expired={state === 'expired'}
                    inviterName={nameById.get(inv.invited_by)}
                  />
                ))}
              </ul>
            </div>
          )}

          {canManage ? (
            <InviteForm callerRole={callerRole ?? 'member'} />
          ) : (
            <p className="text-sm text-tertiary-foreground">
              {t('workspaceSettings.people.memberNote')}
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  )
}

function MemberRow({
  member,
  callerRole,
  lastOwner,
}: {
  member: WorkspaceMember
  callerRole: WorkspaceRole
  lastOwner: boolean
}) {
  const { t } = useTranslation()
  const { mutate: setRole, isPending: savingRole } = useUpdateMemberRole()
  const [confirming, setConfirming] = useState(false)

  // The owner decides who is what; the last owner is the one row nobody can
  // change, including themselves, because the workspace would be left without
  // one.
  const roleLocked = !canActOnMember(callerRole, member.role) || lastOwner
  const roles = grantableRoles(callerRole)
  // Removing yourself here would be deleting your own account, which has its
  // own screen and its own confirmation on Profile. So this button is for
  // other people only.
  const canRemove =
    !member.is_self && !lastOwner && canActOnMember(callerRole, member.role)

  const handleRole = (role: string) => {
    const next = role as WorkspaceRole
    if (next === member.role) return
    setRole(
      { userId: member.id, role: next },
      {
        onSuccess: () =>
          toast.success(
            t('workspaceSettings.people.roleChanged', { name: member.name }),
          ),
        onError: (err) =>
          toast.error(t('workspaceSettings.people.roleChangeFailed'), {
            description: err instanceof Error ? err.message : undefined,
          }),
      },
    )
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0 flex items-center gap-2 min-w-0">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>
            {initialsOf(member.name, member.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm truncate text-primary-foreground">
            {member.name}
            {member.is_self && (
              <span className="text-tertiary-foreground">
                {' '}
                {t('workspaceSettings.people.you')}
              </span>
            )}
          </span>
          <span className="text-xs text-tertiary-foreground truncate">
            {member.email}
          </span>
        </div>
      </div>

      <div className={ROLE_COL}>
        {/* Locked rows read as plain text rather than a dead control: there is
            nothing to choose, and a disabled select invites the click anyway. */}
        {roleLocked ? (
          <span className="text-sm text-tertiary-foreground">
            {t(ROLE_LABEL_KEYS[member.role])}
          </span>
        ) : (
          <TextSelect
            value={member.role}
            onValueChange={handleRole}
            disabled={savingRole}
            variant="inline"
            size="sm"
            elements={roles.map((r) => ({
              id: r,
              displayValue: t(ROLE_LABEL_KEYS[r]),
            }))}
          />
        )}
      </div>

      <div className={ACTION_COL}>
        {canRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            title={t('workspaceSettings.people.removeTitle', {
              name: member.name,
            })}
          >
            {t('workspaceSettings.people.remove')}
          </Button>
        )}
      </div>

      {confirming && (
        <RemoveMemberDialog
          member={member}
          onClose={() => setConfirming(false)}
        />
      )}
    </li>
  )
}

/**
 * Removing someone is not detaching a membership — the server deletes the user
 * row, and the schema cascades from `users.id` into everything they created
 * (see `removeMember` in `services/api/workspaces.ts`). So this asks for the
 * email to be typed, the way deleting a workspace asks for its name: the case
 * that hurts is being sure about the wrong person, and "are you sure?" does
 * nothing to catch it.
 */
function RemoveMemberDialog({
  member,
  onClose,
}: {
  member: WorkspaceMember
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState('')
  const { mutate: remove, isPending } = useRemoveMember()
  const matches = typed.trim().toLowerCase() === member.email.toLowerCase()

  const close = () => {
    if (isPending) return
    onClose()
  }

  const handleRemove = () => {
    remove(member.id, {
      onSuccess: () => {
        toast.success(
          t('workspaceSettings.people.removed', { name: member.name }),
        )
        onClose()
      },
      onError: (err) =>
        toast.error(t('workspaceSettings.people.removeFailed'), {
          description: err instanceof Error ? err.message : undefined,
        }),
    })
  }

  return (
    <ModalContainer
      isOpen
      onClose={close}
      title={t('workspaceSettings.people.removeTitle', { name: member.name })}
      size="default"
      closeOnBackdropClick={!isPending}
      closeOnEscape={!isPending}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (matches) handleRemove()
        }}
      >
        <p className="text-sm text-secondary-foreground">
          {t('workspaceSettings.people.removeBody', { name: member.name })}
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-member-email">
            {t('workspaceSettings.people.removeConfirmLabel')}
          </Label>
          <Input
            id="confirm-member-email"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={member.email}
            autoFocus
            disabled={isPending}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            disabled={isPending}
          >
            {t('workspaceSettings.people.removeDismiss')}
          </Button>
          <Button
            type="submit"
            variant="destructiveInverted"
            disabled={!matches || isPending}
            loading={isPending}
          >
            {/* Literal caps, not `uppercase` — see CLAUDE.md on destructive labels. */}
            <span>{t('workspaceSettings.people.removeConfirm')}</span>
          </Button>
        </div>
      </form>
    </ModalContainer>
  )
}

function InvitationRow({
  invitation,
  expired,
  inviterName,
}: {
  invitation: WorkspaceInvitation
  expired: boolean
  inviterName: string | undefined
}) {
  const { t } = useTranslation()
  const { mutate: revoke, isPending: revoking } = useRevokeInvitation()
  // RESEND is the invite endpoint again: creating is idempotent per email
  // (CON-147 §7.3), so any pending row — live or expired — is replaced with a
  // fresh token, expiry and email. That's why the button isn't gated on
  // `expired`: re-sending a live invitation is the "they can't find the email"
  // case, and it costs the old link its validity, nothing else.
  const { mutate: resend, isPending: resending } = useInviteMember()
  const days = Math.abs(daysUntil(invitation.expires_at))

  return (
    <li className="py-4 first:pt-0 last:pb-0 flex items-center gap-2 min-w-0">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        {/* The square, unrounded mark against a member's round avatar is what
            says "not here yet" — so the type below it stays identical to a
            member's rather than dimming to repeat the point. */}
        <span className="flex size-9 shrink-0 items-center justify-center bg-secondary">
          <EnvelopeSimpleIcon className="size-4 text-tertiary-foreground" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm truncate text-primary-foreground">
            {invitation.email}
          </span>
          {/* Two facts, not one sentence: who sent it, and where it stands. The
              inviter is dropped rather than guessed at when their account is
              gone — the row's job is the invitation. */}
          <span
            className={cn(
              'text-xs truncate',
              expired ? 'text-warning' : 'text-tertiary-foreground',
            )}
          >
            {inviterName && (
              <>
                {t('workspaceSettings.people.invitedBy', { name: inviterName })}{' '}
                ·{' '}
              </>
            )}
            {expired
              ? days === 0
                ? t('workspaceSettings.people.expiredToday')
                : t('workspaceSettings.people.expiredAgo', { count: days })
              : days === 0
                ? t('workspaceSettings.people.expiresToday')
                : t('workspaceSettings.people.expiresIn', { count: days })}
          </span>
        </div>
      </div>

      {/* Same column as a member's role: a pending invitation is a membership
          that hasn't been accepted, and the role is already decided. */}
      <div className={ROLE_COL}>
        <span className="text-sm text-tertiary-foreground">
          {t(ROLE_LABEL_KEYS[invitation.role])}
        </span>
      </div>

      <div className={ACTION_COL}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            resend(
              { email: invitation.email, role: invitation.role },
              {
                onSuccess: () =>
                  toast.success(
                    t('workspaceSettings.people.invitationSent', {
                      email: invitation.email,
                    }),
                  ),
                onError: (err) =>
                  toast.error(t('workspaceSettings.people.resendFailed'), {
                    description: err instanceof Error ? err.message : undefined,
                  }),
              },
            )
          }
          disabled={resending}
          loading={resending}
        >
          {t('workspaceSettings.people.resend')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            revoke(invitation.id, {
              onSuccess: () =>
                toast.success(t('workspaceSettings.people.invitationRevoked')),
              onError: (err) =>
                toast.error(t('workspaceSettings.people.revokeFailed'), {
                  description: err instanceof Error ? err.message : undefined,
                }),
            })
          }
          disabled={revoking}
          loading={revoking}
          aria-label={t('workspaceSettings.people.cancelInvitation', {
            email: invitation.email,
          })}
          title={t('workspaceSettings.people.cancelInvitation', {
            email: invitation.email,
          })}
        >
          {t('workspaceSettings.people.cancel')}
        </Button>
      </div>
    </li>
  )
}

function InviteForm({ callerRole }: { callerRole: WorkspaceRole }) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')
  const { mutate: invite, isPending } = useInviteMember()

  const roles = grantableRoles(callerRole)
  const trimmed = email.trim()

  const submit = () => {
    invite(
      { email: trimmed, role },
      {
        onSuccess: (inv) => {
          toast.success(
            t('workspaceSettings.people.invitationSent', { email: inv.email }),
          )
          setEmail('')
        },
        // The server owns the rules that matter here — the address already has
        // an account, an invitation for it is already live, too many sent this
        // hour — so its message is shown rather than guessed at.
        onError: (err) =>
          toast.error(t('workspaceSettings.people.inviteFailed'), {
            description: err instanceof Error ? err.message : undefined,
          }),
      },
    )
  }

  return (
    <form
      className="flex flex-col gap-3 border-t border-quaternary pt-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (trimmed) submit()
      }}
    >
      <SubHeader>{t('workspaceSettings.people.inviteHeading')}</SubHeader>

      {/* One line: the two fields and the action that consumes them. The
          button aligns to the bottom of the fields, not to their labels. */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-x-8 gap-y-5">
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <Label htmlFor="invite-email">
            {t('workspaceSettings.people.emailLabel')}
          </Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('workspaceSettings.people.emailPlaceholder')}
            disabled={isPending}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <Label htmlFor="invite-role">
            {t('workspaceSettings.people.roleLabel')}
          </Label>
          <TextSelect
            id="invite-role"
            variant="default"
            size="default"
            value={role}
            onValueChange={(r) => setRole(r as WorkspaceRole)}
            disabled={isPending}
            elements={roles.map((r) => ({
              id: r,
              displayValue: t(ROLE_LABEL_KEYS[r]),
            }))}
            className="w-full"
          />
        </div>
        {/* `default` is the 40px size — the same height as the two inputs it
            sits beside, so the row has one baseline. */}
        <Button
          type="submit"
          variant="outline"
          size="default"
          disabled={!trimmed || isPending}
          loading={isPending}
          className="self-end"
        >
          {t('workspaceSettings.people.invite')}
        </Button>
      </div>

      {/* What the chosen role actually grants. It reads as a caption to the
          Role select, so it says only what changes with the select. */}
      <p className="text-xs text-tertiary-foreground">
        {t(ROLE_ABILITY_KEYS[role])}
      </p>
    </form>
  )
}

export const PeopleSection = memo(PeopleSectionComponent)
