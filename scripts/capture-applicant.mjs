// Production UI evidence with the same explicitly fictional API fixtures as Playwright.
// Run after an isolated acceptance build:
// GABAY_BUILD_DIR=.next-acceptance node --experimental-strip-types scripts/capture-applicant.mjs
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { chooseGuide, mockChat, mockOcr, mockPublishedGuide, OCR_REVIEW, GROUNDED_REPLY, REQ_ENROLL_ID, PROGRAM_ID, CYCLE_ID, OFFICIAL_URL } from "../tests/support/applicant-mocks.ts";

const base = "http://127.0.0.1:3107";
const out = ".taste-skill/after/journey";
await mkdir(out, { recursive: true });
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3107"], {
  env: { ...process.env, GABAY_BUILD_DIR: ".next-acceptance", NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_e2e_mock_key", LUMEN_CHAT_ENABLED: "false", LUMEN_OCR_ENABLED: "false" },
  stdio: "ignore", windowsHide: true,
});
let browser;
const findings = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(`${base}/document-review`)).ok; } catch { /* starting */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("Acceptance server did not become ready");
  browser = await chromium.launch();
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.route(/https:\/\//, (route) => route.abort());
    await mockPublishedGuide(page); await chooseGuide(page); await mockOcr(page, OCR_REVIEW);
    await mockChat(page, [GROUNDED_REPLY, { answer: "The published guide does not give an office fee.", grounded: false, sources: [], officialUrl: OFFICIAL_URL }]);
    async function capture(name) {
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      const measurements = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        h1: document.querySelector("h1")?.textContent,
        currentStage: document.querySelector('.journey-rail [aria-current="step"]')?.getAttribute("aria-label"),
      }));
      await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
      if (measurements.overflow) {
        console.log(await page.evaluate(() => [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map((el) => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right }))));
        throw new Error(`${name} overflows at ${width}px`);
      }
      findings.push({ screen: name, width, ...measurements });
    }
    await page.goto(`${base}/dashboard`); await page.getByRole("link", { name: "Continue preparing", exact: true }).waitFor(); await capture("dashboard");
    await page.goto(`${base}/requirements/${REQ_ENROLL_ID}?program=${PROGRAM_ID}&cycle=${CYCLE_ID}`); await page.getByRole("link", { name: "Check my document" }).waitFor(); await capture("requirement");
    await page.getByRole("link", { name: "Check my document" }).click();
    await page.locator('input[type="file"]').setInputFiles("tests/fixtures/demo-certificate.png");
    await page.getByLabel(/Send this document to Lumen OCR/).check();
    await page.getByRole("button", { name: "Extract details", exact: true }).click();
    await page.getByLabel("Barangay", { exact: true }).fill("San Antonio");
    await page.getByLabel(/I compared these details/).check();
    await page.getByRole("button", { name: "Confirm my review" }).click(); await capture("document");
    await page.getByRole("link", { name: /Ask Gabay about Proof/ }).click();
    await page.getByLabel("Your scholarship question").fill("Where do I get proof of enrollment?");
    await page.getByLabel("Your scholarship question").press("Enter");
    await page.getByRole("link", { name: "[1]", exact: true }).waitFor();
    await page.getByLabel("Your scholarship question").fill("What is the office fee?");
    await page.getByLabel("Your scholarship question").press("Enter");
    await page.getByRole("note").waitFor(); await capture("assistant");
    await page.goto(`${base}/summary`); await page.getByRole("link", { name: "Continue to the official application page" }).waitFor(); await capture("summary");
    await context.close();
  }
  await writeFile(`${out}/measurements.json`, JSON.stringify(findings, null, 2));
  console.log(`Saved ${findings.length} screenshots; no horizontal overflow. Fictional mocked data only.`);
} finally {
  await browser?.close();
  server.kill();
}
