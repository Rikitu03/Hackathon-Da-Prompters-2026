#!/usr/bin/env node
// Lumen smoke test against the verified contract (docs/LUMEN_CONTRACT.md).
// Never prints credentials. Run from the repo root. Each mode states its credit cost.
//
//   node lumen-smoke.mjs instances                 GET  {chat}/instances                         (1 credit)
//   node lumen-smoke.mjs chat "<message>"          open session + send one message               (2 + 5 credits)
//   node lumen-smoke.mjs ocr <file>                upload raw bytes, poll, read pages             (6 + 1/poll + 1 credits)
//   node lumen-smoke.mjs get <chat|ocr> <path>     GET any path under a base, e.g. get ocr /documents?Limit=1 (1 credit)
//   Any mode: --save=<dir> writes each full JSON response (credentials scrubbed) to <dir>.
//
// Env (process env, then .env.local, then .env):
//   LUMEN_API_KEY, LUMEN_API_SECRET
//   LUMEN_CHAT_URL  e.g. https://api.staging.nonlive.lumen.bayanichain.tech/ai_chat
//   LUMEN_OCR_URL   e.g. https://api.staging.nonlive.lumen.bayanichain.tech/ocr
//   LUMEN_CHAT_INSTANCE_ID (chat mode; otherwise the first ACTIVE instance is used)
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { randomBytes } from "node:crypto";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const E = process.env;
const argv = process.argv.slice(2);
// --save=<dir>: write every JSON response untruncated (credentials scrubbed) to <dir>/<n>-<label>.json
const saveDir = argv.find((a) => a.startsWith("--save="))?.slice(7);
const [mode, ...args] = argv.filter((a) => !a.startsWith("--save="));
let saveCount = 0;
const need = (...keys) => {
  const missing = keys.filter((k) => !E[k]);
  if (missing.length) { console.error(`Missing env: ${missing.join(", ")}`); process.exit(2); }
};
need("LUMEN_API_KEY", "LUMEN_API_SECRET");
const auth = { "lumen-api-key": E.LUMEN_API_KEY, "lumen-api-secret": E.LUMEN_API_SECRET };
const scrub = (s) => [E.LUMEN_API_KEY, E.LUMEN_API_SECRET].reduce((a, x) => a.split(x).join("<redacted>"), s);
const trim = (s, n = 3000) => (s.length > n ? s.slice(0, n) + `\n… (${s.length} chars total)` : s);

async function call(method, url, { body, headers = {}, timeout = 30_000 } = {}) {
  const t = Date.now();
  const res = await fetch(url, { method, headers: { ...auth, ...headers }, body, signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  const rid = json?.requestId ? ` requestId=${json.requestId}` : "";
  console.log(`${method} ${new URL(url).pathname}${new URL(url).search} → ${res.status} in ${Date.now() - t}ms${rid}`);
  if (!res.ok) console.log("  " + scrub(trim(text, 800)));
  if (saveDir) {
    mkdirSync(saveDir, { recursive: true });
    const label = `${method}${new URL(url).pathname}`.replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "").slice(0, 80);
    const file = join(saveDir, `${String(++saveCount).padStart(2, "0")}-${label}.json`);
    writeFileSync(file, scrub(json ? JSON.stringify({ status: res.status, body: json }, null, 2) : text));
    console.log(`  saved ${file}`);
  }
  return { res, json, text };
}
const show = (x) => console.log(trim(scrub(JSON.stringify(x, null, 2))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  if (mode === "instances") {
    need("LUMEN_CHAT_URL");
    const { json } = await call("GET", `${E.LUMEN_CHAT_URL}/instances`);
    if (json) show(json);
  } else if (mode === "chat") {
    need("LUMEN_CHAT_URL");
    const message = args.join(" ");
    if (!message || message.length > 4000) { console.error("Give a message of 1–4000 chars"); process.exit(2); }
    let id = E.LUMEN_CHAT_INSTANCE_ID;
    if (!id) {
      const { json } = await call("GET", `${E.LUMEN_CHAT_URL}/instances`);
      id = json?.Instances?.find((i) => i.Status === "ACTIVE")?.InstanceID;
      if (!id) { console.error("No ACTIVE instance found"); process.exit(1); }
    }
    const s = await call("POST", `${E.LUMEN_CHAT_URL}/instances/${id}/sessions`, {
      headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "gabay-smoke-test" }),
    });
    const sid = s.json?.Session?.id;
    if (!sid) process.exit(1);
    const m = await call("POST", `${E.LUMEN_CHAT_URL}/instances/${id}/sessions/${sid}/messages`, {
      headers: { "content-type": "application/json" }, body: JSON.stringify({ message }), timeout: 30_000,
    });
    if (m.json) show(m.json);
    process.exit(m.res.ok ? 0 : 1);
  } else if (mode === "ocr") {
    need("LUMEN_OCR_URL");
    const file = args[0];
    const types = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".tif": "image/tiff", ".tiff": "image/tiff", ".webp": "image/webp" };
    const type = types[extname(file || "").toLowerCase()];
    if (!file || !type) { console.error("Give a .pdf/.png/.jpg/.tiff/.webp file"); process.exit(2); }
    const bytes = readFileSync(file);
    if (bytes.length > 10 * 1024 * 1024) { console.error("File exceeds 10 MiB"); process.exit(2); }
    console.log("Note: uploads are permanent and visible org-wide. Use DEMO documents only.");
    const name = `gabay-smoke-${randomBytes(4).toString("hex")}${extname(file).toLowerCase()}`; // generic name, never the real filename
    const up = await call("POST", `${E.LUMEN_OCR_URL}/documents`, {
      headers: { "content-type": type, "x-lumen-document-name": encodeURIComponent(name) }, body: bytes,
    });
    const docId = up.json?.data?.DocumentID;
    if (!docId) process.exit(1);
    console.log(`DocumentID ${docId}`);
    let status = up.json.data.Status, rec = up.json.data;
    for (let i = 0; i < 10 && !["READY", "PARTIAL", "FAILED"].includes(status); i++) {
      await sleep(i === 0 ? 1500 : 2500);
      const r = await call("GET", `${E.LUMEN_OCR_URL}/documents/${docId}`);
      rec = r.json?.data ?? rec; status = rec.Status;
      console.log(`  Status ${status}`);
    }
    show(rec);
    if (status === "READY" || status === "PARTIAL") {
      const p = await call("GET", `${E.LUMEN_OCR_URL}/documents/${docId}/pages?IncludeWords=true`);
      if (p.json) show(p.json);
    } else process.exit(1);
  } else if (mode === "get") {
    const [which, path] = args;
    const base = which === "chat" ? E.LUMEN_CHAT_URL : which === "ocr" ? E.LUMEN_OCR_URL : undefined;
    if (!base || !path) { console.error("Usage: get <chat|ocr> <path>  (needs LUMEN_CHAT_URL / LUMEN_OCR_URL)"); process.exit(2); }
    const { json, text, res } = await call("GET", base + (path.startsWith("/") ? path : "/" + path));
    if (res.ok) {
      if (json) show(json);
      else console.log(trim(scrub(text)));
    }
  } else {
    console.error("Usage: lumen-smoke.mjs <instances | chat \"msg\" | ocr <file> | get <chat|ocr> <path>>");
    process.exit(2);
  }
} catch (e) {
  console.error(`✗ ${e.name}: ${e.message}`);
  process.exit(1);
}
