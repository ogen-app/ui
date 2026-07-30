import { describe, expect, it } from "vitest";
import type { Platform } from "@/types/campaigns";
import {
  PLATFORMS,
  buildPlatformViews,
  getPlatformInfo,
  getPostTypeLabel,
  isHiddenPlatform,
  selectablePostTypes,
} from "./platformDictionary.ts";

// Sqids from the dictionary itself.
const YOUTUBE = "8S8bWQTG6qD";
const INSTAGRAM = "rzgpTkARLH0L";

function makePlatform(id: string, supported: string[]): Platform {
  return {
    id,
    name: "whatever the API calls it",
    post_types: {},
    cadence: "",
    constraints: "",
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
