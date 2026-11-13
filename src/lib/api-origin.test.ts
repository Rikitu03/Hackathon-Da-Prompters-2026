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
  it("accepts a verified GitHub Codespaces HTTPS-origin request proxied to localhost", () => {
    const headers = {
      host: "localhost:3000",
      origin: "https://cautious-adventure-5gxxg9w6q7q427rxq-3000.app.github.dev",
      "x-forwarded-host": "cautious-adventure-5gxxg9w6q7q427rxq-3000.app.github.dev",
      "x-forwarded-proto": "https",
      "sec-fetch-site": "same-origin",
    };
    expect(() => sameOrigin(new Request("http://localhost:3000/api/auth/login", { headers }))).not.toThrow();
  });
  it("rejects forged forwarded hosts, external origins, and cross-site requests", () => {
    const browserOrigin = "https://cautious-adventure-5gxxg9w6q7q427rxq-3000.app.github.dev";
    const base = {
      host: "localhost:3000",
      origin: browserOrigin,
      "sec-fetch-site": "same-origin",
    };
    const make = (headers: Record<string, string>) =>
      new Request("http://localhost:3000/api/auth/login", { headers: { ...base, ...headers } });
    expect(() => sameOrigin(make({ "x-forwarded-host": "evil.app.github.dev" }))).toThrow("Cross-site writes");
    expect(() => sameOrigin(make({ "x-forwarded-host": "evil.example" }))).toThrow("Cross-site writes");
    expect(() => sameOrigin(make({ origin: "https://evil.example", "x-forwarded-host": "evil.example" }))).toThrow("Cross-site writes");
    expect(() => sameOrigin(make({ "x-forwarded-host": new URL(browserOrigin).host, "sec-fetch-site": "cross-site" }))).toThrow("Cross-site writes");
    expect(() => sameOrigin(make({ "x-forwarded-host": new URL(browserOrigin).host, "sec-fetch-site": "same-site" }))).toThrow("Cross-site writes");
  });

});
