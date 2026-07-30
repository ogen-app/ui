import { describe, expect, it } from "vitest";
import {
  groundingChoiceOf,
  groundingError,
  groundingPayload,
  isConfigurable,
  poolStats,
  retrievability,
  selectionStats,
} from "./campaignGrounding";
import type { AssetStatus } from "@/types/content";

const asset = (id: string, status: AssetStatus) => ({ id, status });

describe("groundingChoiceOf", () => {
  it("reads an untouched campaign as undecided", () => {
    expect(groundingChoiceOf({ use_assets: false, asset_ids: [] })).toBeNull();
  });

  it("reads a cleared flag over a kept shortlist as off", () => {
    expect(groundingChoiceOf({ use_assets: false, asset_ids: ["a"] })).toBe(
      "off",
    );
  });

  it("reads an empty id list as the whole bank, not as nothing", () => {
    expect(groundingChoiceOf({ use_assets: true, asset_ids: [] })).toBe("all");
  });

  it("reads a non-empty id list as an explicit set", () => {
    expect(groundingChoiceOf({ use_assets: true, asset_ids: ["a"] })).toBe(
      "selected",
    );
  });
});

describe("isConfigurable", () => {
  it("is true only for the modes that draw on the bank", () => {
    expect(isConfigurable("all")).toBe(true);
    expect(isConfigurable("selected")).toBe(true);
  });

  it("is false when there is nothing to open", () => {
    expect(isConfigurable("off")).toBe(false);
    expect(isConfigurable(null)).toBe(false);
  });
});

describe("groundingPayload", () => {
  it("keeps the shortlist when grounding is switched off", () => {
    expect(groundingPayload("off", ["a", "b"])).toEqual({
      use_assets: false,
      asset_ids: ["a", "b"],
    });
  });

  it("clears the shortlist for the whole bank — a list would make it explicit", () => {
    expect(groundingPayload("all", ["a", "b"])).toEqual({
      use_assets: true,
      asset_ids: [],
    });
  });

  it("sends the shortlist for an explicit set", () => {
    expect(groundingPayload("selected", ["a", "b"])).toEqual({
      use_assets: true,
      asset_ids: ["a", "b"],
    });
  });

  it("round-trips every mode back through groundingChoiceOf", () => {
    for (const mode of ["off", "all", "selected"] as const) {
      expect(groundingChoiceOf(groundingPayload(mode, ["a"]))).toBe(mode);
    }
  });

  it("cannot round-trip Brief only over an empty shortlist", () => {
    // The gap the interface has to live with: this is byte-identical to a
    // campaign nobody has configured, so it comes back as undecided.
    expect(groundingChoiceOf(groundingPayload("off", []))).toBeNull();
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
  it("counts only the attached subset", () => {
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

describe("groundingError", () => {
  it("blocks an explicit set with nothing in it — the server would read it as everything", () => {
    expect(groundingError("selected", [])).not.toBeNull();
  });

  it("allows every other combination", () => {
    expect(groundingError("selected", ["a"])).toBeNull();
    expect(groundingError("all", [])).toBeNull();
    expect(groundingError("off", [])).toBeNull();
  });

  it("has nothing to say about an undecided campaign — it just has no action", () => {
    expect(groundingError(null, [])).toBeNull();
  });
});
