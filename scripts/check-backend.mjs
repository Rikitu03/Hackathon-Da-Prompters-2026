import assert from "node:assert/strict";

const base = new URL(process.env.BACKEND_TEST_URL ?? "http://localhost:3000");
assert.ok(["http:", "https:"].includes(base.protocol));
const checks = [
  ["walkthrough page", "/backend-lab", "GET", 200],
  ["public page", "/scholarships", "GET", 200],
  ["database readiness", "/api/health", "GET", 200],
  ["published programs", "/api/scholarships", "GET", 200],
  ["invalid pagination", "/api/scholarships?page=0", "GET", 400],
  ["invalid program ID", "/api/scholarships/not-a-uuid", "GET", 400],
  ["unknown program", "/api/scholarships/00000000-0000-0000-0000-000000000000", "GET", 404],
  ["unknown requirement", "/api/requirements/00000000-0000-0000-0000-000000000000", "GET", 404],
  ["session requires sign-in", "/api/auth/session", "GET", 401],
  ["admin reads require sign-in", "/api/admin/guides", "GET", 401],
  ["draft saves require sign-in", "/api/admin/guides", "POST", 401],
  ["publishing requires sign-in", "/api/admin/publish", "POST", 401],
  ["program creation requires sign-in", "/api/admin/programs", "POST", 401],
  ["program updates require sign-in", "/api/admin/programs/00000000-0000-0000-0000-000000000000", "PATCH", 401],
  ["program deletion requires sign-in", "/api/admin/programs/00000000-0000-0000-0000-000000000000", "DELETE", 401],
  ["invalid login body", "/api/auth/login", "POST", 400],
];
for (const [label, path, method, expected] of checks) {
  const response = await fetch(new URL(path, base), {
    method, headers: { "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: "{}" }),
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, expected, `${label}: expected ${expected}, got ${response.status}`);
  if (path === "/api/health") assert.equal((await response.json()).database.connected, true);
  if (path.startsWith("/api/")) assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  console.log(`PASS ${label}`);
}
const crossSite = await fetch(new URL("/api/admin/guides", base), {
  method: "POST", headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" }, body: "{}",
});
assert.equal(crossSite.status, 403, "Cross-site writes must fail before authorization");
console.log("PASS cross-site write protection");
console.log(`PASS all ${checks.length+1} HTTP checks. Publisher workflow is tested by supabase/tests/guide_workflow.sql; real password sign-in needs a provisioned app account.`);
