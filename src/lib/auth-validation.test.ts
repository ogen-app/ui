import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
} from "./auth-validation.ts";

/** First message for a field, or undefined when the field passed. */
function errorFor(
  result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } },
  field: string
): string | undefined {
  if (result.success) return undefined;
  return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

describe("resetPasswordSchema", () => {
  const good = "Sunlit7Harbour";

  it("accepts a strong password typed twice", () => {
    const result = resetPasswordSchema.safeParse({
      password: good,
      confirmPassword: good,
    });
    expect(result.success).toBe(true);
  });

  // The reason the second field exists: nothing else can catch a typo in a
  // credential the user can't see and won't use again until their next login.
  it("rejects a mismatch, and blames the confirmation field", () => {
    const result = resetPasswordSchema.safeParse({
      password: good,
      confirmPassword: `${good}x`,
    });
    expect(result.success).toBe(false);
    expect(errorFor(result, "confirmPassword")).toBe("Passwords do not match");
  });

  it("applies the full strength rules, not just a length check", () => {
    for (const weak of ["short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"]) {
      const result = resetPasswordSchema.safeParse({
        password: weak,
        confirmPassword: weak,
      });
      expect(result.success, `expected "${weak}" to be rejected`).toBe(false);
      expect(errorFor(result, "password")).toBeDefined();
    }
  });

  it("asks for the confirmation when it is left empty", () => {
    const result = resetPasswordSchema.safeParse({ password: good, confirmPassword: "" });
    expect(errorFor(result, "confirmPassword")).toBe("Confirm your password");
  });
});

describe("loginSchema", () => {
  // Logging in checks a password that already exists; re-running the signup
  // strength rules here would lock out anyone whose password predates them.
  it("takes any non-empty password", () => {
    const result = loginSchema.safeParse({ email: "a@b.co", password: "x" });
    expect(result.success).toBe(true);
  });

  it("still requires a well-formed email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(errorFor(result, "email")).toBe("Invalid email format");
  });
});

describe("profileSchema", () => {
  const valid = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" };

  it("accepts a filled-in profile", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a whitespace-only name", () => {
    // The field is trimmed before it is sent, so " " would reach the server as
    // an empty name and be rejected there.
    const result = profileSchema.safeParse({ ...valid, firstName: "   " });
    expect(errorFor(result, "firstName")).toBeDefined();
  });

  it("rejects a malformed email", () => {
    const result = profileSchema.safeParse({ ...valid, email: "ada@" });
    expect(errorFor(result, "email")).toBe("Invalid email format");
  });
});

describe("changePasswordSchema", () => {
  const current = "OldHarbour9";
  const next = "Sunlit7Harbour";
  const valid = { currentPassword: current, password: next, confirmPassword: next };

  it("accepts a current password plus a strong new one typed twice", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("takes any non-empty current password", () => {
    // It is an existing credential — applying the strength rules to it would
    // lock out anyone whose password predates them, exactly as for login.
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: "x" });
    expect(result.success).toBe(true);
  });

  it("asks for the current password when it is left empty", () => {
    const result = changePasswordSchema.safeParse({ ...valid, currentPassword: "" });
    expect(errorFor(result, "currentPassword")).toBe("Enter your current password");
  });

  it("applies the strength rules to the new password", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      password: "alllowercase1",
      confirmPassword: "alllowercase1",
    });
    expect(errorFor(result, "password")).toBeDefined();
  });

  it("catches a mistyped confirmation", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: "Sunlit7Harbor",
    });
    expect(errorFor(result, "confirmPassword")).toBe("Passwords do not match");
  });

  it("rejects re-submitting the password the account already has", () => {
    // Not pedantry: the change costs a re-authentication and reads as a
    // security action, so silently accepting a no-op would tell the user they
    // rotated a credential they did not.
    const result = changePasswordSchema.safeParse({
      currentPassword: next,
      password: next,
      confirmPassword: next,
    });
    expect(errorFor(result, "password")).toBe("That is already your password");
  });
});
