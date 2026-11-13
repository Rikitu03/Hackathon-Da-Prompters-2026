import { databaseError, endpoint, json, requireAdmin } from "@/lib/api";

export async function GET() {
  return endpoint(async () => {
    const { client } = await requireAdmin();
    const [programs, cycles, requirements, steps, faqs, sources, chunks] = await Promise.all([
      client.from("scholarship_programs").select("*").order("created_at", { ascending: false }),
      client.from("application_cycles").select("*"),
      client.from("requirements").select("*").order("position"),
      client.from("requirement_steps").select("*").order("position"),
      client.from("faqs").select("*"),
      client.from("knowledge_sources").select("*"),
      client.from("knowledge_chunks").select("source_id,content,position").order("position"),
    ]);
    for (const result of [programs, cycles, requirements, steps, faqs, sources, chunks]) databaseError(result.error);
    return json({ data: {
      programs: programs.data, cycles: cycles.data, requirements: requirements.data,
      steps: steps.data, faqs: faqs.data,
      sources: sources.data!.map((source) => ({ ...source,
        content: chunks.data!.filter((chunk) => chunk.source_id === source.id).map((chunk) => chunk.content).join(""),
      })),
    } });
  });
}
