import {
  ApplicantProvider,
  WorkspaceShell,
} from "@/components/applicant/workspace";
import { BrowserSessionProvider } from "@/components/applicant/browser-session";
export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApplicantProvider>
      <BrowserSessionProvider><WorkspaceShell>{children}</WorkspaceShell></BrowserSessionProvider>
    </ApplicantProvider>
  );
}
