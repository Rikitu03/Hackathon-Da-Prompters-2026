import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration missing");
  return { url, key };
}

/** A fresh caller-scoped client per request. Never uses a service key. */
export async function createServerSupabaseClient() {
  const { url, key } = publicConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values: { name: string; value: string; options: CookieOptions }[]) {
        values.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}

/** Public reads deliberately ignore admin cookies so drafts never enter public responses. */
export function createAnonymousClient() {
  const { url, key } = publicConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
