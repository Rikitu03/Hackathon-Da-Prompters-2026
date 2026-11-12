import { Assistant } from "@/components/applicant/assistant";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ requirement?: string }>;
}) {
  return <Assistant initialRequirementId={(await searchParams).requirement} />;
}
