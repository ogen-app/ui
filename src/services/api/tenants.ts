/**
 * Tenants API — self-service signup (CON-97).
 *
 * `POST /api/tenants` is public: it atomically creates an organization
 * (tenant) and its first admin user, then opens a session. The backend sets
 * the HTTPOnly session cookie on the response, so the caller is authenticated
 * immediately and needs no separate login. The backend schema is
 * `{ tenant: { name }, user: { name, email, password } }` — the form collects
 * first/last name separately, so we join them into a single `name` here.
 *
 * Reading and renaming the tenant moved to `workspaces.ts`: a tenant *is* a
 * workspace, and the workspace endpoints carry the timezone and the caller's
 * role as well. Signup stays here because it is the one route that runs before
 * a session exists.
 */

import type { User } from '@/types/user'
import type { SignupPayload, Tenant } from '@/types/tenant'
import { apiJson } from './http'
import { rawUserToUser, type RawUser } from './users'

type RawSignupResponse = {
  tenant: Tenant
  user: RawUser
  session: { id: string; user_id: string; expires_at: string }
}

/** `POST /api/tenants` — creates org + first admin, opens a session. */
export async function signup(payload: SignupPayload): Promise<User> {
  const body = await apiJson<RawSignupResponse>(
    '/api/tenants',
    'Unable to create account',
    {
      method: 'POST',
      body: {
        tenant: { name: payload.organizationName.trim() },
        user: {
          name: `${payload.firstName} ${payload.lastName}`.trim(),
          email: payload.email,
          password: payload.password,
        },
      },
    },
  )
  return rawUserToUser({ ...body.user, tenant: body.tenant })
}
