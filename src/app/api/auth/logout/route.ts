import { endpoint, json, sameOrigin } from "@/lib/api";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const client = await createServerSupabaseClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) throw error;
    return json({ signedOut: true });
  });
}
