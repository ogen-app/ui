import { describe, expect, it } from "vitest";
import {
  poolStats,
  retrievability,
  selectionStats,
  sourceModeOf,
  sourcesError,
  sourcesPayload,
} from "./campaignSources";
import type { AssetStatus } from "@/types/content";

const asset = (id: string, status: AssetStatus) => ({ id, status });

describe("sourceModeOf", () => {
  it("reads an untouched campaign as campaign-only — the default", () => {
    expect(sourceModeOf({ use_assets: false, asset_ids: [] })).toBe("campaign");
  });

  it("stays campaign-only over a kept set", () => {
    expect(sourceModeOf({ use_assets: false, asset_ids: ["a"] })).toBe(
      "campaign",
    );
  });

  it("reads an empty id list as the whole bank, not as nothing", () => {
    expect(sourceModeOf({ use_assets: true, asset_ids: [] })).toBe("all");
  });

  it("reads a non-empty id list as an explicit set", () => {
    expect(sourceModeOf({ use_assets: true, asset_ids: ["a"] })).toBe(
      "selected",
    );
  });
});

describe("sourcesPayload", () => {
  it("keeps the set when the bank is switched off", () => {
    expect(sourcesPayload("campaign", ["a", "b"])).toEqual({
      use_assets: false,
      asset_ids: ["a", "b"],
    });
  });

  it("clears the set for the whole bank — a list would make it explicit", () => {
    expect(sourcesPayload("all", ["a", "b"])).toEqual({
      use_assets: true,
      asset_ids: [],
    });
  });

  it("sends the set for an explicit selection", () => {
    expect(sourcesPayload("selected", ["a", "b"])).toEqual({
      use_assets: true,
      asset_ids: ["a", "b"],
    });
  });

  it("round-trips every mode back through sourceModeOf", () => {
    for (const mode of ["campaign", "all", "selected"] as const) {
      expect(sourceModeOf(sourcesPayload(mode, ["a"]))).toBe(mode);
    }
  });

  it("round-trips campaign-only over an empty set too", () => {
    // The state every new campaign starts in, and the one the page defaults to.
    expect(sourceModeOf(sourcesPayload("campaign", []))).toBe("campaign");
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

describe("poolStats", () => {
  it("buckets a mixed bank", () => {
    expect(
      poolStats([
        asset("a", "ready"),
        asset("b", "ready"),
        asset("c", "processing"),
        asset("d", "failed"),
        asset("e", "partial"),
      ]),
    ).toEqual({ total: 5, ready: 2, waiting: 1, inert: 2 });
  });

  it("is all zeroes for an empty bank", () => {
    expect(poolStats([])).toEqual({ total: 0, ready: 0, waiting: 0, inert: 0 });
  });
});

describe("selectionStats", () => {
  it("counts only the assigned subset", () => {
    const bank = [
      asset("a", "ready"),
      asset("b", "failed"),
      asset("c", "ready"),
    ];
    expect(selectionStats(bank, ["a", "b"])).toEqual({
      total: 2,
      ready: 1,
      waiting: 0,
      inert: 1,
    });
  });

  it("ignores ids that are no longer in the bank", () => {
    expect(selectionStats([asset("a", "ready")], ["a", "gone"])).toEqual({
      total: 1,
      ready: 1,
      waiting: 0,
      inert: 0,
    });
  });
});

describe("sourcesError", () => {
  it("blocks an explicit set with nothing in it — the server would read it as everything", () => {
    expect(sourcesError("selected", [])).not.toBeNull();
  });

  it("allows every other combination", () => {
    expect(sourcesError("selected", ["a"])).toBeNull();
    expect(sourcesError("all", [])).toBeNull();
    expect(sourcesError("campaign", [])).toBeNull();
  });
});
