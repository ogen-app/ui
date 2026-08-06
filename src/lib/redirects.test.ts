import { describe, expect, it } from "vitest";
import { safeRedirect } from "./redirects.ts";

describe("safeRedirect", () => {
  it("keeps an in-app path", () => {
    expect(safeRedirect("/campaigns")).toBe("/campaigns");
    expect(safeRedirect("/campaigns/abc/posts/xyz?tab=preview")).toBe(
      "/campaigns/abc/posts/xyz?tab=preview"
    );
  });

  it("falls back when there is nothing to go back to", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect("")).toBe("/");
  });

  it("rejects an absolute URL", () => {
    expect(safeRedirect("https://evil.example")).toBe("/");
    expect(safeRedirect("javascript:alert(1)")).toBe("/");
  });

  // The whole reason this helper exists: `startsWith("/")` passes both of
  // these, and both are protocol-relative URLs pointing at another origin.
  it("rejects a protocol-relative URL that merely starts with a slash", () => {
    expect(safeRedirect("//evil.example")).toBe("/");
    expect(safeRedirect("//evil.example/campaigns")).toBe("/");
  });

  it("rejects the backslash spelling of the same trick", () => {
    // Browsers normalise "/\" to "//" when resolving.
    expect(safeRedirect("/\\evil.example")).toBe("/");
  });
});
