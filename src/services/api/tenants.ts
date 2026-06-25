/**
 * Tenants API — self-service signup (CON-97).
 *
 * `POST /api/tenants` is public: it atomically creates an organization
 * (tenant) and its first admin user, then opens a session. The backend sets
 * the HTTPOnly session cookie on the response, so the caller is authenticated
 * immediately and needs no separate login. The backend schema is
 * `{ tenant: { name }, user: { name, email, password } }` — the form collects
 * first/last name separately, so we join them into a single `name` here.
 */

import type { User } from "@/types/user";
import type { SignupPayload, Tenant } from "@/types/tenant";
import { apiJson } from "./http";

type RawSignupResponse = {
  tenant: Tenant;
  user: {
    id: string;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
  session: { id: string; user_id: string; expires_at: string };
};

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
  const [firstName = "", ...rest] = body.user.name.split(" ");
  return {
    id: body.user.id,
    firstName,
    lastName: rest.join(" "),
    email: body.user.email,
    created_at: body.user.created_at,
    updated_at: body.user.updated_at,
  };
}
