import { z } from "zod";
import { endpoint, json } from "@/lib/api";
import { createAnonymousClient } from "@/lib/supabase/server";
import { publicPrograms } from "@/lib/guides/data";
export async function GET(request: Request) {
  return endpoint(async () => {
    const page = z.coerce.number().int().min(1).max(10000).parse(new URL(request.url).searchParams.get("page") ?? 1);
    return json({ programs: await publicPrograms(createAnonymousClient(), page), page, pageSize: 20 });
  });
}
