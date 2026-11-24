export type Tenant = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  /**
   * Where the workspace is in setup after signup (CON-513); null for a
   * workspace made before setup existed, which is never sent through it.
   * Only `GET /api/tenants/current` carries it.
   */
  setup?: WireSetup | null
}

/** The workspace's setup state, camelCase as the server sends it. */
export type WireSetup = {
  status: 'pending' | 'done' | 'skipped'
  /** The client's own step names; the server only checks their shape. */
  step: string
  reached: string
  role: '' | 'own' | 'client'
  runId: string | null
  updatedAt: string | null
  finishedBy: string | null
  finishedAt: string | null
}

/**
 * Self-service signup payload (CON-97). The form collects first/last name
 * separately and an organization name; the service joins the names and nests
 * the tenant before POSTing to `/api/tenants`.
 */
export type SignupPayload = {
  organizationName: string
  firstName: string
  lastName: string
  email: string
  password: string
  /**
   * A tester invite to redeem (CON-333): the workspace is created
   * complimentary, and `email` must be the invited address.
   */
  inviteToken?: string
}
