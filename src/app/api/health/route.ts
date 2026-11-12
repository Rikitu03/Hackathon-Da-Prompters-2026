import { json } from "@/lib/api";
import { createAnonymousClient } from "@/lib/supabase/server";
export async function GET() {
  let connected = false;
  try {
    const { error } = await createAnonymousClient().from("scholarship_programs").select("id").limit(1).abortSignal(AbortSignal.timeout(5000));
    connected = !error;
  } catch { /* Return the same readiness shape when configuration or connectivity is missing. */ }
  return json({ status: connected ? "ok" : "degraded", service: "gabayiskolar",
    database: { connected },
    configured: { supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      lumen: Boolean(process.env.LUMEN_API_KEY && process.env.LUMEN_API_SECRET) },
  }, connected ? 200 : 503);
}
