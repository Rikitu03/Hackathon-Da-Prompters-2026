import Link from "next/link";
import { ArrowRight, BookOpenCheck, ScanText, MessagesSquare } from "lucide-react";

export default function HomePage() {
 return <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
  <nav className="mb-24 flex items-center justify-between"><span className="text-xl font-bold tracking-tight text-emerald-900">gabay<span className="text-emerald-600">iskolar.</span></span><Link className="text-sm font-medium underline underline-offset-4" href="/admin">Admin portal</Link></nav>
  <div className="max-w-3xl"><p className="mb-5 text-sm font-semibold uppercase tracking-widest text-emerald-700">Scholarship preparation, made clearer</p><h1 className="text-5xl font-semibold tracking-tight md:text-7xl">Every requirement deserves a <span className="text-emerald-700">clear path.</span></h1><p className="mt-8 max-w-xl text-lg leading-8 text-slate-700">Understand scholarship requirements, follow a step-by-step preparation journey, and ask better questions before applying through official channels.</p><Link href="/scholarships" className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900">Explore scholarship guides <ArrowRight size={18}/></Link></div>
  <section className="mt-20 grid gap-4 md:grid-cols-3">{[{icon:<BookOpenCheck/>,title:"Requirement journeys",detail:"See what to prepare, where to obtain it, and what to check."},{icon:<ScanText/>,title:"Document review",detail:"OCR-assisted extraction with student verification."},{icon:<MessagesSquare/>,title:"Source-grounded AI",detail:"Contextual answers from published guidance."}].map(x=><article key={x.title} className="rounded-2xl border border-emerald-100 bg-white p-6"><div className="mb-4 text-emerald-700">{x.icon}</div><h2 className="font-semibold">{x.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{x.detail}</p></article>)}</section>
  <footer className="mt-16 border-t pt-6 text-xs leading-6 text-slate-600">Independent hackathon prototype. Not endorsed by the Pasig City Government. Scholarship decisions and application submission remain with the authorized office.</footer>
 </main>;
}
