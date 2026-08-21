import { describe, expect, it } from "vitest";
import {
  campaignAssets,
  membershipPayload,
  retrievability,
  seedsWholeBank,
} from "./campaignSources";
import type { Asset } from "@/types/content";

const doc = (id: string): Asset => ({
  id,
  title: id,
  content: "",
  status: "ready",
  type: null,
  tag_ids: [],
  tags: [],
  created_by: "user",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
});

describe("membershipPayload", () => {
  it("sends the set a campaign holds", () => {
    expect(membershipPayload(["a", "b"])).toEqual({
      use_assets: true,
      asset_ids: ["a", "b"],
    });
  });

  it("writes an empty campaign as brief-only, never as an empty list", () => {
    // The one thing that must never happen: an empty list saved as
    // `use_assets: true`, which the server reads as the entire workspace.
    expect(membershipPayload([])).toEqual({
      use_assets: false,
      asset_ids: [],
    });
  });
});

describe("seedsWholeBank", () => {
  it("finds a campaign left in the old whole-bank mode", () => {
    expect(seedsWholeBank({ use_assets: true, asset_ids: [] })).toBe(true);
  });

  it("leaves a campaign with its own set alone", () => {
    expect(seedsWholeBank({ use_assets: true, asset_ids: ["a"] })).toBe(false);
  });

  it("leaves a brief-only campaign alone — an empty bank is not a lost one", () => {
    expect(seedsWholeBank({ use_assets: false, asset_ids: [] })).toBe(false);
  });
});

describe("campaignAssets", () => {
  it("keeps only what the campaign holds", () => {
    const bank = [doc("a"), doc("b"), doc("c")];
    expect(campaignAssets(bank, { asset_ids: ["c", "a"] }).map((a) => a.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("ignores ids whose asset is gone from the bank", () => {
    expect(campaignAssets([doc("a")], { asset_ids: ["a", "deleted"] })).toHaveLength(1);
  });
});

describe("retrievability", () => {
  it("only ready assets can be retrieved", () => {
    expect(retrievability("ready")).toBe("ready");
  });

  it("treats in-flight processing as not yet", () => {
    expect(retrievability("pending")).toBe("waiting");
    expect(retrievability("processing")).toBe("waiting");
  });

  it("treats partial and failed as never — the server skips both", () => {
    expect(retrievability("partial")).toBe("never");
    expect(retrievability("failed")).toBe("never");
  });
});

