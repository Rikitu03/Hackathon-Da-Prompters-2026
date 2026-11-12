import { RequirementDetail } from "@/components/applicant/preparation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ program?: string; cycle?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <RequirementDetail
      id={id}
      programId={query.program}
      cycleId={query.cycle}
    />
  );
}
