"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, CheckCircle2, CircleAlert, Download, FileCheck2,
  FileText, FileUp, LoaderCircle, RefreshCcw, Sparkles, UploadCloud, X
} from "lucide-react";
import { Button, inputClass, areaClass } from "./ui";

export type ContextDraft = {
  title: string;
  description: string;
  academic_year: string;
  application_start: string;
  application_end: string;
  official_url: string;
};

const blank: ContextDraft = {
  title: "", description: "", academic_year: "",
  application_start: "", application_end: "", official_url: ""
};
const MB = 1024 * 1024;
const maxBytes = 8 * MB;
const maxReadableBytes = 256 * 1024;
const extensions = [".pdf", ".docx", ".doc", ".md", ".txt"];

const formFields: {key: keyof ContextDraft; label: string; placeholder: string}[] = [
  {key:"title",label:"Scholarship name",placeholder:"Official scholarship title"},
  {key:"description",label:"Guide description",placeholder:"Who is this guide for?"},
  {key:"academic_year",label:"Academic year",placeholder:"2026–2027"},
  {key:"official_url",label:"Official application URL",placeholder:"https://"},
  {key:"application_start",label:"Application opens",placeholder:"YYYY-MM-DD"},
  {key:"application_end",label:"Application closes",placeholder:"YYYY-MM-DD"}
];

const labels: Record<keyof ContextDraft, RegExp> = {
  title: /^(?:scholarship|program)\s+(?:name|title)\s*:\s*(.*)$/i,
  description: /^(?:(?:scholarship|program|guide)\s+)?description\s*:\s*(.*)$/i,
  academic_year: /^(?:academic\s+year|school\s+year|application\s+cycle)\s*:\s*(.*)$/i,
  official_url: /^(?:official\s+(?:application\s+)?(?:link|url|portal)|application\s+(?:link|url))\s*:\s*(.*)$/i,
  application_start: /^(?:application\s+(?:opens|start|start\s+date)|start\s+date)\s*:\s*(.*)$/i,
  application_end: /^(?:application\s+(?:closes|end|end\s+date)|end\s+date)\s*:\s*(.*)$/i
};

/** Deterministic labeled-text parser, NOT an AI or OCR result. */
function parseStructuredText(text: string): {draft: ContextDraft; recognized: number} {
  const draft = {...blank};
  let recognized = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^#{1,6}\s*/, "").replace(/^\*\*/, "").replace(/\*\*:/, ":");
    for (const field of formFields) {
      const match = line.match(labels[field.key]);
      if (match && match[1]?.trim() && !draft[field.key]) {
        draft[field.key] = match[1].trim().slice(0, field.key === "description" ? 6000 : 500);
        recognized++;
        break;
      }
    }
  }
  return {draft, recognized};
}

export function validateContextFile(file: Pick<File,"name"|"size">): {code: string; title: string; advice: string} | null {
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!extensions.includes(ext)) return {
    code:"415", title:"This file type is not supported",
    advice:"Choose PDF, DOC, DOCX, Markdown, or TXT. You can also download the sample template."
  };
  if (file.size === 0) return {
    code:"422", title:"This file is empty",
    advice:"Add scholarship information to the file, save it, and choose it again."
  };
  if (file.size > maxBytes) return {
    code:"413", title:"This file is too large",
    advice:"Choose a file smaller than 8 MB. Remove unnecessary images or export a text version."
  };
  return null;
}

const template = [
  "# GabayIskolar — Scholarship Guide Context",
  "",
  "Scholarship Name: ",
  "Description: ",
  "Academic Year: ",
  "Application Opens: ",
  "Application Closes: ",
  "Official Application URL: ",
  "",
  "## Document requirements",
  "### Requirement 1",
  "Document name:",
  "Required or conditional:",
  "Where to get it:",
  "Verified office address:",
  "Office hours (if verified):",
  "Map link (if verified):",
  "Steps to acquire:",
  "1.",
  "2.",
  "Additional guidance (optional):",
  "Official source URL:",
  "",
  "## Additional requirements",
  "Repeat the same structure for more documents.",
  "",
  "## Important",
  "Only provide verified information. Leave unknown dates, hours and locations blank.",
  "This file is a drafting aid; source review and publication are separate steps."
].join("\n");

function downloadTemplate() {
  const blob = new Blob([template], {type:"text/markdown;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GabayIskolar-Scholarship-Guide-Template.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type ValidationError = {code: string; title: string; advice: string};

export function ContextImport({onApply,demoMode}: {
  onApply: (draft: ContextDraft) => void;
  demoMode: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const [dragging,setDragging] = useState(false);
  const [pending,setPending] = useState(false);
  const [file,setFile] = useState<{name:string;size:number;ext:string}|null>(null);
  const [draft,setDraft] = useState<ContextDraft>(blank);
  const [recognized,setRecognized] = useState(0);
  const [error,setError] = useState<ValidationError|null>(null);
  const [applied,setApplied] = useState(false);

  function clear() {
    setFile(null); setError(null); setDraft({...blank}); setRecognized(0);
    setApplied(false); setPending(false);
    if(input.current) input.current.value="";
  }
  async function accept(fileToRead?: File) {
    if(!fileToRead) return;
    clear();
    const issue=validateContextFile(fileToRead);
    if(issue){setError(issue);return;}
    const ext="."+(fileToRead.name.split(".").pop()||"").toLowerCase();
    setFile({name:fileToRead.name,size:fileToRead.size,ext});
    if(ext!==".md" && ext!==".txt") return;
    if(fileToRead.size>maxReadableBytes) {
      setError({code:"413",title:"Text preview limit reached",advice:"For now, local text preview supports up to 256 KB. Use a smaller text file or enter the guide manually."});
      setFile(null);
      return;
    }
    setPending(true);
    try {
      const raw=await fileToRead.text();
      if(raw.includes("\u0000") || !raw.trim()) {
        setError({code:"422",title:"The text could not be read",advice:"Save the document as a plain UTF-8 .txt or .md file and retry."});
        setFile(null);
      } else {
        const parsed=parseStructuredText(raw);
        setDraft(parsed.draft);
        setRecognized(parsed.recognized);
      }
    } catch {
      setError({code:"422",title:"Unable to open the document",advice:"Verify the file is readable and select it again."});
      setFile(null);
    } finally {setPending(false);}
  }

  const hasValues=Object.values(draft).some(value=>value.trim().length>0);
  const isText=file?.ext===".txt"||file?.ext===".md";
  const canApply=Boolean(file && isText && hasValues && !pending);

  function dragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault(); e.dataTransfer.dropEffect="copy"; setDragging(true);
  }
  function dropped(e: DragEvent<HTMLElement>) {
    e.preventDefault(); setDragging(false); void accept(e.dataTransfer.files[0]);
  }
  function selected(e: ChangeEvent<HTMLInputElement>) {void accept(e.target.files?.[0]);}

  return (
    <section aria-labelledby="context-import-heading" className="admin-import-shell mb-6 overflow-hidden rounded-[22px] border border-[#cfdeee] bg-white shadow-[0_12px_38px_rgba(16,42,81,.045)]">
      <div className="grid lg:grid-cols-[.95fr_1.05fr]">
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#102a51] px-5 py-7 text-white sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full border border-white/10" aria-hidden="true"/>
          <div className="pointer-events-none absolute -right-4 -top-8 h-36 w-36 rounded-full border border-white/10" aria-hidden="true"/>
          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4a7099] bg-[#21436b] px-3 py-1.5 text-xs font-semibold text-[#e1edfc]">
              <FileText size={14}/> OFFICIAL SOURCE FIRST
            </div>
            <h2 id="context-import-heading" className="max-w-md text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-[1.18] tracking-[-.035em] text-[#f8fbff]">Start with a document.<br/><span className="text-[#b8d5fa]">Finish with a verified guide.</span></h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#d6e6fa]">Have an official scholarship announcement? Add it here, review the details, and finish your guide without starting from scratch.</p>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#d6e6fa]">
            <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#315c88] font-semibold text-white">1</span> Add source</span>
            <ArrowRight size={13} aria-hidden="true" className="text-[#8cb8e9]"/>
            <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#315c88] font-semibold text-white">2</span> Review</span>
            <ArrowRight size={13} aria-hidden="true" className="text-[#8cb8e9]"/>
            <span className="inline-flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#315c88] font-semibold text-white">3</span> Save draft</span>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 p-4 sm:p-6">
          <div className={"admin-import-zone relative flex min-h-[205px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-[background-color,border-color,box-shadow] duration-150 " +
            (dragging ? "border-[#155bb0] bg-[#e9f3ff] shadow-[inset_0_0_0_1px_#155bb0]" : "border-[#b8cee6] bg-[#f7faff] hover:border-[#80ace0] hover:bg-[#f1f7ff]")}
            onDragOver={dragOver} onDragEnter={dragOver} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false);}} onDrop={dropped}>
            <div className={"mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#155bb0] shadow-[0_4px_16px_rgba(21,91,176,.10)] " + (dragging?"scale-[1.04]":"")}><UploadCloud size={24} strokeWidth={1.75}/></div>
            <p className="text-base font-semibold text-[#102a51]">{dragging?"Drop your file to continue":"Drop a source document here"}</p>
            <p className="mt-1 text-sm text-[#53657b]">or choose one from your device</p>
            <input ref={input} aria-label="Choose scholarship source file" className="sr-only" type="file" accept=".pdf,.doc,.docx,.md,.txt" onChange={selected}/>
            <button type="button" className="admin-primary-action mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0]" onClick={()=>input.current?.click()}>
              <FileUp size={17}/> Browse files
            </button>
            <p className="mt-3 text-xs text-[#53657b]">PDF · DOC · DOCX · MD · TXT &nbsp;|&nbsp; Max 8 MB</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-xs text-[#53657b]">No file? Use the guided editor below.</span>
            <button type="button" onClick={downloadTemplate} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#155bb0] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0]"><Download size={16}/> Download template</button>
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {(pending||error||file) &&
          <motion.div key={error?"error":file?.name||"loading"} initial={reducedMotion?false:{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={reducedMotion?{opacity:0}:{opacity:0,height:0}} transition={{duration:reducedMotion?0:.2,ease:"easeOut"}} className="overflow-hidden">
            <div className="border-t border-[#d7e3ef] px-5 py-5 sm:px-7">
              {error ? <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#edc7bf] bg-[#fff7f4] p-4 text-[#7d352e]">
                <CircleAlert className="mt-0.5 shrink-0" size={20}/>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{error.title}</p>
                  <p className="mt-1 text-sm leading-6">{error.advice}</p>
                  <p className="mt-2 text-xs font-semibold">Validation status {error.code} · No file uploaded</p>
                </div>
                <button type="button" onClick={clear} aria-label="Dismiss upload error" className="rounded-md p-1 hover:bg-[#ffe9e3]"><X size={18}/></button>
              </div> : null}
              {pending ? <div role="status" className="flex items-center gap-3 text-sm text-[#53657b]"><LoaderCircle size={18} className="animate-spin text-[#155bb0]"/> Checking document format and reading text…</div> : null}
              {file && !pending && !error ? <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#d7e3ef] bg-[#f7fbff] p-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#155bb0]"><FileCheck2 size={22}/></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#102a51]">{file.name}</p>
                    <p className="text-xs text-[#53657b]">{(file.size/1024).toFixed(1)} KB · File checked locally · Not saved</p>
                  </div>
                  <button type="button" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-[#53657b] hover:bg-[#e9f3ff]" onClick={clear}><X size={16}/> Remove</button>
                </div>
                {!isText ? <div role="status" className="rounded-xl border border-[#bcd3ec] bg-[#eef6ff] p-4">
                  <p className="flex items-center gap-2 font-semibold text-[#102a51]"><Sparkles size={17} className="text-[#155bb0]"/> AI document extraction is not connected yet</p>
                  <p className="mt-2 text-sm leading-6 text-[#53657b]">The file passed the basic size and extension checks. Lumen PDF/Word extraction still needs the verified backend connection. No document was sent or saved, and no fields have been invented.</p>
                  <p className="mt-2 text-xs text-[#53657b]">You can continue manually below, or use the downloadable Markdown template for local prefill.</p>
                </div> : <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#155bb0]">LOCAL TEXT PREFILL · NOT AI</p>
                      <h3 className="mt-1 text-lg font-semibold text-[#102a51]">Review suggested fields</h3>
                      <p className="mt-1 text-sm leading-6 text-[#53657b]">{recognized>0 ? recognized+" labeled field(s) found. Check every value before copying to your draft." : "No labeled fields detected. You can fill these in, or use the sample template."}</p>
                    </div>
                    <span className="rounded-full border border-[#c8daed] bg-white px-3 py-1 text-xs font-medium text-[#294e70]">Human review required</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {formFields.map(field=><label key={field.key} className={field.key==="description"?"sm:col-span-2":""}>
                      <span className="text-sm font-semibold text-[#102a51]">{field.label}</span>
                      {field.key==="description"
                        ? <textarea rows={3} className={areaClass} value={draft[field.key]} placeholder={field.placeholder} onChange={e=>{setDraft(p=>({...p,[field.key]:e.target.value}));setApplied(false);}}/>
                        : <input className={inputClass} value={draft[field.key]} placeholder={field.placeholder} onChange={e=>{setDraft(p=>({...p,[field.key]:e.target.value}));setApplied(false);}}/>}
                    </label>)}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4edf5] pt-4">
                    <p className="max-w-lg text-xs leading-5 text-[#53657b]">Only the six guide fields above can be copied locally. Requirement instructions in the file still need manual review and entry.</p>
                    <Button disabled={!canApply} type="button" onClick={()=>{onApply(draft);setApplied(true);}}>
                      <CheckCircle2 size={17}/> Apply to draft form <ArrowRight size={16}/>
                    </Button>
                  </div>
                  {applied ? <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#21674a]"><CheckCircle2 size={17}/> Fields copied to the editor. Review and save the draft below; nothing has been published.</p> : null}
                </div>}
              </div> : null}
            </div>
          </motion.div>
        }
      </AnimatePresence>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e4edf5] bg-[#fbfdff] px-5 py-3 text-xs text-[#53657b] sm:px-7">
        <span className="inline-flex items-center gap-2"><RefreshCcw size={14} aria-hidden="true"/> Import never publishes automatically.</span>
        <span>Verification remains with the administrator.</span>
      </div>
    </section>
  );
}
