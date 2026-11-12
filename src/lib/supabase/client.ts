import { createClient } from "@supabase/supabase-js";
/** Public/anon browser client: relies on database Row Level Security. */
export function createPublicSupabaseClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url || !key) throw new Error("Supabase public configuration missing");
 return createClient(url,key);
}
