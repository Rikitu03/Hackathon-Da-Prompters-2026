"use client";

import { usePathname } from "next/navigation";
import { ApplicantProvider } from "./workspace";
import { GabayWidget } from "./gabay-widget";

const studentRoutes = ["/dashboard", "/onboarding", "/scholarships", "/requirements", "/my-checklist", "/application-draft", "/document-review", "/assistant", "/summary"];

/** One persistent student session across home and workspace; admin stays separate. */
export function ApplicantExperience({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const applicant = path === "/" || studentRoutes.some((route) => path === route || path.startsWith(route + "/"));
  if (!applicant) return children;
  return <ApplicantProvider><GabayWidget>{children}</GabayWidget></ApplicantProvider>;
}
