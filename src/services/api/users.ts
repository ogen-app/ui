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
import { apiJson, apiVoid } from "./http";

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

/**
 * Body of `PUT /api/users/:id`. `name` and `email` are **both required** by
 * the server even when only one of them changed, and even when the real
 * subject of the call is the password — so every caller has to send the
 * user's current values alongside whatever it is actually changing.
 *
 * `password` is optional; when present the server hashes and stores it with
 * no further checks. See `updateUser` for what that means for the caller.
 */
export type UpdateUserPayload = {
  name: string;
  email: string;
  password?: string;
};

/**
 * `PUT /api/users/:id` — updates the signed-in user's own record.
 *
 * Authorized by `requireSelf` on the server: the session's user id must equal
 * the path id, so this can only ever edit yourself (403 otherwise).
 *
 * **It does not ask for the current password, and it does not revoke other
 * sessions.** Both are server-side gaps (CON-193), and both matter to whoever
 * calls this with a `password`: without the first, any live session can
 * replace the credential; without the second, a password change leaves every
 * other session logged in. The UI compensates for the first by re-authenticating
 * through `POST /api/sessions` before it calls this — see
 * `useChangePassword` — which is a lock on our own door, not on the endpoint.
 * Nothing the client can do substitutes for the second.
 */
export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<User> {
  const raw = await apiJson<RawUser>(`/api/users/${id}`, "Unable to save your profile", {
    method: "PUT",
    body: payload,
  });
  return rawUserToUser(raw);
}

/**
 * `DELETE /api/users/:id` — deletes the signed-in user's own account.
 *
 * Also `requireSelf`-gated, and irreversible in a way the name understates:
 * the row is hard-deleted and the schema cascades from `users.id` into
 * `sessions`, `tags`, `campaigns`, `assets`, `posts` and `post_attachments`
 * via `ON DELETE CASCADE` on `created_by`. Everything this user created is
 * destroyed with them, including from under their colleagues in a shared
 * workspace. The tenant row itself has no such link and survives, so deleting
 * the last member leaves the workspace standing but unreachable.
 *
 * Callers must state that plainly before asking for confirmation.
 */
export async function deleteUser(id: string): Promise<void> {
  await apiVoid(`/api/users/${id}`, "Unable to delete your account", {
    method: "DELETE",
  });
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
