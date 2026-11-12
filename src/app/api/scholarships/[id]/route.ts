import { endpoint, json, uuid } from "@/lib/api";
import { createAnonymousClient } from "@/lib/supabase/server";
import { publicProgram } from "@/lib/guides/data";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => json({ program: await publicProgram(createAnonymousClient(), uuid.parse((await context.params).id)) }));
}
