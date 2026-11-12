import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error("Run npm run setup:env and configure the shared Supabase public values first.");
}
if (key.startsWith("sb_secret_")) throw new Error("Use a public publishable key, never a secret key.");
if (key.startsWith("eyJ")) {
  const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString());
  if (payload.role !== "anon") throw new Error("The legacy public key must have the anon role.");
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const tables = [
  "scholarship_programs", "application_cycles", "requirements", "requirement_steps",
  "faqs", "knowledge_sources", "knowledge_chunks",
];
const checks = await Promise.allSettled(tables.map(async (table) => {
  const { error } = await client.from(table).select("id").limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
}));
const failures = checks.filter((check) => check.status === "rejected");
if (failures.length) {
  for (const failure of failures) console.error(failure.reason.message);
  process.exitCode = 1;
} else {
  const { error } = await client.from("admin_profiles").select("user_id").limit(1);
  if (error?.code !== "42501") {
    throw new Error("Expected anonymous administrator profile access to be denied with 42501.");
  }
  console.log(`PASS: anonymous Data API reads work for all ${tables.length} content tables; administrator profiles are protected.`);
}
