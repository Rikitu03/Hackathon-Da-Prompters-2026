import { z } from "zod";
import { body, databaseError, endpoint, json, requireAdmin, sameOrigin } from "@/lib/api";
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { client } = await requireAdmin(true);
    const payload = await body(request, z.object({ title: z.string().trim().min(1).max(300), description: z.string().trim().max(6000).default("") }).strict());
    const { data, error } = await client.from("scholarship_programs").insert({ ...payload, status: "draft" }).select().single();
    databaseError(error);
    return json({ program: data }, 201);
  });
}
