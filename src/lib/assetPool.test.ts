import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  filterAssetPool,
  isFiltered,
  type AssetPoolFilters,
} from "./assetPool";
import type { Asset } from "@/types/content";

function asset(overrides: Partial<Asset> & Pick<Asset, "id">): Asset {
  return {
    title: "Untitled",
    content: "",
    status: "ready",
    type: "MD",
    tag_ids: [],
    tags: [],
    created_by: "u1",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

const filters = (patch: Partial<AssetPoolFilters> = {}): AssetPoolFilters => ({
  ...EMPTY_FILTERS,
  ...patch,
});

const BANK: Asset[] = [
  asset({
    id: "pricing",
    title: "Pricing model 2026",
    tag_ids: ["t-pricing"],
    updated_at: "2026-07-20T00:00:00Z",
  }),
  asset({
    id: "research",
    title: "Enterprise research",
    type: "PDF",
    tag_ids: ["t-research"],
    updated_at: "2026-07-25T00:00:00Z",
  }),
  asset({
    id: "voice",
    title: "Brand voice guide",
    tag_ids: ["t-brand", "t-pricing"],
    updated_at: "2026-07-10T00:00:00Z",
  }),
];

const ids = (assets: Asset[]) => assets.map((a) => a.id);

describe("filterAssetPool", () => {
  it("sorts by recency by default", () => {
    expect(ids(filterAssetPool(BANK, filters(), []))).toEqual([
      "research",
      "pricing",
      "voice",
    ]);
  });

  it("sorts by title case-insensitively", () => {
    expect(ids(filterAssetPool(BANK, filters({ sort: "title" }), []))).toEqual([
      "voice",
      "research",
      "pricing",
    ]);
  });

  it("matches the query against the title, case-insensitively", () => {
    expect(ids(filterAssetPool(BANK, filters({ query: "PRICING" }), []))).toEqual(
      ["pricing"],
    );
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(ids(filterAssetPool(BANK, filters({ query: "   " }), []))).toHaveLength(
      3,
    );
  });

  it("filters by category, mapping PDF to files", () => {
    expect(ids(filterAssetPool(BANK, filters({ category: "files" }), []))).toEqual(
      ["research"],
    );
    expect(
      ids(filterAssetPool(BANK, filters({ category: "text" }), [])).sort(),
    ).toEqual(["pricing", "voice"]);
  });

  it("takes any of the chosen tags, not all of them", () => {
    const result = filterAssetPool(
      BANK,
      filters({ tagIds: ["t-pricing", "t-research"] }),
      [],
    );
    expect(ids(result).sort()).toEqual(["pricing", "research", "voice"]);
  });

  it("narrows to the shortlist in review mode", () => {
    expect(
      ids(filterAssetPool(BANK, filters({ selectedOnly: true }), ["voice"])),
    ).toEqual(["voice"]);
  });

  it("combines filters", () => {
    const result = filterAssetPool(
      BANK,
      filters({ selectedOnly: true, category: "text", query: "guide" }),
      ["voice", "pricing"],
    );
    expect(ids(result)).toEqual(["voice"]);
  });

  it("leaves the input array untouched", () => {
    const original = [...BANK];
    filterAssetPool(BANK, filters({ sort: "title" }), []);
    expect(BANK).toEqual(original);
  });
});

describe("isFiltered", () => {
  it("is false for the default filters", () => {
    expect(isFiltered(EMPTY_FILTERS)).toBe(false);
  });

  it("ignores sort — reordering isn't narrowing", () => {
    expect(isFiltered(filters({ sort: "title" }))).toBe(false);
  });

  it("is true for anything that narrows the list", () => {
    expect(isFiltered(filters({ query: "a" }))).toBe(true);
    expect(isFiltered(filters({ tagIds: ["t"] }))).toBe(true);
    expect(isFiltered(filters({ category: "files" }))).toBe(true);
    expect(isFiltered(filters({ selectedOnly: true }))).toBe(true);
  });
});
