import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPostAnalytics,
  isMeasured,
  isNotPublishedViaPublisher,
  isPending,
  isPostAnalyticsUnavailable,
} from "./postAnalytics";
import type { PostAnalyticsSnapshot } from "@/types/analytics";

/**
 * The executable statement of the `GET /api/posts/:id/analytics` contract
 * (CON-93 FR4, `handlers/posts.go`).
 *
 * The endpoint has answered since CON-93 and nothing has ever called it, so
 * everything below was read off the Go handler rather than off a running
 * server — the same standing as `analytics.test.ts`. What it pins is the five
 * answers and the two that are easiest to get wrong: `pending` is a 200 and
 * not an error, and the 503's message is *not* the one `/api/analytics/posts`
 * sends.
 *
 * The snapshot body is shaped like the Go struct rather than minimised, so a
 * field renamed on the wire fails here instead of in a card.
 */

function stubFetch(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The thrown error, so a predicate can be asserted against it directly. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the request to reject");
}

const SNAPSHOT: PostAnalyticsSnapshot = {
  post_id: "p1",
  publisher: "zernio",
  publisher_post_id: "z1",
  sync_status: "synced",
  metrics_last_updated: "2026-08-29T18:00:00Z",
  last_refreshed_at: "2026-08-30T09:00:00Z",
  analytics: {
    impressions: 5100,
    reach: 4200,
    likes: 84,
    comments: 12,
    shares: 6,
    saves: 0,
    clicks: 31,
    views: 0,
    engagement_rate: 0.0243,
  },
  platform_analytics: [
    {
      platform: "linkedin",
      status: "ok",
      platform_post_id: "urn:li:share:1",
      account_id: "zernio-acct-1",
      account_username: "ogen",
      platform_post_url: "https://www.linkedin.com/feed/update/urn:li:share:1",
      sync_status: "synced",
      analytics: {
        impressions: 5100,
        reach: 4200,
        likes: 84,
        comments: 12,
        shares: 6,
        saves: 0,
        clicks: 31,
        views: 0,
        engagement_rate: 0.0243,
      },
    },
  ],
};

describe("fetchPostAnalytics", () => {
  it("asks the post, not the analytics prefix", async () => {
    const fetchMock = stubFetch(jsonResponse(200, SNAPSHOT));

    const answer = await fetchPostAnalytics("p1");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/posts/p1/analytics");
    expect(isMeasured(answer)).toBe(true);
    // The headline block is Zernio's own, copied beside the row rather than
    // summed from it — so it is read from the top level, never rebuilt.
    expect(isMeasured(answer) && answer.analytics.reach).toBe(4200);
  });

  it("carries one platform row, and the identity is only on it", async () => {
    // An Ogen post has one platform and one account (`models/post.go`), so this
    // array is a sidecar of facts about that publication rather than a
    // breakdown. `account_username` and `platform_post_url` exist nowhere else.
    stubFetch(jsonResponse(200, SNAPSHOT));

    const answer = await fetchPostAnalytics("p1");
    const row = isMeasured(answer) ? answer.platform_analytics[0] : undefined;

    expect(row?.account_username).toBe("ogen");
    expect(row?.platform_post_url).toContain("linkedin.com");
    // Zernio's account id, not our `social_account_id`. Sending this one to our
    // connections screen names an account it has never heard of.
    expect(row?.account_id).toBe("zernio-acct-1");
  });

  it("reads not-measured-yet as a 200 to wait in, not an error", async () => {
    // Built for polling (CON-93 §10): the post is published through the
    // publisher and the refresh sweep has not reached it. A client that treats
    // this as a failure shows an error on every post for its first hour.
    stubFetch(jsonResponse(200, { status: "pending", post_id: "p1" }));

    const answer = await fetchPostAnalytics("p1");

    expect(isPending(answer)).toBe(true);
    expect(isMeasured(answer)).toBe(false);
  });

  it("reads a post that never went out through a publisher as a 409", async () => {
    // The normal answer for a draft. The body carries `code`, but
    // `errorMessage` keeps only the prose, so the status is what a caller can
    // actually branch on.
    stubFetch(
      jsonResponse(409, {
        code: "not_published_via_publisher",
        error: "post has not been published through a publisher",
      }),
    );

    expect(
      isNotPublishedViaPublisher(await rejection(fetchPostAnalytics("p1"))),
    ).toBe(true);
  });

  it("keeps its own 503 message apart from the one /analytics/posts sends", async () => {
    // "post analytics is not available" here, "analytics is not available"
    // there. One condition, two strings — so `isAnalyticsUnavailable` does not
    // match this and a screen reading both endpoints needs both predicates.
    stubFetch(jsonResponse(503, { error: "post analytics is not available" }));

    expect(
      isPostAnalyticsUnavailable(await rejection(fetchPostAnalytics("p1"))),
    ).toBe(true);
  });

  it("does not read a gateway 503 as a missing analytics database", async () => {
    stubFetch(jsonResponse(503, { error: "Service Unavailable" }));

    expect(
      isPostAnalyticsUnavailable(await rejection(fetchPostAnalytics("p1"))),
    ).toBe(false);
  });

  it("leaves a missing post as a plain failure", async () => {
    stubFetch(jsonResponse(404, { error: "post not found" }));

    await expect(fetchPostAnalytics("p1")).rejects.toThrow("post not found");
  });
});
