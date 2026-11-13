import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const getUser = vi.hoisted(() => vi.fn(async () => ({ data: { user: null }, error: null })));
const createServerClient = vi.hoisted(() => vi.fn(() => ({ auth: { getUser } })));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

describe("admin middleware Supabase isolation", () => {
  beforeEach(() => {
    getUser.mockClear();
    createServerClient.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://mock.supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not contact Supabase when viewing fictional demo routes", async () => {
    for (const path of ["/admin/demo", "/admin/demo?view=programs", "/admin/demo/preview"]) {
      const response = await middleware(new NextRequest("https://example.test" + path));
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    }
    expect(createServerClient).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("retains session verification for the real admin and protected APIs", async () => {
    for (const path of ["/admin", "/admin/programs", "/api/admin/workspace", "/api/auth/session"]) {
      const response = await middleware(new NextRequest("https://example.test" + path));
      expect(response.status).toBe(200);
    }
    expect(createServerClient).toHaveBeenCalledTimes(4);
    expect(getUser).toHaveBeenCalledTimes(4);
  });

  it("does not treat lookalike prefixes as public demo routes", async () => {
    await middleware(new NextRequest("https://example.test/admin/demo-secret"));
    expect(getUser).toHaveBeenCalledTimes(1);
  });
});
