import { GuideDetail } from "@/components/applicant/catalogue";
export default async function ScholarshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <GuideDetail id={(await params).id} />;
}
