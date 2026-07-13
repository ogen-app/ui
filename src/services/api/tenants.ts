/**
 * Tenants API — self-service signup and workspace management (CON-97).
 *
 * `POST /api/tenants` is public: it atomically creates an organization
 * (tenant) and its first admin user, then opens a session. The backend sets
 * the HTTPOnly session cookie on the response, so the caller is authenticated
 * immediately and needs no separate login. The backend schema is
 * `{ tenant: { name }, user: { name, email, password } }` — the form collects
 * first/last name separately, so we join them into a single `name` here.
 *
 * The read/update surface is caller's-own-tenant only: any other id returns
 * 404 (CON-97 §12.3). The slug is stable across renames.
 */

import type { User } from "@/types/user";
import type { SignupPayload, Tenant } from "@/types/tenant";
import { apiJson } from "./http";
import { rawUserToUser, type RawUser } from "./users";

type RawSignupResponse = {
  tenant: Tenant;
  user: RawUser;
  session: { id: string; user_id: string; expires_at: string };
};

/** `POST /api/tenants` — creates org + first admin, opens a session. */
export async function signup(payload: SignupPayload): Promise<User> {
  const body = await apiJson<RawSignupResponse>("/api/tenants", "Unable to create account", {
    method: "POST",
    body: {
      tenant: { name: payload.organizationName.trim() },
      user: {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: payload.email,
        password: payload.password,
      },
    },
  });
  return rawUserToUser({ ...body.user, tenant: body.tenant });
}

/** `GET /api/tenants/current` — the caller's own tenant. */
export async function getCurrentTenant(): Promise<Tenant> {
  return apiJson<Tenant>("/api/tenants/current", "Unable to load workspace");
}

/** `PUT /api/tenants/:id` — rename the caller's own tenant. */
export async function renameTenant(id: string, name: string): Promise<Tenant> {
  return apiJson<Tenant>(`/api/tenants/${id}`, "Unable to rename workspace", {
    method: "PUT",
    body: { name },
  });
}
