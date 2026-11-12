import {
  ApplicantProvider,
  WorkspaceShell,
} from "@/components/applicant/workspace";
export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApplicantProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </ApplicantProvider>
  );
}
