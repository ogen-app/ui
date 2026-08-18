import {
  ZernioError,
  type ConnectLinkResponse,
  type PendingConnection,
  type ZernioAccountsResponse,
  type ZernioErrorCode,
  type ZernioHealth,
} from "@/types/integrations";
import { scopedFetch } from "./base";
import { errorMessage } from "./errors";

/** Path, not URL: `scopedFetch` resolves the origin and names the workspace. */
const BASE = "/api/integrations/zernio";

export async function getZernioHealth(): Promise<ZernioHealth> {
  const res = await scopedFetch(`${BASE}/health`);
  if (!res.ok) {
    throw new Error(await errorMessage(res, "Unable to fetch Zernio health"));
  }
  return (await res.json()) as ZernioHealth;
}

export async function listZernioAccounts(): Promise<ZernioAccountsResponse> {
  const res = await scopedFetch(`${BASE}/accounts`);
  if (!res.ok) {
    throw await zernioError(res, "Unable to fetch Zernio accounts");
  }
  return (await res.json()) as ZernioAccountsResponse;
}

export async function createConnectLink(platform: string): Promise<ConnectLinkResponse> {
  const res = await scopedFetch(`${BASE}/connect-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  });
  if (!res.ok) {
    throw await zernioError(res, "Unable to create connect link");
  }
  return (await res.json()) as ConnectLinkResponse;
}

/**
 * The targets awaiting a choice on a pending connect (CON-217).
 *
 * Reached only by following the backend's redirect after an OAuth that turned
 * out to have more than one publishable destination. A 404 covers every way
 * this can be over — expired, already used, someone else's — and is the normal
 * end of an abandoned connect, not an exceptional failure.
 */
export async function getPendingConnection(id: string): Promise<PendingConnection> {
  const res = await scopedFetch(`${BASE}/connect/pending/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw await zernioError(res, "Unable to load the pending connection");
  }
  return (await res.json()) as PendingConnection;
}

/**
 * Finalizes a pending connect by attaching the chosen target (CON-217).
 *
 * The account itself doesn't come back in the response: the server hands the
 * selection to Zernio and nudges its sync worker, and the account appears in
 * the platform list a few seconds later. Callers wait for that rather than for
 * this promise.
 */
export async function selectPendingTarget(id: string, targetId: string): Promise<void> {
  const res = await scopedFetch(`${BASE}/connect/pending/${encodeURIComponent(id)}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetId }),
  });
  if (!res.ok) {
    throw await zernioError(res, "Unable to finish connecting the account");
  }
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
  const res = await scopedFetch(`${BASE}/accounts/${encodeURIComponent(id)}${query}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw await zernioError(res, "Unable to disconnect the account");
  }
}

export async function triggerZernioSync(): Promise<void> {
  const res = await scopedFetch(`${BASE}/sync`, { method: "POST" });
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
  "connection_not_found",
  "invalid_target",
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
