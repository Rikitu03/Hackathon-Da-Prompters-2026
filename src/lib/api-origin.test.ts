import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sameOrigin } from "./api";

const name = "cautious-adventure-5gxxg9w6q7q427rxq";
const origin = `https://${name}-3000.app.github.dev`;
const localURL = "http://localhost:3000/api/auth/login";

function forwarded(headers: Record<string, string> = {}) {
  return new Request(localURL, {
    headers: {
      host: "localhost:3000",
      origin,
      "sec-fetch-site": "same-origin",
      ...headers,
    },
  });
}

describe("same-origin write guard", () => {
  beforeEach(() => {
    vi.stubEnv("CODESPACES", "true");
    vi.stubEnv("CODESPACE_NAME", name);
    vi.stubEnv("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a normal same-origin request without a Codespaces exception", () => {
    expect(() => sameOrigin(new Request(localURL, {
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "sec-fetch-site": "same-origin" },
    }))).not.toThrow();
  });

  it("accepts this Codespace's exact HTTPS origin through localhost forwarding", () => {
    expect(() => sameOrigin(forwarded())).not.toThrow();
    expect(() => sameOrigin(forwarded({ "x-forwarded-host": new URL(origin).host, "x-forwarded-proto": "https" }))).not.toThrow();
    // Proxies sometimes rewrite forwarded-host to their internal address.
    expect(() => sameOrigin(forwarded({ "x-forwarded-host": "localhost:3000" }))).not.toThrow();
    expect(() => sameOrigin(forwarded({ "x-forwarded-host": "proxy.internal" }))).not.toThrow();
    expect(() => sameOrigin(forwarded({ host: new URL(origin).host }))).not.toThrow();
    expect(() => sameOrigin(forwarded({ host: "127.0.0.1:3000" }))).not.toThrow();
  });

  it("rejects cross-site and same-site writes even when Codespaces headers appear valid", () => {
    for (const site of ["cross-site", "same-site"]) {
      expect(() => sameOrigin(forwarded({ "sec-fetch-site": site }))).toThrow("Cross-site writes");
    }
  });

  it("rejects different codespaces, ports, non-HTTPS origins and unrelated destinations", () => {
    const variants: Array<Record<string, string>> = [
      { origin: `https://other-codespace-3000.app.github.dev` },
      { origin: `https://${name}-3001.app.github.dev` },
      { origin: `http://${name}-3000.app.github.dev` },
      { origin: "https://evil.example" },
      { host: "evil.example" },
    ];
    for (const headers of variants) {
      expect(() => sameOrigin(forwarded(headers))).toThrow("Cross-site writes");
    }
  });

  it("does not enable a Codespaces exception without the platform environment", () => {
    vi.stubEnv("CODESPACES", "");
    expect(() => sameOrigin(forwarded())).toThrow("Cross-site writes");
    vi.stubEnv("CODESPACES", "true");
    vi.stubEnv("CODESPACE_NAME", "other-codespace");
    expect(() => sameOrigin(forwarded())).toThrow("Cross-site writes");
  });

  it("still rejects untrusted forwarded-host when not in Codespaces", () => {
    vi.stubEnv("CODESPACES", "");
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: {
        host: "app.example",
        origin: "http://evil.example",
        "x-forwarded-host": "evil.example",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(() => sameOrigin(request)).toThrow("Cross-site writes");
  });
});
