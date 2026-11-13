// Integration check: no Lumen calls. Uses a random synthetic bucket, which expires automatically.
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key, APPLICANT_SESSION_SECRET: secret } = process.env;
if (!url || !key || !secret || !/^[0-9a-f]{64}$/.test(secret)) throw new Error("Configure the existing public database values and server signing secret privately.");
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const hash = text => createHmac("sha256", secret).update(text).digest("hex");
const bucket = hash(`chat-limit-test|${randomUUID()}`);
const issuedAt = Math.floor(Date.now()/1000);
const proof = time => ({ p_bucket: bucket, p_issued_at: time, p_proof: hash(`chat-limit|${bucket}|${time}`) });
const bad = await client().rpc("take_gabay_chat_limit", { ...proof(issuedAt), p_proof: "0".repeat(64) });
if (!bad.error || bad.error.code !== "42501") throw new Error(`Limiter migration/proof check unavailable (${bad.error?.code ?? "unexpected success"}). Apply the migration first.`);
const stale = await client().rpc("take_gabay_chat_limit", proof(issuedAt - 120));
if (stale.error?.code !== "42501") throw new Error("Expired server proof was not rejected.");
// Every request owns a separate client: the database, not local memory, decides admission.
const replies = await Promise.all(Array.from({ length: 20 }, () => client().rpc("take_gabay_chat_limit", proof(issuedAt))));
if (replies.some(reply => reply.error)) throw new Error("Concurrent limiter check failed at the database boundary.");
const admitted = replies.filter(reply => reply.data.allowed).length;
if (admitted !== 10 || replies.filter(reply => !reply.data.allowed).some(reply => reply.data.retryAfterSec < 1)) throw new Error(`Shared quota incorrect: ${admitted} of 20 admitted.`);
console.log("PASS: separate clients share 10 admissions; invalid/expired proofs rejected. No Lumen calls.");
