"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { Clock3, GraduationCap, Search, X } from "lucide-react";

const maxRecent = 6;
const keyFor = (scope: "demo" | "admin") => "gabayiskolar-" + scope + "-recent-searches-v1";

type SearchItem = { text: string; type: "program" | "recent" };

/** Client-side suggestions grounded in visible program names; history stays in this browser tab. */
export function ProgramSearch({ value, onChange, programNames, scope }: {
  value: string;
  onChange: (value: string) => void;
  programNames: string[];
  scope: "demo" | "admin";
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(keyFor(scope)) || "[]");
      setHistory(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, maxRecent) : []);
    } catch {
      setHistory([]);
    }
  }, [scope]);

  const trimmed = value.trim().toLocaleLowerCase();
  const matchingHistory = history
    .filter(name => !trimmed || name.toLocaleLowerCase().includes(trimmed))
    .slice(0, 6);
  const matchingPrograms = programNames
    .filter(name => !trimmed || name.toLocaleLowerCase().includes(trimmed))
    .filter(name => !matchingHistory.some(recent => recent.toLocaleLowerCase() === name.toLocaleLowerCase()))
    .slice(0, 6);
  const options: SearchItem[] = [
    ...matchingHistory.map(text => ({ text, type: "recent" as const })),
    ...matchingPrograms.map(text => ({ text, type: "program" as const }))
  ].slice(0, 8);

  function remember(value: string) {
    const term = value.trim().slice(0, 120);
    if (!term) return;
    const next = [term, ...history.filter(item => item.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, maxRecent);
    setHistory(next);
    try { sessionStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* storage blocked: in-memory only */ }
  }
  function select(value: string) {
    onChange(value);
    remember(value);
    setActive(-1);
    setOpen(false);
  }
  function clearHistory() {
    setHistory([]);
    try { sessionStorage.removeItem(keyFor(scope)); } catch { /* storage blocked */ }
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!options.length) return;
      setActive(index => event.key === "ArrowDown"
        ? (index + 1) % options.length
        : (index <= 0 ? options.length - 1 : index - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (open && active >= 0 && options[active]) select(options[active].text);
      else { remember(value); setOpen(false); }
    }
  }

  return <div className="relative min-w-0"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) {setOpen(false);setActive(-1);} }}
  >
    <label htmlFor="program-search" className="sr-only">Search scholarship programs</label>
    <div className="relative">
      <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#53657b]"/>
      <input id="program-search" type="search" value={value} autoComplete="off"
        placeholder="Search programs…" role="combobox" aria-autocomplete="list"
        aria-controls={listId} aria-expanded={open}
        aria-activedescendant={open && active >= 0 ? listId + "-option-" + active : undefined}
        className="mt-1.5 block min-h-12 w-full min-w-0 rounded-xl border border-[#d7e3ef] bg-white py-3 pl-11 pr-12 text-base text-[#102a51] shadow-sm outline-none transition-colors duration-150 placeholder:text-[#53657b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155bb0]"
        onChange={event=>{onChange(event.target.value);setActive(-1);setOpen(true);}}
        onFocus={()=>setOpen(true)} onKeyDown={onKeyDown}
      />
      {value ? <button type="button" aria-label="Clear search"
        onClick={()=>{onChange("");setActive(-1);setOpen(true);}}
        className="absolute right-1.5 top-[calc(50%+3px)] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#53657b] hover:bg-[#eef6ff] focus-visible:outline-2 focus-visible:outline-[#155bb0]"
      ><X size={18}/></button> : null}
    </div>
    {open && <div id={listId} role="listbox" aria-label="Search suggestions"
      className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-[#d7e3ef] bg-white p-2 shadow-[0_16px_48px_rgba(20,49,32,0.14)]"
    >
      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
        <span className="text-xs font-semibold text-[#53657b]">{trimmed ? "Matching programs and searches" : "Recent searches & available programs"}</span>
        {history.length > 0 && <button type="button" onClick={clearHistory}
          className="min-h-9 rounded-md px-2 text-xs font-semibold text-[#155bb0] hover:bg-[#eef6ff]"
        >Clear history</button>}
      </div>
      {options.length ? options.map((item,index) =>
        <button type="button" role="option" id={listId+"-option-"+index} aria-selected={index===active}
          key={item.type+":"+item.text}
          className={"flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm leading-6 text-[#102a51] transition-colors hover:bg-[#eef6ff] " + (index===active?"bg-[#eef6ff]":"")}
          onMouseDown={event=>event.preventDefault()}
          onClick={()=>select(item.text)}
        >{item.type==="recent"?<Clock3 size={17} aria-hidden="true" className="shrink-0 text-[#53657b]"/>:<GraduationCap size={17} aria-hidden="true" className="shrink-0 text-[#53657b]"/>}
          <span className="min-w-0 flex-1 truncate">{item.text}</span>
          <span className="shrink-0 text-xs text-[#53657b]">{item.type==="recent"?"Recent":"Program"}</span>
        </button>) : <p className="px-3 py-4 text-sm text-[#53657b]">No matching programs. Try a different search.</p>}
      <p className="border-t border-[#d7e3ef] px-3 py-2 text-xs leading-5 text-[#53657b]">Recent searches stay in this browser tab and can be cleared anytime.</p>
    </div>}
  </div>;
}
