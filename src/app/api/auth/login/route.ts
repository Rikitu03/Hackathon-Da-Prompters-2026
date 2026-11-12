import { z } from "zod";
import { ApiError, body, databaseError, endpoint, json, sameOrigin } from "@/lib/api";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const credentials = await body(request, z.object({ email: z.string().email().max(254), password: z.string().min(1).max(1024) }).strict());
    const client = await createServerSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error || !data.user) throw new ApiError(error?.status === 429 ? 429 : 401, "Sign-in failed. Check your credentials and confirm your account is enabled.");
    const { data: profile, error: profileError } = await client.from("admin_profiles").select("role").eq("user_id", data.user.id).maybeSingle();
    databaseError(profileError);
    if (!profile || !["editor", "publisher"].includes(profile.role)) {
      await client.auth.signOut({ scope: "local" });
      throw new ApiError(403, "Your account needs an editor or publisher role assigned through the Supabase dashboard.");
    }
    return json({ user: { id: data.user.id, email: data.user.email }, role: profile.role });
  });
}
