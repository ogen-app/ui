/**
 * Settings API — the backend's key/value store (`/api/settings`).
 *
 * The table is **tenant-scoped, not user-scoped**: every row carries a
 * `tenant_id` and the key alone is the primary key within it, so anything
 * written here is readable by every member of the workspace via
 * `GET /api/settings`. There is no per-user store on the API today, so
 * personal preferences namespace themselves into the key instead — see
 * `userScopedKey`. Don't put anything secret behind it.
 */

import { scopedFetch } from "./base";
import { errorMessage } from "./errors";

export type Setting = { key: string; value: string };

/**
 * Builds the key a personal preference is stored under. The parts are joined
 * with `.` and the user id comes first so a tenant's settings list groups by
 * owner; `scope` is the thing the preference is about (a campaign id), omitted
 * for account-wide preferences.
 */
export function userScopedKey(
  namespace: string,
  userId: string,
  scope?: string,
): string {
  return [namespace, userId, scope].filter(Boolean).join(".");
}

/**
 * `GET /api/settings/:key` — the stored value, or `null` when the key has
 * never been written. A missing key is the normal "no preference yet" case,
 * so it resolves rather than throwing; everything else still throws.
 */
export async function getSetting(key: string): Promise<string | null> {
  const res = await scopedFetch(`/api/settings/${encodeURIComponent(key)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await errorMessage(res, "Unable to load settings"));
  const setting = (await res.json()) as Setting;
  return setting.value;
}

/** `PUT /api/settings/:key` — creates or overwrites the value. */
export async function putSetting(key: string, value: string): Promise<void> {
  const res = await scopedFetch(`/api/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Unable to save settings"));
}
