export type Tenant = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
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
