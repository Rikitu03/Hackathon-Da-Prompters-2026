import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, ArrowRight, Inbox, LoaderCircle } from "lucide-react";

export const inputClass = "mt-1.5 block min-w-0 min-h-12 w-full rounded-xl border border-[#d7e3ef] bg-white px-4 py-3 text-base leading-6 text-[#102a51] placeholder:text-[#53657b] shadow-[0_1px_1px_rgba(20,55,30,.035)] transition-[border-color,background-color] duration-150 hover:border-[#9cbde0] focus-visible:border-[#155bb0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0] disabled:cursor-not-allowed disabled:bg-[#f3f6fa]";
export const areaClass = inputClass + " min-h-[92px] resize-y";
export const cardClass = "min-w-0 rounded-2xl border border-[#d7e3ef] bg-white p-5 shadow-[0_6px_30px_rgba(28,61,37,0.035)] sm:p-6";

export function Button({ children, variant = "primary", busy, className = "", disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "quiet" | "danger"; busy?: boolean }) {
  const variants = {
    primary: "border-[#155bb0] bg-[#155bb0] text-white hover:bg-[#104a92] active:bg-[#0e3e7c]",
    outline: "border-[#b5c9e0] bg-white text-[#102a51] hover:bg-[#eef6ff]",
    quiet: "border-transparent bg-transparent text-[#375d85] hover:bg-[#eef6ff]",
    danger: "border-[#e9bdbc] bg-[#fff9f8] text-[#9b3530] hover:bg-[#fbeae8]"
  };
  return <button {...props} disabled={disabled || busy} className={(variant === "primary" ? "admin-primary-action " : "") + "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-[background-color,border-color,transform] duration-150 active:scale-[.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0] disabled:cursor-not-allowed disabled:opacity-60 " + variants[variant] + " " + className}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}{children}</button>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cardClass + " " + className}>{children}</section>;
}
export function Field({ label, htmlFor, hint, required, children }: { label: string; htmlFor: string; hint?: string; required?: boolean; children: ReactNode }) {
  return <div className="min-w-0"><label htmlFor={htmlFor} className="block text-sm font-semibold text-[#102a51]">{label}{required ? <span className="ml-1 text-[#aa3c31]" aria-label="required">*</span> : null}</label>{children}{hint ? <p className="mt-1.5 text-xs leading-5 text-[#53657b]">{hint}</p> : null}</div>;
}
export function Pill({ status }: { status: string }) {
  const colors = status === "published" || status === "approved" || status === "ready" ? "bg-[#e6f4e8] text-[#256044] border-[#c5e4cd]" : status === "archived" || status === "blocked" ? "bg-[#f4eded] text-[#81534e] border-[#ead9d7]" : "bg-[#fff5dd] text-[#77581d] border-[#f1dda6]";
  return <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize " + colors}>{status.replaceAll("_", " ")}</span>;
}
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const styles = tone === "error" ? "border-[#edc6c2] bg-[#fff8f6] text-[#8f352e]" : tone === "success" ? "border-[#cce7d1] bg-[#f0f8f1] text-[#226743]" : "border-[#d7e3ef] bg-[#eef6ff] text-[#284c73]";
  return <div role={tone === "error" ? "alert" : "status"} className={"flex items-start gap-3 rounded-xl border px-4 py-3.5 text-base leading-6 " + styles}><AlertCircle aria-hidden="true" size={19} strokeWidth={1.9} className="mt-[3px] shrink-0 self-start" /><div className="min-w-0 flex-1 leading-6">{children}</div></div>;
}
export function Empty({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#c7d9ea] bg-[#f7fbff] px-5 py-12 text-center"><span className="mb-4 rounded-2xl bg-[#eef6ff] p-3 text-[#155bb0]"><Inbox aria-hidden="true" className="h-6 w-6" /></span><h3 className="text-base font-semibold text-[#102a51]">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-[#53657b]">{message}</p>{children ? <div className="mt-5">{children}</div> : null}</div>;
}
export function Heading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div className="max-w-2xl">{eyebrow ? <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#155bb0]">{eyebrow}</p> : null}<h1 className="text-2xl font-semibold tracking-tight text-[#102a51] sm:text-3xl">{title}</h1>{description ? <p className="mt-2 text-sm leading-6 text-[#53657b]">{description}</p> : null}</div>{action}</div>;
}
export function StepLink({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#155bb0]">{children}<ArrowRight aria-hidden="true" className="h-4 w-4" /></span>;
}
