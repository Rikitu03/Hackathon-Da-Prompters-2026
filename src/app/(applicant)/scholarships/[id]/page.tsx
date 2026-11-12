import { PageShell } from "@/components/page-shell";
import { PublishedGuide } from "@/components/published-guide";
export default async function ScholarshipPage({ params }: { params: Promise<{ id: string }> }) {
  return <PageShell><PublishedGuide id={(await params).id}/></PageShell>;
}
