import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = { title:"GabayIskolar", description:"Independent scholarship preparation companion for Pasig students" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}<Toaster /></body></html>; }
