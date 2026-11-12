import { body, databaseError, endpoint, json, requireAdmin, sameOrigin } from "@/lib/api";
import { guideSchema } from "@/lib/guides/schema";
export async function GET() {
  return endpoint(async () => {
    const { client } = await requireAdmin();
    const { data, error } = await client.from("application_cycles")
      .select("id,program_id,academic_year,status,published_at,scholarship_programs(id,title,status)")
      .order("academic_year", { ascending: false }).limit(100);
    databaseError(error);
    return json({ guides: data });
  });
}
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { client } = await requireAdmin(true);
    const document = await body(request, guideSchema);
    const { data, error } = await client.rpc("save_guide", { p_document: document });
    databaseError(error);
    return json({ guide: data }, document.cycleId ? 200 : 201);
  });
}
