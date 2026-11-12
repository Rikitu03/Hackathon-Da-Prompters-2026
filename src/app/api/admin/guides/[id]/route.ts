import { endpoint, json, requireAdmin, uuid } from "@/lib/api";
import { adminGuide } from "@/lib/guides/data";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    const { client } = await requireAdmin();
    return json({ guide: await adminGuide(client, uuid.parse((await context.params).id)) });
  });
}
