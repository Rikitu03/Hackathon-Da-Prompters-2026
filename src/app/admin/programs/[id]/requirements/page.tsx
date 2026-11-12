import { AdminConsole } from "@/components/admin/console";
export default async function AdminProgramRequirementsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AdminConsole section="requirements" programId={id} />; }
