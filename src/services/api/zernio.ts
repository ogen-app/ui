import {
  ZernioError,
  type ConnectLinkResponse,
  type ZernioAccountsResponse,
  type ZernioErrorCode,
  type ZernioHealth,
} from "@/types/integrations";
import { apiUrl } from "./base";
import { errorMessage } from "./errors";

const BASE = apiUrl("/api/integrations/zernio");

export async function getZernioHealth(): Promise<ZernioHealth> {
  const res = await fetch(`${BASE}/health`, { method: "GET", credentials: "include" });
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Unable to fetch Zernio health"));
  }
  return (await res.json()) as ZernioHealth;
}

export async function listZernioAccounts(): Promise<ZernioAccountsResponse> {
  const res = await fetch(`${BASE}/accounts`, { method: "GET", credentials: "include" });
  if (!res.ok) {
    throw await zernioError(res, "Unable to fetch Zernio accounts");
  }
  return (await res.json()) as ZernioAccountsResponse;
}

export async function createConnectLink(platform: string): Promise<ConnectLinkResponse> {
  const res = await fetch(`${BASE}/connect-links`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });
  if (!res.ok) {
    throw await zernioError(res, "Unable to create connect link");
  }
  return (await res.json()) as ConnectLinkResponse;
}

/**
 * Disconnects one social account (CON-133): removed upstream on Zernio, then
 * soft-deleted locally so the next sync doesn't revive it.
 *
 * Scoped to a single account, not a platform — a workspace can hold several
 * accounts per platform (CON-150) and the endpoint takes an account id.
 *
 * Without `force` the server refuses with 409 when scheduled posts still
 * publish as this account, and says how many. That count is the only way the
 * UI can know it, so the confirm dialog is deliberately a two-step: try, then
 * show what would break and offer to force.
 */
export async function disconnectZernioAccount(id: string, force = false): Promise<void> {
  const query = force ? "?force=true" : "";
  const res = await fetch(`${BASE}/accounts/${encodeURIComponent(id)}${query}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    throw await zernioError(res, "Unable to disconnect the account");
  }
}

export async function triggerZernioSync(): Promise<void> {
  const res = await fetch(`${BASE}/sync`, { method: "POST", credentials: "include" });
  if (!res.ok && res.status !== 202) {
    throw await zernioError(res, "Unable to trigger sync");
  }
}

const KNOWN_CODES: ReadonlySet<ZernioErrorCode> = new Set<ZernioErrorCode>([
  "integration_disabled",
  "integration_degraded",
  "rate_limited",
  "invalid_platform",
  "account_not_found",
  "account_has_scheduled_posts",
]);

/**
 * The disconnect guard's 409 carries a count next to the code. Read from a
 * clone so `errorMessage` still owns extracting the message from the original
 * body — a response body can only be consumed once.
 */
async function scheduledPostCount(res: Response): Promise<number | undefined> {
  try {
    const body = (await res.clone().json()) as { scheduledPosts?: unknown };
    return typeof body.scheduledPosts === "number" ? body.scheduledPosts : undefined;
  } catch {
    return undefined;
  }
}

async function zernioError(res: Response, fallback: string): Promise<ZernioError> {
  const scheduledPosts = await scheduledPostCount(res);
  const msg = await errorMessage(res, fallback);
  const code: ZernioErrorCode = KNOWN_CODES.has(msg as ZernioErrorCode)
    ? (msg as ZernioErrorCode)
    : "unknown";
  let retryAfterSeconds: number | undefined;
  const retryAfter = res.headers.get("Retry-After");
  if (retryAfter) {
    const n = parseInt(retryAfter, 10);
    if (Number.isFinite(n) && n > 0) retryAfterSeconds = n;
  }
  return new ZernioError(code, res.status, msg, { retryAfterSeconds, scheduledPosts });
}
