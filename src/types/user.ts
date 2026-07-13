import type { Tenant } from "./tenant";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  created_at: string;
  updated_at: string;
  /**
   * The user's organization (CON-97: exactly one tenant per user). Present
   * when the user was hydrated from `GET /api/current_user` or signup;
   * absent on plain `/api/users` payloads.
   */
  tenant?: Tenant;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};
