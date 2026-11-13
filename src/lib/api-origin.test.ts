import { describe, expect, it } from "vitest";
import { sameOrigin } from "./api";

describe("same-origin write guard", () => {
  it("accepts the browser destination when Next uses its internal hostname", () => {
    expect(() => sameOrigin(new Request("http://localhost:3000/api/auth/login", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "sec-fetch-site": "same-origin" } }))).not.toThrow();
  });
  it("rejects other origins and does not trust forwarded-host", () => {
    expect(() => sameOrigin(new Request("http://localhost/api", { headers: { host: "app.example", origin: "http://evil.example", "x-forwarded-host": "evil.example" } }))).toThrow("Cross-site writes");
    expect(() => sameOrigin(new Request("http://localhost/api", { headers: { host: "app.example", origin: "http://app.example", "sec-fetch-site": "cross-site" } }))).toThrow("Cross-site writes");
  });
});
