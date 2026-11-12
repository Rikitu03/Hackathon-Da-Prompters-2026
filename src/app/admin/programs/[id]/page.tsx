import { AdminConsole } from "@/components/admin/console";
export default async function AdminProgramDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminConsole section="programs" programId={id} />; }
