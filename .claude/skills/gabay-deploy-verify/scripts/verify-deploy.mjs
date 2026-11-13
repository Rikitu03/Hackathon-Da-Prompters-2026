#!/usr/bin/env node
// Smoke-test a GabayIskolar deployment (local or Vercel).
// Usage: node verify-deploy.mjs <baseUrl> [--cycle=<published-cycle-uuid>] [--question="..."]
const [base, ...args] = process.argv.slice(2);
if (!base) {
  console.error("Usage: verify-deploy.mjs <baseUrl> [--cycle=<uuid>] [--question=\"...\"]");
  process.exit(2);
}
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => {
  const [k, ...v] = a.slice(2).split("=");
  return [k, v.join("=")];
}));
const url = (p) => new URL(p, base.endsWith("/") ? base : base + "/").toString();

const results = [];
async function check(name, fn) {
  const t = Date.now();
  try {
    const { ok, detail } = await fn();
    results.push({ name, ok, detail, ms: Date.now() - t });
  } catch (e) {
    results.push({ name, ok: false, detail: `${e.name}: ${e.message}`, ms: Date.now() - t });
  }
}
const post = (p, body, headers = { "content-type": "application/json" }) =>
  fetch(url(p), { method: "POST", headers, body, signal: AbortSignal.timeout(60_000) });

await check("GET /api/health → 200, supabase+lumen configured", async () => {
  const r = await fetch(url("api/health"), { signal: AbortSignal.timeout(30_000) });
  const j = await r.json().catch(() => ({}));
  const ok = r.status === 200 && j.configured?.supabase === true && j.configured?.lumen === true;
  return { ok, detail: `${r.status} ${JSON.stringify(j)}` };
});

await check("POST /api/ai/chat invalid JSON → 400", async () => {
  const r = await post("api/ai/chat", "{not json");
  return { ok: r.status === 400, detail: `${r.status}` };
});

await check("POST /api/ai/chat empty message → 400", async () => {
  const r = await post("api/ai/chat", JSON.stringify({ cycleId: "00000000-0000-0000-0000-000000000000", message: "   " }));
  return { ok: r.status === 400, detail: `${r.status}` };
});

await check("POST /api/ai/ocr non-multipart → 415", async () => {
  const r = await post("api/ai/ocr", JSON.stringify({}));
  // 503 means Lumen isn't configured on this deployment — reported as a failure so it's visible.
  return { ok: r.status === 415, detail: `${r.status}` };
});

if (opt.cycle) {
  await check("POST /api/ai/chat real question → 200 {answer,sources,grounded}", async () => {
    const message = opt.question || "What documents do I need to submit?";
    const r = await post("api/ai/chat", JSON.stringify({ cycleId: opt.cycle, message }));
    const j = await r.json().catch(() => ({}));
    const shapeOk = typeof j.answer === "string" && Array.isArray(j.sources) && typeof j.grounded === "boolean";
    const summary = shapeOk
      ? `grounded=${j.grounded} sources=${j.sources.map((s) => s.title).join("; ") || "none"} answer="${j.answer.slice(0, 160)}"`
      : JSON.stringify(j).slice(0, 300);
    return { ok: r.status === 200 && shapeOk, detail: `${r.status} ${summary}` };
  });
} else {
  results.push({ name: "real chat question", ok: null, detail: "skipped (pass --cycle=<published cycle uuid>)", ms: 0 });
}

for (const r of results) {
  const mark = r.ok === null ? "–" : r.ok ? "✓" : "✗";
  console.log(`${mark} ${r.name}  [${r.ms}ms]\n    ${r.detail}`);
}
const failed = results.filter((r) => r.ok === false).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nAll run checks passed");
process.exit(failed ? 1 : 0);
