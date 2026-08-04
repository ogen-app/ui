import { describe, expect, it } from "vitest";
import type { Platform, PublisherAccount } from "@/types/campaigns";
import {
  PLATFORMS,
  buildPlatformView,
  buildPlatformViews,
  connectedAccounts,
  getPlatformInfo,
  getPostTypeLabel,
  isHiddenPlatform,
  selectablePostTypes,
} from "./platformDictionary.ts";

// Sqids from the dictionary itself.
const YOUTUBE = "8S8bWQTG6qD";
const INSTAGRAM = "rzgpTkARLH0L";
const LINKEDIN = "AXqWG7U2qnpt";

function makePlatform(id: string, supported: string[]): Platform {
  return {
    id,
    name: "whatever the API calls it",
    post_types: {},
    cadence: "",
    constraints: "",
    text_constraints: { max_content_chars: 0, max_title_chars: 0 },
    video_constraints: {
      max_file_size_bytes: 0,
      allowed_formats: [],
      max_duration_seconds: 0,
      min_duration_seconds: 0,
      max_width: 0,
      max_height: 0,
      allowed_aspect_ratios: [],
      max_attachments_per_post: 0,
      requires_video_title: false,
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    publishers: [
      {
        id: "pub1",
        name: "Zernio",
        state: "ok",
        connected: true,
        supported_post_types: supported,
        accounts: [],
      },
    ],
  };
}

// Both gates are front-end-only and land in one file, so this is where they
// are pinned. CON-145 moves them server-side; when it does, these go.
describe("the YouTube gate", () => {
  it("keeps YouTube out of the offered platforms", () => {
    expect(PLATFORMS.some((p) => p.zernioId === "youtube")).toBe(false);
    expect(isHiddenPlatform(YOUTUBE)).toBe(true);
  });

  it("still resolves it for display, so an existing post is not blank", () => {
    expect(getPlatformInfo(YOUTUBE)?.name).toBe("YouTube");
    expect(getPostTypeLabel(YOUTUBE, "short")).toBe("Short");
  });

  it("drops it from the views even though the API returns it", () => {
    const views = buildPlatformViews([
      makePlatform(YOUTUBE, ["video"]),
      makePlatform(INSTAGRAM, ["image-post"]),
    ]);
    expect(views.map((v) => v.info.zernioId)).toEqual(["instagram"]);
  });
});

describe("the video gate", () => {
  it("withholds video formats from every platform's selectable types", () => {
    for (const info of PLATFORMS) {
      expect(selectablePostTypes(info).some((pt) => pt.video)).toBe(false);
    }
  });

  it("keeps the formats that merely carry media", () => {
    const instagram = getPlatformInfo(INSTAGRAM)!;
    const slugs = selectablePostTypes(instagram).map((pt) => pt.slug);
    expect(slugs).toContain("carousel");
    expect(slugs).toContain("story");
    expect(slugs).not.toContain("reel");
  });

  it("filters them out of a view even when a publisher supports them", () => {
    const [view] = buildPlatformViews([
      makePlatform(INSTAGRAM, ["image-post", "reel", "carousel"]),
    ]);
    expect(view.allowed.map((pt) => pt.slug)).toEqual(["image-post", "carousel"]);
    expect(view.available.map((pt) => pt.slug)).toEqual(["image-post", "carousel"]);
  });

  it("still labels one on a post that already has it", () => {
    expect(getPostTypeLabel(INSTAGRAM, "reel")).toBe("Reel");
  });
});

function account(id: string): PublisherAccount {
  return {
    id,
    username: id,
    display_name: id,
    avatar_url: "",
    is_active: true,
    connected_at: "2026-01-01T00:00:00Z",
  };
}

function linkedInView(accounts: PublisherAccount[]) {
  const platform: Platform = {
    id: LINKEDIN,
    name: "LinkedIn",
    post_types: {},
    cadence: "",
    constraints: "",
    text_constraints: { max_content_chars: 3000, max_title_chars: 0 },
    video_constraints: {
      max_file_size_bytes: 0,
      allowed_formats: [],
      max_duration_seconds: 0,
      min_duration_seconds: 0,
      max_width: 0,
      max_height: 0,
      allowed_aspect_ratios: [],
      max_attachments_per_post: 0,
      requires_video_title: false,
    },
    created_at: "",
    updated_at: "",
    publishers: [
      {
        id: "zernio",
        name: "Zernio",
        state: "ok",
        // Mirrors the server: a publisher is connected once it holds any
        // account (`len(accounts) > 0` in src/handlers/platforms.go).
        connected: accounts.length > 0,
        supported_post_types: [],
        accounts,
      },
    ],
  };
  const info = getPlatformInfo(LINKEDIN);
  if (!info) throw new Error("LinkedIn missing from the dictionary");
  return buildPlatformView(platform, info);
}

describe("connectedAccounts", () => {
  it("counts accounts, not publishers", () => {
    // The bug this replaced: `connectedPublishers.length` is 1 here too, so
    // a second and third account were invisible to every caller that used it.
    const three = linkedInView([account("acc-1"), account("acc-2"), account("acc-3")]);
    expect(three.connectedPublishers).toHaveLength(1);
    expect(connectedAccounts(three)).toHaveLength(3);
  });

  it("is empty when nothing is connected", () => {
    const none = linkedInView([]);
    expect(none.connectedPublishers).toHaveLength(0);
    expect(connectedAccounts(none)).toEqual([]);
  });

  it("ignores accounts on a publisher that is not connected", () => {
    const stale = linkedInView([account("acc-1")]);
    stale.connectedPublishers = [];
    expect(connectedAccounts(stale)).toEqual([]);
  });
});
