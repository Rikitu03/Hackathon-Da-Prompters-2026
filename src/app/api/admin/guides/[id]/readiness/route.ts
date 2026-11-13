import { databaseError, endpoint, json, requireAdmin, uuid } from "@/lib/api";
import { adminGuide } from "@/lib/guides/data";
import { publicationReadiness } from "@/lib/guides/readiness";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const { client, role } = await requireAdmin();
    const id = uuid.parse((await context.params).id);
    const guide = await adminGuide(client, id);
    const { data, error } = await client.from("knowledge_sources").select("id,reviewed_at").eq("cycle_id", id);
    databaseError(error);
    return json(publicationReadiness(guide, new Set(data!.filter((source) => source.reviewed_at).map((source) => source.id)), role === "publisher"));
  });
}
