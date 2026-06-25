/**
 * Users API — in-tenant user creation.
 *
 * Since CON-97, `POST /api/users` is always authenticated and adds the new
 * user to the caller's tenant (self-service signup that bootstraps a new
 * organization goes through `services/api/tenants.ts` instead). The backend
 * schema is `{name, email, password}` — the form collects first/last name
 * separately, so we join them into a single `name` field here. `register` is
 * the building block for a future "invite teammate" UI.
 */

import type { User, RegisterPayload } from "@/types/user";
import { apiJson } from "./http";

/**
 * TODO: replace with real `GET /api/me` once the backend supports it.
 */
export async function getMe(): Promise<User> {
  const now = new Date().toISOString();
  return {
    id: "stub",
    firstName: "John",
    lastName: "Doe",
    email: "email@example.com",
    created_at: now,
    updated_at: now,
  };
}

type RawUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export async function register(payload: RegisterPayload): Promise<User> {
  const body = await apiJson<RawUser>("/api/users", "Unable to create account", {
    method: "POST",
    body: {
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      email: payload.email,
      password: payload.password,
    },
  });
  const [firstName = "", ...rest] = body.name.split(" ");
  return { ...body, firstName, lastName: rest.join(" ") };
}
