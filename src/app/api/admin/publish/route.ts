import { z } from "zod";
import { body, databaseError, endpoint, json, requireAdmin, sameOrigin } from "@/lib/api";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { client } = await requireAdmin(true);
    const payload = await body(request, z.object({ cycleId: z.string().uuid(), publish: z.boolean().default(true) }).strict());
    const { data, error } = await client.rpc("set_cycle_publication", { p_cycle_id: payload.cycleId, p_publish: payload.publish });
    databaseError(error);
    return json({ guide: data });
  });
}
