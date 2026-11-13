import { redirect } from "next/navigation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ requirement?: string }>;
}) {
  const requirement = (await searchParams).requirement;
  redirect(`/dashboard?gabay=open${requirement ? `&requirement=${encodeURIComponent(requirement)}` : ""}`);
}
