import { handleUnauthorized } from "@/lib/sessionExpiry";
import { handleForbidden } from "@/lib/staleWorkspace";
import { apiUrl, workspaceHeader } from "./base";
import { ApiError, errorMessage } from "./errors";

type ApiRequestOptions = {
  method?: string;
  /** Serialized as a JSON body; also sets the `Content-Type` header. */
  body?: unknown;
};

async function send(
  path: string,
  fallbackError: string,
  options: ApiRequestOptions
): Promise<Response> {
  // Which workspace this request acts in, when the path is one that acts in a
  // workspace at all. Empty unless `multi-workspace` is on — see
  // `workspaceHeader`.
  const scope = workspaceHeader(path);
  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers: { ...scope },
  };
  if (options.body !== undefined) {
    init.headers = { ...scope, "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }
  const res = await fetch(apiUrl(path), init);
  if (!res.ok) {
    // A 401 from an in-app request means the session died under us — recover
    // globally rather than letting each caller render "authentication
    // required" as if it were a problem with what the user just did. The
    // throw still happens so the caller's own error path stays intact while
    // the reload is in flight. See `lib/sessionExpiry.ts`.
    if (res.status === 401) handleUnauthorized();
    // A 403 on a request that named a workspace *may* mean this tab is pinned
    // to one it no longer belongs to. `handleForbidden` checks before it acts,
    // because 403 is also the ordinary answer to a member calling an
    // owner-only route. See `lib/staleWorkspace.ts`.
    if (res.status === 403 && "X-Workspace-Id" in scope) handleForbidden();
    throw new ApiError(res.status, await errorMessage(res, fallbackError));
  }
  return res;
}

/**
 * Performs a credentialed JSON API request and returns the parsed body as `T`.
 * On a non-OK response it throws an `Error` carrying the backend's message
 * (or `fallbackError` when the body has none).
 */
export async function apiJson<T>(
  path: string,
  fallbackError: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const res = await send(path, fallbackError, options);
  return (await res.json()) as T;
}

/**
 * Performs a credentialed API request that returns no body (e.g. `DELETE`).
 * Throws on a non-OK response, otherwise resolves once the request completes.
 */
export async function apiVoid(
  path: string,
  fallbackError: string,
  options: ApiRequestOptions = {}
): Promise<void> {
  await send(path, fallbackError, options);
}
