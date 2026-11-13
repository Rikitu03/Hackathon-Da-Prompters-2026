import { body, databaseError, endpoint, json, requireAdmin, sameOrigin } from "@/lib/api";
import { contentSchema } from "@/lib/guides/content-schema";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { client } = await requireAdmin(true);
    const { action, ...payload } = await body(request, contentSchema);
    const { data, error } = await client.rpc("save_admin_content", { p_action: action, p_payload: payload });
    databaseError(error);
    return json({ guide: data });
  });
}
