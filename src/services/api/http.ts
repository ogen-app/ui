import { handleUnauthorized } from "@/lib/sessionExpiry";
import { apiUrl } from "./base";
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
  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
  };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
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
