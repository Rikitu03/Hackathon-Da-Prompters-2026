import Link from "next/link";
export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-8">
    <nav className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 pb-5">
      <Link href="/" className="text-xl font-bold text-emerald-900">gabay<span className="text-emerald-600">iskolar.</span></Link>
      <div className="flex gap-5 text-sm font-medium"><Link href="/scholarships">Public guides</Link><Link href="/backend-lab">Backend walkthrough</Link><Link href="/admin">Admin</Link></div>
    </nav>{children}
    <footer className="mt-14 border-t py-5 text-xs text-slate-600">Independent preparation prototype. Applications and scholarship decisions remain with the authorized office.</footer>
  </main>;
}
