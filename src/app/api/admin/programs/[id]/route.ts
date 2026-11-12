import { z } from "zod";
import { ApiError, body, databaseError, endpoint, json, requireAdmin, sameOrigin, uuid } from "@/lib/api";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const { client } = await requireAdmin(true);
    const id = uuid.parse((await context.params).id);
    const payload = await body(request, z.object({ title: z.string().trim().min(1).max(300).optional(), description: z.string().trim().max(6000).optional() }).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one field"));
    const { data, error } = await client.from("scholarship_programs").update({ ...payload, status: "draft" }).eq("id", id).select().maybeSingle();
    databaseError(error);
    if (!data) throw new ApiError(404, "Program not found");
    return json({ program: data });
  });
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const { client } = await requireAdmin(true);
    const id = uuid.parse((await context.params).id);
    const { data, error } = await client.from("scholarship_programs").delete().eq("id", id).select("id").maybeSingle();
    databaseError(error);
    if (!data) throw new ApiError(404, "Program not found");
    return json({ deleted: id });
  });
}
