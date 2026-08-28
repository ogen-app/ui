import type { Tenant } from "./tenant";
import type { WorkspaceRole } from "./workspace";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /**
   * Authority in the user's one workspace (CON-26). Read from
   * `GET /api/current_user` at every boot, and used only to decide which
   * controls to show — the server gates the actions themselves, so a stale or
   * edited copy in the persisted store grants nothing.
   */
  role: WorkspaceRole;
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
