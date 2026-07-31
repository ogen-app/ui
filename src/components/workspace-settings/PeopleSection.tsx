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
  canActOnMember,
  canManageWorkspace,
  grantableRoles,
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
  const callerRole = workspace?.role
  const canManage = callerRole ? canManageWorkspace(callerRole) : false

  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId)
  const { data: invitations } = useWorkspaceInvitations(workspaceId)

  // Accepted ones became memberships; revoked ones are dead. Expired stay —
  // they're the rows that need resending.
  const pending = (invitations ?? []).filter(
    (i) => i.status === 'pending' || i.status === 'expired',
  )

  // Several owners are allowed, so an owner row is editable — right up until
  // it's the only one left. Counted here rather than per row: the invariant is
  // about the list, not about any single member.
  const owners = (members ?? []).filter((m) => m.role === 'owner').length

  return (
    <SettingsCard title="People">
      {!workspace || !callerRole || membersLoading ? (
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
                  callerRole={callerRole}
                  isLastOwner={m.role === 'owner' && owners <= 1}
                />
              ))}
            </ul>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-quaternary pt-6">
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
            <InviteForm workspaceId={workspace.id} callerRole={callerRole} />
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
  callerRole,
  isLastOwner,
}: {
  member: WorkspaceMember
  workspaceId: string
  callerRole: WorkspaceRole
  isLastOwner: boolean
}) {
  const { mutate: setRole, isPending: savingRole } = useUpdateMemberRole(workspaceId)
  const { mutate: remove, isPending: removing } = useRemoveMember(workspaceId)

  // Rank decides who may touch whom; the last owner is the one row nobody can
  // change, including themselves, because the workspace would be left without
  // one. Your own role isn't yours to edit either — leaving is the way out.
  const roleLocked = !canActOnMember(callerRole, member.role) || isLastOwner
  const roles = grantableRoles(callerRole)
  // Leaving is always your own to do, whatever your rank.
  const canRemove =
    !isLastOwner && (member.is_self || canActOnMember(callerRole, member.role))

  const handleRole = (role: string) => {
    const next = role as WorkspaceRole
    if (next === member.role) return
    setRole(
      { userId: member.user_id, role: next },
      {
        onSuccess: () =>
          toast.success(`${member.name} is now ${ROLE_LABELS[next].toLowerCase()}`),
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
        {/* Locked rows read as plain text rather than a dead control: there is
            nothing to choose, and a disabled select invites the click anyway. */}
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
        {/* Only the last owner loses the button outright — for them no state
            exists in which it could fire. Everyone else keeps it and it goes
            dead when the caller lacks the rank, so "why can't I" has an answer
            on hover rather than a missing control. */}
        {!isLastOwner && (
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
  // Resending *is* inviting: the endpoint is idempotent per email, so this is
  // the same call the form below makes, with the row's own address and role.
  const { mutate: resend, isPending: resending } = useInviteMember(workspaceId)
  const expired = invitation.status === 'expired'

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
              variant="ghost"
              size="sm"
              onClick={() =>
                resend(
                  { email: invitation.email, role: invitation.role },
                  {
                    onSuccess: () =>
                      toast.success(`Invitation resent to ${invitation.email}`),
                    onError: (err) =>
                      toast.error('Unable to resend', {
                        description: err instanceof Error ? err.message : undefined,
                      }),
                  },
                )
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

function InviteForm({
  workspaceId,
  callerRole,
}: {
  workspaceId: string
  callerRole: WorkspaceRole
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')
  const { mutate: invite, isPending } = useInviteMember(workspaceId)

  // An owner can invite a co-owner; an admin can't invite above themselves.
  const roles = grantableRoles(callerRole)
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
            elements={roles.map((r) => ({
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

      {/* What the chosen role actually grants. It reads as a caption to the
          Role select, so it says only what changes with the select. */}
      <p className="text-xs text-tertiary-foreground">{ROLE_ABILITIES[role]}</p>
    </form>
  )
}

export const PeopleSection = memo(PeopleSectionComponent)
