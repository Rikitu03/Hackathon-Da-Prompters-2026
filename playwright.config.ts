import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    // CI already built the production app, so avoid concurrent Next.js dev compilation
    // races while Chromium desktop/mobile suites navigate the same routes.
    command: process.env.CI
      ? "npm run start -- -H 127.0.0.1"
      : "npm run dev -- -H 127.0.0.1",
    url: "http://127.0.0.1:3000/admin/demo",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Never contact the shared dev Supabase from automated browser tests.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_e2e_mock_key"
    }
  }
});
