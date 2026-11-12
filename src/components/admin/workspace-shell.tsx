"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminConsole, type Section } from "./console";

/** One persistent instance owns live authentication and cached content. */
export function AdminWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";

  if (pathname === "/admin/demo" || pathname.startsWith("/admin/demo/")) {
    return <>{children}</>;
  }

  const parts = pathname.split("/").filter(Boolean);
  let section: Section = "overview";
  let programId = "";
  let startCreateProgram = false;

  if (parts[1] === "programs") {
    section = parts[3] === "requirements" ? "requirements" : "programs";
    if (parts[2] === "new") startCreateProgram = true;
    else if (parts[2]) {
      try { programId = decodeURIComponent(parts[2]); } catch { programId = parts[2]; }
    }
  } else if (parts[1] === "requirements") {
    section = "requirements";
  } else if (parts[1] === "knowledge") {
    section = "knowledge";
  } else if (parts[1] === "preview") {
    section = "preview";
  }

  return <AdminConsole section={section} programId={programId} startCreateProgram={startCreateProgram}/>;
}
