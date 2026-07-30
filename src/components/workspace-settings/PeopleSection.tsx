import { memo, useState, type ReactNode } from 'react'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TextSelect } from '@/components/ui/text-select'
import { SettingsCard } from '@/components/settings/SettingsCard'
import {
  useActiveWorkspace,
  useInviteMember,
  useRemoveMember,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateMemberRole,
  useWorkspaceInvitations,
  useWorkspaceMembers,
} from '@/hooks/useWorkspaces'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib'
import {
  ROLE_ABILITIES,
  ROLE_LABELS,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceRole,
} from '@/types/workspace'

/** Owner is reachable only by transfer, so it is never offered when inviting. */
const INVITABLE_ROLES: WorkspaceRole[] = ['admin', 'member', 'viewer']
const ASSIGNABLE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer']

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

function relativeDays(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return ''
  const days = Math.round(ms / 86_400_000)
  if (days === 0) return 'today'
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`
  return `${-days} day${days === -1 ? '' : 's'} ago`
}

/**
 * The people in the current workspace, and the invitations that haven't been
 * answered yet (CON-26).
 *
 * Members and invitations are one section rather than two because they are one
 * question — "who has access" — and an invitation is just a membership that
 * hasn't been accepted. Splitting them made the pending row easy to miss,
 * which is exactly the row that needs chasing.
 */
function PeopleSectionComponent() {
  const workspace = useActiveWorkspace()
  const workspaceId = workspace?.id
  const canManage = workspace ? workspace.role !== 'member' : false

  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const { data: invitations } = useWorkspaceInvitations(workspaceId)

  // Accepted ones became memberships; revoked ones are dead. Expired stay —
  // they're the rows that need resending.
  const pending = (invitations ?? []).filter(
    (i) => i.status === 'pending' || i.status === 'expired',
  )

  return (
    <SettingsCard title="People">
      {!workspace || membersLoading ? (
        <p className="text-sm text-tertiary-foreground">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <SubHeader>Workspace members</SubHeader>
            <ul className="flex flex-col divide-y divide-quaternary">
              {(members ?? []).map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  workspaceId={workspace.id}
                  canManage={canManage}
                  callerIsOwner={workspace.role === 'owner'}
                />
              ))}
            </ul>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <SubHeader>Pending invitations</SubHeader>
              <ul className="flex flex-col divide-y divide-quaternary">
                {pending.map((inv) => (
                  <InvitationRow
                    key={inv.id}
                    invitation={inv}
                    workspaceId={workspace.id}
                    canManage={canManage}
                  />
                ))}
              </ul>
            </div>
          )}

          {canManage ? (
            <InviteForm workspaceId={workspace.id} />
          ) : (
            <p className="text-sm text-tertiary-foreground">
              Only admins and owners can invite people to this workspace.
            </p>
          )}
        </div>
      )}
    </SettingsCard>
  )
}

function MemberRow({
  member,
  workspaceId,
  canManage,
  callerIsOwner,
}: {
  member: WorkspaceMember
  workspaceId: string
  canManage: boolean
  callerIsOwner: boolean
}) {
  const { mutate: setRole, isPending: savingRole } = useUpdateMemberRole(workspaceId)
  const { mutate: remove, isPending: removing } = useRemoveMember(workspaceId)

  // Ownership can only be handed over by the owner, and the owner's own row
  // can't be edited into something else — there would be no owner left.
  const roleLocked = member.role === 'owner' || (!canManage && !member.is_self)
  const roles = callerIsOwner ? ASSIGNABLE_ROLES : INVITABLE_ROLES
  // The owner can't be removed at all; everyone else needs rights, except for
  // leaving, which is always your own to do.
  const canRemove = member.role !== 'owner' && (canManage || member.is_self)

  const handleRole = (role: string) => {
    const next = role as WorkspaceRole
    if (next === member.role) return
    setRole(
      { userId: member.user_id, role: next },
      {
        onSuccess: () =>
          toast.success(
            next === 'owner'
              ? `${member.name} is now the owner`
              : `${member.name} is now ${ROLE_LABELS[next].toLowerCase()}`,
          ),
        onError: (err) =>
          toast.error('Unable to change the role', {
            description: err instanceof Error ? err.message : undefined,
          }),
      },
    )
  }

  const handleRemove = () => {
    remove(member.user_id, {
      onSuccess: () => {
        if (member.is_self) {
          // The caller just left; everything cached belongs to a workspace
          // they can no longer read.
          window.location.assign('/')
          return
        }
        toast.success(`${member.name} removed`)
      },
      onError: (err) =>
        toast.error('Unable to remove', {
          description: err instanceof Error ? err.message : undefined,
        }),
    })
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0 flex items-center gap-2 min-w-0">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback>{initialsOf(member.name, member.email)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-sm truncate text-primary-foreground">
            {member.name}
            {member.is_self && (
              <span className="text-tertiary-foreground"> (that’s you)</span>
            )}
          </span>
          <span className="text-xs text-tertiary-foreground truncate">
            {member.email}
          </span>
        </div>
      </div>

      <div className={ROLE_COL}>
        {/* The owner's role isn't a choice anyone can make here — ownership
            moves by promoting someone else, which demotes this row. */}
        {roleLocked ? (
          <span className="text-sm text-tertiary-foreground">{ROLE_LABELS[member.role]}</span>
        ) : (
          <TextSelect
            value={member.role}
            onValueChange={handleRole}
            disabled={savingRole}
            variant="inline"
            size="sm"
            elements={roles.map((r) => ({ id: r, displayValue: ROLE_LABELS[r] }))}
          />
        )}
      </div>

      <div className={ACTION_COL}>
        {/* The owner has no remove at all — there is no state in which it
            could fire. Everyone else keeps the button and it goes dead when
            the caller lacks the rights, so "why can't I" has an answer on
            hover rather than a missing control. */}
        {member.role !== 'owner' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={!canRemove || removing}
            loading={removing}
            title={member.is_self ? 'Leave this workspace' : `Remove ${member.name}`}
          >
            {member.is_self ? 'LEAVE' : 'REMOVE'}
          </Button>
        )}
      </div>
    </li>
  )
}

function InvitationRow({
  invitation,
  workspaceId,
  canManage,
}: {
  invitation: WorkspaceInvitation
  workspaceId: string
  canManage: boolean
}) {
  const { mutate: revoke, isPending: revoking } = useRevokeInvitation(workspaceId)
  const { mutate: resend, isPending: resending } = useResendInvitation(workspaceId)
  const expired = invitation.status === 'expired'

  return (
    <li className="py-3 first:pt-0 last:pb-0 flex items-center gap-2 min-w-0">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <span className="flex size-9 shrink-0 items-center justify-center bg-secondary">
          <EnvelopeSimpleIcon className="size-4 text-tertiary-foreground" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm truncate text-secondary-foreground">
            {invitation.email}
          </span>
          <span
            className={cn(
              'text-xs truncate',
              expired ? 'text-warning' : 'text-tertiary-foreground',
            )}
          >
            invited by {invitation.invited_by} ·{' '}
            {expired
              ? `expired ${relativeDays(invitation.expires_at)}`
              : `expires ${relativeDays(invitation.expires_at)}`}
          </span>
        </div>
      </div>

      {/* Same column as a member's role: a pending invitation is a membership
          that hasn't been accepted, and the role is already decided. */}
      <div className={ROLE_COL}>
        <span className="text-sm text-tertiary-foreground">
          {ROLE_LABELS[invitation.role]}
        </span>
      </div>

      <div className={ACTION_COL}>
        {canManage && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                resend(invitation.id, {
                  onSuccess: () =>
                    toast.success(`Invitation resent to ${invitation.email}`),
                  onError: (err) =>
                    toast.error('Unable to resend', {
                      description: err instanceof Error ? err.message : undefined,
                    }),
                })
              }
              disabled={resending}
              loading={resending}
            >
              RESEND
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                revoke(invitation.id, {
                  onSuccess: () => toast.success('Invitation revoked'),
                  onError: (err) =>
                    toast.error('Unable to revoke', {
                      description: err instanceof Error ? err.message : undefined,
                    }),
                })
              }
              disabled={revoking}
              loading={revoking}
              aria-label={`Cancel the invitation to ${invitation.email}`}
              title={`Cancel the invitation to ${invitation.email}`}
            >
              CANCEL
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')
  const { mutate: invite, isPending } = useInviteMember(workspaceId)

  const trimmed = email.trim()

  const submit = () => {
    invite(
      { email: trimmed, role },
      {
        onSuccess: (inv) => {
          toast.success(`Invitation sent to ${inv.email}`)
          setEmail('')
        },
        // The server owns the rules that matter here — already a member,
        // already invited — so its message is shown rather than guessed at.
        onError: (err) =>
          toast.error('Unable to send the invitation', {
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
      <SubHeader>Invite someone</SubHeader>

      {/* One line: the two fields and the action that consumes them. The
          button aligns to the bottom of the fields, not to their labels. */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-x-8 gap-y-5">
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            disabled={isPending}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
          <Label htmlFor="invite-role">Role</Label>
          <TextSelect
            id="invite-role"
            variant="default"
            size="default"
            value={role}
            onValueChange={(r) => setRole(r as WorkspaceRole)}
            disabled={isPending}
            elements={INVITABLE_ROLES.map((r) => ({
              id: r,
              displayValue: ROLE_LABELS[r],
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
          INVITE
        </Button>
      </div>

      {/* Names the person and the permission in one sentence — the role's
          consequence is easier to judge against an address than against a
          label. */}
      <p className="text-xs text-tertiary-foreground">
        A member with{' '}
        <span className="text-secondary-foreground">{trimmed || 'this address'}</span> will
        be able to {ROLE_ABILITIES[role]}
      </p>
    </form>
  )
}

export const PeopleSection = memo(PeopleSectionComponent)
