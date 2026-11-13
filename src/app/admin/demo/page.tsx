import { AdminConsole, type Section } from "@/components/admin/console";

const allowed: Section[] = ["overview", "programs", "requirements", "knowledge", "preview"];
export const metadata = { title: "Admin UI demo | GabayIskolar", description: "Interactive local-only preview using fictional data. No login, live database writes, or publication." };

export default async function AdminDemoPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; program?: string; new?: string }>
}) {
  const { view, program, new: create } = await searchParams;
  const section: Section = allowed.includes(view as Section) ? view as Section : "overview";
  return <AdminConsole section={section} programId={program || ""} demoMode startCreateProgram={create === "1"} />;
}
