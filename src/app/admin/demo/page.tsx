import { AdminConsole, type Section } from "@/components/admin/console";

const allowed: Section[] = ["overview", "programs", "requirements", "knowledge", "preview"];
export const metadata = { title: "Admin UI demo | GabayIskolar", description: "Read-only illustrative preview with fictional data. No login or database calls." };

export default async function AdminDemoPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams;
  const section: Section = allowed.includes(view as Section) ? view as Section : "overview";
  return <AdminConsole section={section} demoMode />;
}
