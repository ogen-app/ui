import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeUnavailable,
  fetchAnalyticsOverview,
  fetchLearnings,
  fetchPerformers,
  hasHistory,
  isAnalyticsUnavailable,
} from "./analytics";
import type {
  AnalyticsLearnings,
  AnalyticsOverview,
  PerformersBoard,
} from "@/types/analytics";

/**
 * The executable statement of the CON-236–239 dashboard contract.
 *
 * These endpoints exist — they landed on the Go side on 2026-08-27 — but the
 * feature that reads them is still behind `campaign-analytics`, so nothing has
 * been exercised against a running server. What this file pins is what was read
 * off the handlers: the paths, the query-parameter *names* (`trend_window`, not
 * `trendWindow`), the envelope every one of them answers in, and the three
 * degradations a caller has to get right — `no_data`, a null multiplier, and a
 * learnings section that withdraws on its own.
 *
 * The bodies below are shaped like the Go structs rather than minimised, so a
 * field renamed on the wire fails here rather than in a component.
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

const OVERVIEW: AnalyticsOverview = {
  window: { from: "2026-07-31", to: "2026-08-27", days: 28, granularity: "day" },
  updated_at: "2026-08-27T09:00:00Z",
  cards: [
    {
      metric: "reach",
      label: "Cumulative reach",
      value: 18420,
      delta_pct: 12.4,
      direction: "up",
      baseline: "insufficient_history",
      sparkline: [0, 900, 18420],
    },
  ],
  series: {
    reach: {
      buckets: ["2026-07-31", "2026-08-01", "2026-08-02"],
      current: [0, 900, 18420],
      previous: [0, 400, 16000],
    },
    interactions: { buckets: [], current: [], previous: [] },
    engagement_rate: { buckets: [], current: [], previous: [] },
    followers: { buckets: [], current: [], previous: [] },
    posts_published: { buckets: [], current: [], previous: [] },
  },
  insights: [
    { id: "rate_vs_reach", severity: "info", text: "Reach grew faster than interactions." },
  ],
};

describe("fetchAnalyticsOverview", () => {
  it("asks for a relative window and unwraps the envelope", async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { available: true, data: OVERVIEW }),
    );

    const envelope = await fetchAnalyticsOverview({ window: "28d" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/overview?window=28d");
    expect(envelope.data?.cards[0].metric).toBe("reach");
    // Already a percentage, not a fraction — a client that multiplies by 100
    // here prints 1240%.
    expect(envelope.data?.cards[0].delta_pct).toBe(12.4);
  });

  it("sends an explicit range as two inclusive dates", async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { available: true, data: OVERVIEW }),
    );

    await fetchAnalyticsOverview({ from: "2026-07-22", to: "2026-08-19" });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/analytics/overview?from=2026-07-22&to=2026-08-19",
    );
  });

  it("defaults nothing — an empty query names no window at all", async () => {
    // The server's default window ends *today* by its own clock. A client that
    // filled one in would disagree with it for an hour either side of midnight
    // UTC, and would keep disagreeing after the server changed its mind.
    const fetchMock = stubFetch(
      jsonResponse(200, { available: true, data: OVERVIEW }),
    );

    await fetchAnalyticsOverview();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/analytics/overview");
  });

  it("reads a workspace with nothing published as a state, not a failure", async () => {
    stubFetch(jsonResponse(200, { available: false, reason: "no_data", data: null }));

    const envelope = await fetchAnalyticsOverview();

    expect(envelope.reason).toBe("no_data");
    expect(envelopeUnavailable(envelope)).toBe(true);
  });

  it("surfaces a rejected range as the server's code", async () => {
    // The body is `{"error": "invalid_range"}` — a machine code, no prose. It
    // must never be shown to a reader as-is.
    stubFetch(jsonResponse(400, { error: "invalid_range" }));

    await expect(fetchAnalyticsOverview({ from: "2026-08-19", to: "2026-07-22" }))
      .rejects.toThrow("invalid_range");
  });
});

const ROW: PerformersBoard["best"][number] = {
  post_id: "p1",
  publisher_post_id: "z1",
  title: "How we cut our render time in half",
  platform: "linkedin",
  account: { id: "a1", username: "ogen", display_name: "ogen" },
  reach: 4200,
  reach_still_accruing: true,
  period_share: 0.2281,
  metrics: {
    impressions: 5100,
    likes: 84,
    comments: 12,
    shares: 6,
    engagement_rate: 0.0243,
  },
  against_typical: 1.8,
  direction: "above",
  published_at: "2026-08-25T08:00:00Z",
  age_days: 2,
};

describe("fetchPerformers", () => {
  it("names the ranking basis, the per-list limit and the platform slug", async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, {
        available: true,
        data: {
          window: { from: "2026-07-31", to: "2026-08-27", days: 28 },
          updated_at: "2026-08-27T09:00:00Z",
          by: "engagement_rate",
          total_posts: 9,
          best: [ROW],
          worst: [],
          insights: [],
        } satisfies PerformersBoard,
      }),
    );

    const envelope = await fetchPerformers({
      by: "engagement_rate",
      limit: 10,
      platform: "linkedin",
      window: "90d",
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/analytics/performers?window=90d&by=engagement_rate&limit=10&platform=linkedin",
    );
    // `limit` is per list, so ten asked for is up to twenty rows back.
    expect(envelope.data?.by).toBe("engagement_rate");
    expect(envelope.data?.total_posts).toBe(9);
  });

  it("carries the platform on the row, not on the account", async () => {
    // The account block is `{id, username, display_name, avatar_url}` and every
    // field of it is omitted when empty. A row's platform mark has to be read
    // one level up or it silently disappears.
    stubFetch(
      jsonResponse(200, {
        available: true,
        data: {
          window: { from: "2026-07-31", to: "2026-08-27", days: 28 },
          updated_at: "2026-08-27T09:00:00Z",
          by: "against_typical",
          total_posts: 1,
          best: [ROW],
          worst: [],
          insights: [],
        },
      }),
    );

    const row = (await fetchPerformers()).data?.best[0];

    expect(row?.platform).toBe("linkedin");
    expect(row?.account).not.toHaveProperty("platform");
    expect(row?.account.avatar_url).toBeUndefined();
  });

  it("reads a missing multiplier as unrankable, never as zero", async () => {
    // A platform with fewer than three measured posts has no curve, so the row
    // comes back with a null multiplier and a baseline instead of a direction.
    // Treating that null as 0 would sort the post to the bottom of every list
    // for a reason that has nothing to do with the post.
    stubFetch(
      jsonResponse(200, {
        available: true,
        data: {
          window: { from: "2026-07-31", to: "2026-08-27", days: 28 },
          updated_at: "2026-08-27T09:00:00Z",
          by: "against_typical",
          total_posts: 1,
          best: [
            {
              ...ROW,
              against_typical: null,
              direction: undefined,
              baseline: "insufficient_history",
            },
          ],
          worst: [],
          insights: [],
        },
      }),
    );

    const row = (await fetchPerformers()).data?.best[0];

    expect(row?.against_typical).toBeNull();
    expect(row?.baseline).toBe("insufficient_history");
    expect(row?.direction).toBeUndefined();
  });

  it("surfaces an unknown ranking basis as the server's code", async () => {
    stubFetch(jsonResponse(400, { error: "invalid_sort" }));

    await expect(fetchPerformers()).rejects.toThrow("invalid_sort");
  });
});

describe("fetchLearnings", () => {
  it("sends the trend window under its wire name", async () => {
    const learnings: AnalyticsLearnings = {
      scope: {
        since: "2026-01-01",
        trend_window_days: 180,
        measured_posts: 42,
        settled_posts: 30,
        metric: "saves",
      },
      updated_at: "2026-08-27T09:00:00Z",
      heatmap: {
        metric: "saves",
        cells: [
          { day_of_week: 2, hour: 10, score: 1, post_count: 4, median: 900 },
        ],
        strongest: { day_of_week: 2, hour: 10, post_count: 4 },
        measured_posts: 42,
      },
      lifespan: {
        settled_posts: 30,
        t50_hours: 6,
        t75_hours: 22,
        t95_hours: 70,
        horizon_hours: 168,
        curve: [{ age_hours: 1, share_of_final: 0.18 }],
      },
      patterns: { works: [], fading: [] },
    };
    const fetchMock = stubFetch(
      jsonResponse(200, { available: true, data: learnings }),
    );

    const envelope = await fetchLearnings({
      since: "2026-01-01",
      trendWindow: "6mo",
      metric: "saves",
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/analytics/learnings?since=2026-01-01&trend_window=6mo&metric=saves",
    );
    // Sunday is 0, as on /best-times — a Monday-first grid drawn straight off
    // these indices is wrong by a day.
    const heatmap = envelope.data!.heatmap;
    expect(hasHistory(heatmap) && heatmap.cells[0].day_of_week).toBe(2);
  });

  it("lets one section withdraw while the others answer", async () => {
    stubFetch(
      jsonResponse(200, {
        available: true,
        data: {
          scope: {
            since: null,
            trend_window_days: 90,
            measured_posts: 6,
            settled_posts: 0,
            metric: "reach",
          },
          updated_at: "2026-08-27T09:00:00Z",
          heatmap: {
            metric: "reach",
            cells: [],
            measured_posts: 6,
          },
          lifespan: { insufficient_history: true },
          patterns: { insufficient_history: true },
        },
      }),
    );

    const data = (await fetchLearnings()).data!;

    expect(hasHistory(data.heatmap)).toBe(true);
    expect(hasHistory(data.lifespan)).toBe(false);
    expect(hasHistory(data.patterns)).toBe(false);
    expect(data.scope.since).toBeNull();
  });

  it("surfaces a rejected parameter as the server's code", async () => {
    stubFetch(jsonResponse(400, { error: "invalid_param" }));

    await expect(fetchLearnings()).rejects.toThrow("invalid_param");
  });
});

describe("the two kinds of unavailable", () => {
  it("keeps the /posts 503 apart from the dashboard's envelope", async () => {
    // `/posts` is the only endpoint here that still says "no analytics
    // database" with a status code. The dashboard says it in the body, at 200 —
    // so a screen reading both has to ask two different questions.
    stubFetch(jsonResponse(200, { available: false, reason: "not_configured", data: null }));

    const envelope = await fetchAnalyticsOverview();

    expect(envelopeUnavailable(envelope)).toBe(true);
    expect(isAnalyticsUnavailable(envelope)).toBe(false);
  });
});
