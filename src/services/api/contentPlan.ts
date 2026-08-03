import type { DraftPlanStreamHandlers } from "@/types/contentPlan";
import { readSSEStream } from "@/lib/sse";
import { beginLocalRun } from "@/lib/localRuns";
import { errorMessage } from "./errors";
import { apiUrl } from "./base";

const FALLBACK_ERROR = "Unable to generate a content plan";

/**
 * Thrown from the frame handler to stop reading once the terminal `complete`
 * has landed, and caught immediately below. The server closes the stream
 * itself, but a plan can take minutes and there is no reason to keep the read
 * pending on a connection with nothing left to say.
 */
const COMPLETE = Symbol("draft-plan-complete");

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

  // The hub announces `content_plan_completed` for this run too. The caller is
  // watching the stream below and reacting to each `post` as it lands, so the
  // broadcast copy is muted while the run is ours (CON-134).
  const endLocalRun = beginLocalRun("contentPlan", campaignId);

  let completed = false;
  try {
    await readSSEStream(res.body, ({ event, data }) => {
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
          throw COMPLETE;
        case "error": {
          const payload = JSON.parse(data) as { message?: string };
          throw new Error(payload.message || FALLBACK_ERROR);
        }
      }
    });
  } catch (err) {
    if (err !== COMPLETE) throw err;
  } finally {
    endLocalRun();
  }
  if (!completed) throw new Error("Generation was interrupted before completing");
}
