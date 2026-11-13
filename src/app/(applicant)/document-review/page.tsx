import { DocumentReview } from "@/components/applicant/document-review";
export default async function Page({ searchParams }: { searchParams: Promise<{ requirement?: string }> }) {
  const { requirement } = await searchParams;
  return <DocumentReview initialRequirementId={requirement} />;
}
