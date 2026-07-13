/**
 * Users API — wire-shape mapping and in-tenant user creation.
 *
 * Since CON-97, `POST /api/users` is always authenticated and adds the new
 * user to the caller's tenant (self-service signup that bootstraps a new
 * organization goes through `services/api/tenants.ts` instead; the current
 * user is resolved by the session probe in `sessions.ts`). The backend
 * schema is `{name, email, password}` — the form collects first/last name
 * separately, so we join them into a single `name` field here. `register` is
 * the building block for a future "invite teammate" UI.
 */

import type { User, RegisterPayload } from "@/types/user";
import type { Tenant } from "@/types/tenant";
import { apiJson } from "./http";

/** Wire shape of a user as the backend sends it (single `name` field). */
export type RawUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  /** Embedded only by `GET /api/current_user` (CON-97 §7.4) and signup. */
  tenant?: Tenant;
};

/** Maps the backend's single `name` into the UI's first/last pair. */
export function rawUserToUser(raw: RawUser): User {
  const [firstName = "", ...rest] = raw.name.split(" ");
  return {
    id: raw.id,
    firstName,
    lastName: rest.join(" "),
    email: raw.email,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    tenant: raw.tenant,
  };
}

/** `POST /api/users` — adds a user to the caller's tenant (future invite flow). */
export async function register(payload: RegisterPayload): Promise<User> {
  const raw = await apiJson<RawUser>("/api/users", "Unable to create account", {
    method: "POST",
    body: {
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      email: payload.email,
      password: payload.password,
    },
  });
  return rawUserToUser(raw);
}
