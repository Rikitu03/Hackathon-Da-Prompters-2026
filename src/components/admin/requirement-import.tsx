"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardPaste, FileText, LoaderCircle, MapPin, UploadCloud, X } from "lucide-react";
import { mapPinUrl } from "@/lib/guides/schema";

export type RequirementSuggestion = {
  title: string;
  description: string;
  steps: string[];
  issuingOffice: string;
  officeAddress: string;
  officeHours: string;
  mapUrl: string;
};

const blank: RequirementSuggestion = {
  title:"", description:"", steps:[], issuingOffice:"",
  officeAddress:"", officeHours:"", mapUrl:""
};
const LABELS: Array<{key:Exclude<keyof RequirementSuggestion,"steps">;pattern:RegExp}> = [
  {key:"title",pattern:/^(?:requirement|document)(?:\s+(?:name|title|type))?\s*:\s*(.+)$/i},
  {key:"description",pattern:/^(?:purpose|why (?:this )?(?:document )?is needed|description)\s*:\s*(.+)$/i},
  {key:"issuingOffice",pattern:/^(?:issuing office|issued by|office name|where to get)\s*:\s*(.+)$/i},
  {key:"officeAddress",pattern:/^(?:office address|full address|address|location)\s*:\s*(.+)$/i},
  {key:"officeHours",pattern:/^(?:office hours|opening hours|hours)\s*:\s*(.+)$/i},
  {key:"mapUrl",pattern:/^(?:maps? (?:url|link|pin)|pinned location|google maps link|map location)\s*:\s*(https:\/\/\S+)$/i}
];

/** Conservative labeled-field extraction; not a factual verification or AI-written requirement. */
export function parseRequirementText(raw:string):RequirementSuggestion {
  const parsed={...blank,steps:[] as string[]};
  const lines=raw.replace(/\r\n?/g,"\n").split("\n").map(l=>l.trim()).filter(Boolean);
  for(const line of lines){
    for(const def of LABELS){
      const match=line.match(def.pattern);
      if(match && !parsed[def.key]) parsed[def.key]=match[1].trim().slice(0,def.key==="description"?6000:2000);
    }
    const step=line.match(/^(?:step\s*\d+|\d+[.)])\s*[:.\-]?\s*(.{5,})$/i);
    if(step && parsed.steps.length<20)parsed.steps.push(step[1].trim().slice(0,2000));
  }
  return parsed;
}
function hasSuggestions(s:RequirementSuggestion){
  return Boolean(s.title||s.description||s.steps.length||s.issuingOffice||s.officeAddress||s.officeHours||s.mapUrl);
}
type Props={
  open:boolean;onClose:()=>void;onApply:(s:RequirementSuggestion)=>void;
};

/**
 * Text/Markdown are parsed locally. PDF and supported images may be processed via
 * the configured OCR service, only after explicit consent for provider retention.
 */
export function RequirementImportDialog({open,onClose,onApply}:Props){
  const modal=useRef<HTMLDialogElement>(null);
  const input=useRef<HTMLInputElement>(null);
  const abort=useRef<AbortController|null>(null);
  const [selected,setSelected]=useState<File|null>(null);
  const [dragging,setDragging]=useState(false);
  const [pasted,setPasted]=useState("");
  const [draft,setDraft]=useState<RequirementSuggestion>({...blank});
  const [sourceText,setSourceText]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [consent,setConsent]=useState(false);
  const [stage,setStage]=useState<"choose"|"review">("choose");

  useEffect(()=>{
    if(!open)return;
    const dialog=modal.current;
    if(!dialog)return;
    const trigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const overflow=document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow="hidden";
    return ()=>{
      abort.current?.abort();
      abort.current=null;
      document.body.style.overflow=overflow;
      if(dialog.open)dialog.close();
      trigger?.focus();
    };
  },[open]);

  if(!open)return null;
  const supportedOcr=Boolean(selected&&/\.(pdf|png|jpe?g|webp|tiff?)$/i.test(selected.name));
  function applyRaw(raw:string){
    setSourceText(raw);
    setDraft(parseRequirementText(raw));
    setStage("review");
    setError("");
  }
  async function chooseFile(file?:File){
    if(!file)return;
    setError("");setConsent(false);setSelected(null);setStage("choose");setDraft({...blank});
    const text=/\.(md|txt)$/i.test(file.name);
    const ocr=/\.(pdf|png|jpe?g|webp|tiff?)$/i.test(file.name);
    if(!text&&!ocr){setError("Unsupported format. Choose TXT, MD, PDF, PNG, JPG, WebP or TIFF.");return;}
    if(file.size===0){setError("This document is empty. Choose a readable file.");return;}
    if(file.size>(text?512*1024:4*1024*1024)){
      setError(text?"Text files must be 512 KB or smaller.":"PDF/images must be 4 MB or smaller.");return;
    }
    setSelected(file);
    if(text){
      setBusy(true);
      try{
        const raw=await file.text();
        if(raw.includes("\u0000")||!raw.trim())throw new Error("The text was unreadable. Save as UTF-8 and retry.");
        applyRaw(raw);
      }catch(e){setError(e instanceof Error?e.message:"Unable to read this text file.");}
      finally{setBusy(false);}
    }
  }
  async function extractRemote(){
    if(!selected||!supportedOcr||!consent)return;
    const controller=new AbortController();
    abort.current=controller;setBusy(true);setError("");
    try{
      const body=new FormData();
      body.append("file",selected);body.append("consent","true");
      const response=await fetch("/api/ai/ocr",{method:"POST",body,signal:controller.signal});
      const data:unknown=await response.json().catch(()=>null);
      const record=data&&typeof data==="object"?data as Record<string,unknown>:{};
      if(!response.ok)throw new Error(typeof record.error==="string"?record.error:"Document reading failed. Try a text file or paste the content.");
      if(typeof record.rawText!=="string"||!record.rawText.trim())throw new Error("No readable text found. Try a clearer document or enter the details manually.");
      applyRaw(record.rawText);
    }catch(e){
      if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Document reading failed.");
    }finally{
      if(!controller.signal.aborted)setBusy(false);
      abort.current=null;
    }
  }
  function apply(){
    if(draft.mapUrl&&!mapPinUrl.safeParse(draft.mapUrl).success){
      setError("The map pin must be a direct HTTPS Google Maps, Apple Maps or OpenStreetMap link.");return;
    }
    if(!hasSuggestions(draft)){setError("No fields found yet. Enter or edit at least one suggested field.");return;}
    onApply({
      ...draft,
      title:draft.title.slice(0,300),
      description:draft.description.slice(0,6000),
      issuingOffice:draft.issuingOffice.slice(0,160),
      officeAddress:draft.officeAddress.slice(0,400),
      officeHours:draft.officeHours.slice(0,240),
      mapUrl:draft.mapUrl.slice(0,2000),
      steps:draft.steps.filter(Boolean).slice(0,20)
    });
    onClose();
  }
  return (
    <dialog ref={modal} aria-label="Import requirement details" aria-modal="true"
      className="admin-requirement-import-modal"
      onCancel={onClose} onClose={onClose}
      onClick={event=>{
        if(event.target!==event.currentTarget)return;
        const bounds=event.currentTarget.getBoundingClientRect();
        if(event.clientX<bounds.left||event.clientX>bounds.right||
          event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
      }}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#dce6f1] bg-white px-5 py-4 sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#53657b]">Requirement assistant</p>
          <h2 className="mt-1 text-xl font-semibold text-[#102a51]">Import requirement details</h2>
          <p className="mt-1 text-sm text-[#53657b]">Read a source, check suggestions, then apply them to your draft.</p>
        </div>
        <button type="button" autoFocus aria-label="Close requirement import" onClick={onClose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#dce6f1] bg-[#f7fafc] text-[#102a51] focus-visible:outline-2 focus-visible:outline-[#155bb0]">
          <X size={19}/>
        </button>
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        <div className="flex gap-3 text-sm text-[#53657b]">
          <span className={"rounded-full px-3 py-1.5 "+(stage==="choose"?"bg-[#155bb0] text-white":"bg-[#ecf3fb] text-[#102a51]")}>1. Choose</span>
          <span className={"rounded-full px-3 py-1.5 "+(stage==="review"?"bg-[#155bb0] text-white":"bg-[#ecf3fb] text-[#102a51]")}>2. Review & apply</span>
        </div>
        <div
          className={"rounded-2xl border-2 border-dashed p-5 text-center transition-colors "+(dragging?"border-[#155bb0] bg-[#eaf4ff]":"border-[#b8cfe5] bg-[#f7faff]")}
          onDragEnter={event=>{event.preventDefault();setDragging(true);}}
          onDragOver={event=>{event.preventDefault();setDragging(true);}}
          onDragLeave={event=>{event.preventDefault();setDragging(false);}}
          onDrop={event=>{event.preventDefault();setDragging(false);void chooseFile(event.dataTransfer.files[0]);}}
        >
          <UploadCloud size={25} className="mx-auto text-[#155bb0]"/>
          <p className="mt-2 text-sm font-semibold text-[#102a51]">Drop a document here</p>
          <p className="mt-1 text-xs leading-5 text-[#53657b]">TXT / Markdown: local text extraction up to 512 KB</p>
          <p className="text-xs leading-5 text-[#53657b]">PDF / PNG / JPG / WebP / TIFF: OCR up to 4 MB, when configured</p>
          <input ref={input} type="file" aria-label="Choose requirement source file"
            className="sr-only" accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff"
            onChange={event=>{void chooseFile(event.target.files?.[0]);event.currentTarget.value="";}}/>
          <button type="button" onClick={()=>input.current?.click()}
            className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#155bb0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#104a92]">
            <FileText size={17}/> Browse files
          </button>
          {selected&&<p className="mt-2 break-all text-xs text-[#53657b]">{selected.name} · {(selected.size/1024).toFixed(1)} KB</p>}
        </div>
        {supportedOcr&&stage==="choose"&&<div className="rounded-xl border border-[#d6e1ee] bg-[#f8fafc] p-4">
          <label className="flex items-start gap-3 text-sm leading-6 text-[#102a51]">
            <input type="checkbox" className="mt-1 accent-[#155bb0]" checked={consent} onChange={event=>setConsent(event.target.checked)}/>
            <span>I confirm this is a public or authorized source document. OCR sends it to the external document-reading service, where the provider may retain it. Do not use personal applicant documents.</span>
          </label>
          <button type="button" disabled={!consent||busy} onClick={()=>void extractRemote()}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155bb0] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy?<LoaderCircle size={17} className="animate-spin"/>:<FileText size={17}/>}
            {busy?"Reading document…":"Extract text with OCR"}
          </button>
        </div>}
        <div>
          <label htmlFor="req-import-paste" className="inline-flex items-center gap-2 text-sm font-semibold text-[#102a51]"><ClipboardPaste size={17}/> Or paste source text</label>
          <textarea id="req-import-paste" rows={4} value={pasted} onChange={event=>setPasted(event.target.value)}
            placeholder={"Document name: Certificate of Enrollment\nIssuing office: University Registrar\nStep 1: Request a current certificate from the registrar."}
            className="mt-2 w-full rounded-xl border border-[#cbd9e9] bg-white p-3 text-sm leading-6 text-[#102a51]"/>
          <button type="button" disabled={!pasted.trim()||busy} onClick={()=>applyRaw(pasted)}
            className="mt-2 rounded-lg border border-[#b8cfe5] px-3 py-2 text-sm font-semibold text-[#155bb0] disabled:opacity-40">
            Extract from pasted text
          </button>
        </div>
        {error&&<p role="alert" className="rounded-xl border border-[#e4bab3] bg-[#fff5f3] p-3 text-sm text-[#823e37]">{error}</p>}
        {stage==="review"&&<div className="space-y-4 border-t border-[#dce6f1] pt-5">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={18} className="mt-0.5 text-[#155bb0]"/>
            <div>
              <h3 className="font-semibold text-[#102a51]">Review extracted suggestions</h3>
              <p className="text-xs leading-5 text-[#53657b]">Only labeled information is recognized. Everything here is editable and unverified until you confirm it.</p>
            </div>
          </div>
          {([
            ["title","Requirement title","text"],
            ["description","Why the document is needed","textarea"],
            ["issuingOffice","Issuing office","text"],
            ["officeAddress","Full office address","text"],
            ["officeHours","Office hours","text"],
            ["mapUrl","Pinned map link","url"]
          ] as const).map(([key,label,kind])=><label key={key} className="block text-sm font-medium text-[#102a51]">
            {label}
            {kind==="textarea"?<textarea className="mt-1 block min-h-20 w-full rounded-lg border border-[#cbd9e9] p-3 font-normal" value={draft[key]} onChange={event=>setDraft(old=>({...old,[key]:event.target.value}))}/>:
              <input type={kind} className="mt-1 block min-h-11 w-full rounded-lg border border-[#cbd9e9] px-3 font-normal" value={draft[key]} onChange={event=>setDraft(old=>({...old,[key]:event.target.value}))}/>}
          </label>)}
          <label htmlFor="req-import-steps" className="block text-sm font-medium text-[#102a51]">Acquisition steps — one instruction per line</label>
          <textarea id="req-import-steps" rows={5} className="block w-full rounded-xl border border-[#cbd9e9] p-3 text-sm leading-6 text-[#102a51]"
            value={draft.steps.join("\n")} onChange={event=>setDraft(old=>({...old,steps:event.target.value.split("\n").slice(0,20)}))}/>
          <p className="text-xs leading-5 text-[#53657b]">Map links and office details must be checked against official sources before publication. This does not verify a location.</p>
          <button type="button" disabled={busy} onClick={apply}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#155bb0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#104a92]">
            <MapPin size={17}/> Apply suggestions to requirement
          </button>
        </div>}
        {sourceText&&<details className="rounded-xl border border-[#dce6f1] p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-[#102a51]">View original extracted text</summary>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#53657b]">{sourceText.slice(0,8000)}</pre>
        </details>}
      </div>
    </dialog>
  );
}
