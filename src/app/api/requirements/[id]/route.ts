import { ApiError, databaseError, endpoint, json, uuid } from "@/lib/api";
import { createAnonymousClient } from "@/lib/supabase/server";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const id = uuid.parse((await context.params).id);
    const { data, error } = await createAnonymousClient().from("requirements")
      .select("*,requirement_steps(id,position,instruction),faqs(id,question,answer)").eq("id", id).maybeSingle();
    databaseError(error);
    if (!data) throw new ApiError(404, "Published requirement not found");
    data.requirement_steps.sort((a: { position: number }, b: { position: number }) => a.position-b.position);
    return json({ requirement: data });
  });
}
