import type { DraftPlanStreamHandlers } from "@/types/contentPlan";
import { errorMessage } from "./errors";
import { apiUrl } from "./base";

const FALLBACK_ERROR = "Unable to generate a content plan";

type SSEMessage = { event: string; data: string };

/**
 * Incremental parser for a `text/event-stream` body. Feed it decoded chunks;
 * it yields complete messages as they close (blank line). Only the `event:`
 * and `data:` fields are used — that is all the backend emits.
 */
function createSSEParser(onMessage: (msg: SSEMessage) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trim());
      }
      if (data.length > 0) onMessage({ event, data: data.join("\n") });
    }
  };
}

/**
 * Runs AI draft-plan generation for a campaign and streams progress.
 *
 * `POST /api/campaigns/:id/generate-draft` answers with an SSE stream:
 * `step` / `post` / `warning` events during generation, then a terminal
 * `complete` or `error`. Each `post` event's row is already persisted, so
 * callers can refetch the posts list as events arrive. The returned promise
 * resolves on `complete` and rejects on an `error` event, a non-OK response
 * (validation 400s arrive pre-stream), or a prematurely closed stream.
 */
export async function streamDraftPlan(
  campaignId: string,
  handlers: DraftPlanStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(apiUrl(`/api/campaigns/${campaignId}/generate-draft`), {
    method: "POST",
    credentials: "include",
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(await errorMessage(res, FALLBACK_ERROR));
  }

  let streamError: string | null = null;
  let completed = false;
  const parse = createSSEParser(({ event, data }) => {
    switch (event) {
      case "step":
        handlers.onStep?.(JSON.parse(data));
        break;
      case "post":
        handlers.onPost?.(JSON.parse(data));
        break;
      case "warning":
        handlers.onWarning?.(JSON.parse(data));
        break;
      case "complete":
        completed = true;
        handlers.onComplete?.(JSON.parse(data));
        break;
      case "error": {
        const payload = JSON.parse(data) as { message?: string };
        streamError = payload.message || FALLBACK_ERROR;
        break;
      }
    }
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parse(decoder.decode(value, { stream: true }));
      if (streamError) throw new Error(streamError);
      if (completed) return;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (streamError) throw new Error(streamError);
  if (!completed) throw new Error("Generation was interrupted before completing");
}
