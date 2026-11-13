import type { ReactNode } from "react";
import { AdminWorkspaceShell } from "@/components/admin/workspace-shell";

/** Shared layout persists across client-side admin navigation. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>;
}
