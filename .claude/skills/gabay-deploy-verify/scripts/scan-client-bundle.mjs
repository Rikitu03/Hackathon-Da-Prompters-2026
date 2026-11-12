#!/usr/bin/env node
// Scan the built Next.js client bundle (.next/static) for leaked server secrets.
// Run from the repo root after `npm run build`. Exit 1 if anything is found.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const SECRET_VARS = ["LUMEN_API_KEY", "LUMEN_API_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
const SERVER_ONLY_NAMES = [...SECRET_VARS, "LUMEN_CHAT_URL", "LUMEN_OCR_URL"];

const env = { ...process.env };
for (const f of [".env.local", ".env.production.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const root = ".next/static";
if (!existsSync(root)) {
  console.error("No .next/static found — run `npm run build` first.");
  process.exit(2);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(js|css|html|json|map)$/.test(name)) yield p;
  }
}

const values = SECRET_VARS.map((k) => [k, env[k]]).filter(([, v]) => v && v.length >= 8);
let hits = 0, files = 0;
for (const file of walk(root)) {
  files++;
  const text = readFileSync(file, "utf8");
  for (const [k, v] of values) {
    if (text.includes(v)) { hits++; console.log(`LEAK  value of ${k} found in ${file}`); }
  }
  for (const name of SERVER_ONLY_NAMES) {
    if (text.includes(name)) { hits++; console.log(`WARN  name "${name}" referenced in ${file} (server-only code in client bundle?)`); }
  }
}
console.log(`Scanned ${files} files; checked ${values.length} secret values.`);
if (values.length === 0) console.log("Note: no secret values found in env files, so only variable names were checked.");
console.log(hits ? `✗ ${hits} finding(s)` : "✓ No secrets or server-only names in client bundle");
process.exit(hits ? 1 : 0);
