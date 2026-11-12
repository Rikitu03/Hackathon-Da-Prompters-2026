import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title:"GabayIskolar", description:"Independent scholarship preparation companion for Pasig students" };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
