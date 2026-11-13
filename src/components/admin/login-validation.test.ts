import { describe, expect, it } from "vitest";
import { validateAdminEmail, validateAdminPassword } from "./login-validation";

describe("admin login input validation", () => {
  it("requires an email and validates its format", () => {
    expect(validateAdminEmail("")).toBe("Enter your email address.");
    expect(validateAdminEmail("   ")).toBe("Enter your email address.");
    expect(validateAdminEmail("admin-at-example")).toBe("Enter a valid email address.");
    expect(validateAdminEmail("admin@domain")).toBe("Enter a valid email address.");
    expect(validateAdminEmail("admin@example.com")).toBe("");
    expect(validateAdminEmail(" admin@example.com ")).toBe("");
  });

  it("matches the server's nonempty password rule without rejecting existing short passwords", () => {
    expect(validateAdminPassword("")).toBe("Enter your password.");
    expect(validateAdminPassword("a")).toBe("");
    expect(validateAdminPassword("correct horse battery staple")).toBe("");
    expect(validateAdminPassword("a".repeat(1025))).toBe("Password is too long.");
  });

  it("enforces the email length limit", () => {
    expect(validateAdminEmail("a".repeat(250) + "@example.com")).toBe("Email address must be 254 characters or fewer.");
  });
});