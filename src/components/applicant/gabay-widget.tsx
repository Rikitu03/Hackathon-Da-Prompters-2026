"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, BookOpen, CheckSquare, ClipboardList, FileText, ListChecks, MessageCircle, Minus, RotateCcw, Send, Sparkles, Square, X } from "lucide-react";
import { CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai-limits";
import { citedSegments, safeHttps } from "@/lib/applicant/model";
import { closedCycleNotice, cycleWindow } from "@/lib/cycle-window";
import { GabayContext } from "./gabay-context";
import { useGabayChat, type GabayMessage as Message } from "./use-gabay-chat";
import { useWorkspace } from "./workspace";
import "./gabay-widget.css";

function Mascot({ size = 40 }: { size?: number }) {
  return <Image className="gabay-mascot" src="/illustrations/gabay-kingfisher.png" alt="" width={size} height={size} />;
}

function GabayMessage({ message }: { message: Message }) {
  const officialUrl = safeHttps(message.officialUrl);
  return <article className={`gabay-message gabay-message-${message.role}`}>
    {message.role !== "user" && <span className="gabay-avatar"><Mascot /></span>}
    <div className="gabay-bubble">
      <span className="gabay-speaker">{message.role === "user" ? "You" : "Gabay"}</span>
      {message.role === "notice" && <strong className="gabay-notice-label">Published guidance unavailable</strong>}
      <p>{citedSegments(message.text, message.sources?.length ?? 0).map((segment, i) => {
        if ("text" in segment) return segment.text;
        const url = safeHttps(message.sources?.[segment.cite - 1]?.url);
        return url ? <a key={i} className="gabay-citation" href={url} target="_blank" rel="noopener noreferrer">[{segment.cite}]</a> : <span key={i}>[{segment.cite}]</span>;
      })}</p>
      {!!message.sources?.length && <div className="gabay-sources" aria-label="Published sources">
        {message.sources.map((source, i) => {
          const url = safeHttps(source.url);
          return url ? <a key={`${source.sourceId}-${i}`} href={url} target="_blank" rel="noopener noreferrer">{i + 1}. {source.title}<ArrowUpRight size={12} /></a>
            : <span key={`${source.sourceId}-${i}`}>{i + 1}. {source.title} · No link provided</span>;
        })}
      </div>}
      {officialUrl && <a className="gabay-official" href={officialUrl} target="_blank" rel="noopener noreferrer">Open the official page <ArrowUpRight size={14} /></a>}
    </div>
  </article>;
}

const questions = [
  { label: "What are the requirements?", icon: ClipboardList },
  { label: "Where can I get a document?", icon: FileText },
  { label: "How do I apply?", icon: ListChecks },
  { label: "Review my checklist", icon: CheckSquare },
];

export function GabayWidget({ children }: { children: React.ReactNode }) {
  const { cycle, guide, loading, recordQuestion } = useWorkspace();
  const chat = useGabayChat(cycle?.id, recordQuestion);
  const [open, setOpen] = useState(false);
  const [requirementId, setRequirementId] = useState("");
  const [viewport, setViewport] = useState<CSSProperties>({});
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const path = usePathname();
  const legacyUrl = useRef("");
  const closed = !!cycle && cycleWindow(cycle.start, cycle.end) === "closed";
  const canSend = chat.ready && !!cycle && !closed && !guide?.demo;
  const contextId = cycle?.requirements.some((r) => r.id === requirementId) ? requirementId : "";

  const openChat = useCallback((requirement = "") => {
    setRequirementId(requirement);
    setOpen(true);
  }, []);
  const controls = useMemo(() => ({ openChat }), [openChat]);
  function dismiss() {
    setOpen(false);
    launcher.current?.focus();
  }

  // Old bookmarks still open the widget, rather than a second chat experience.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("gabay") === "open" && legacyUrl.current !== url.href) {
      legacyUrl.current = url.href;
      openChat(url.searchParams.get("requirement") ?? "");
    }
  }, [path, openChat]);
  useEffect(() => {
    if (open) input.current?.focus({ preventScroll: true });
  }, [open, canSend]);
  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "0px";
    input.current.style.height = `${Math.min(84, Math.max(38, input.current.scrollHeight))}px`;
  }, [chat.draft, open]);
  useEffect(() => {
    if (!open || !log.current) return;
    if (!chat.messages.length && !chat.pending && !chat.error) log.current.scrollTop = 0;
    else if (nearBottom.current) log.current.scrollTop = log.current.scrollHeight;
  }, [chat.messages, chat.pending, chat.error, open]);
  useEffect(() => {
    // Visual viewport follows the mobile keyboard, unlike a plain 100vh panel.
    const visual = window.visualViewport;
    if (!visual) return;
    const update = () => setViewport({
      "--gabay-viewport-height": `${visual.height}px`,
      "--gabay-keyboard-offset": `${Math.max(0, window.innerHeight - visual.height - visual.offsetTop)}px`,
    } as CSSProperties);
    update();
    visual.addEventListener("resize", update);
    visual.addEventListener("scroll", update);
    return () => {
      visual.removeEventListener("resize", update);
      visual.removeEventListener("scroll", update);
    };
  }, []);

  function send(text = chat.draft, retry = false) {
    if (!canSend) return;
    nearBottom.current = true;
    void chat.send(text, retry ? chat.last?.requirementId : contextId || undefined, retry);
  }
  function suggest(text: string) {
    chat.setDraft(text === "Review my checklist" ? "Which requirements should I review in my scholarship preparation checklist?" : text);
    input.current?.focus();
  }

  return <GabayContext.Provider value={controls}>
    {children}
    <div className="gabay-widget" style={viewport}>
      {open && <section id="gabay-chat-panel" className="gabay-panel" role="dialog" aria-modal="false" aria-labelledby="gabay-title" onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); dismiss(); }
      }}>
        <header className="gabay-header">
          <div className="gabay-header-mascot"><Mascot size={88} /></div>
          <div className="gabay-heading"><h2 id="gabay-title">Ask Gabay <Sparkles size={17} aria-hidden="true" /></h2><p>Scholarship System Assistant</p></div>
          <div className="gabay-window-actions">
            <button type="button" onClick={dismiss} aria-label="Minimize Ask Gabay"><Minus size={19} /></button>
            <button type="button" onClick={dismiss} aria-label="Close Ask Gabay"><X size={19} /></button>
          </div>
          <svg className="gabay-header-wave" viewBox="0 0 420 28" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 Q60 38 130 14 T270 16 T420 8 V28 H0Z" fill="currentColor" /></svg>
        </header>
        <div className="gabay-context">
          <BookOpen size={15} aria-hidden="true" />
          {cycle ? <label><span className="gabay-context-title">{guide?.title} · {cycle.year}</span><span className="gabay-sr-only">Ask about</span><select aria-label="Ask about" value={contextId} onChange={(event) => setRequirementId(event.target.value)} disabled={chat.pending}>
            <option value="">The whole guide</option>
            {cycle.requirements.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select></label> : <p>{loading ? "Loading your selected guide…" : "Choose a scholarship guide to start."}</p>}
        </div>
        <div className="gabay-log" role="log" aria-label="Conversation with Gabay" aria-live="polite" aria-relevant="additions text" ref={log} onScroll={() => {
          if (log.current) nearBottom.current = log.current.scrollHeight - log.current.scrollTop - log.current.clientHeight < 80;
        }}>
          <span className="gabay-today">Today</span>
          {!chat.messages.length && <div className="gabay-welcome">
            <div className="gabay-greeting"><span className="gabay-avatar"><Mascot size={48} /></span><div><h3>Hi! I&apos;m Gabay! <span aria-hidden="true">👋</span></h3><p>I can help you with scholarship requirements, documents, and application preparation.</p></div></div>
            <p className="gabay-quick-label">You can try asking:</p>
            <div className="gabay-quick-actions">{questions.map(({ label, icon: Icon }) => <button key={label} type="button" disabled={!canSend} onClick={() => suggest(label)}><Icon size={23} aria-hidden="true" /><span>{label}</span></button>)}</div>
            <p className="gabay-language">English, Filipino, or Taglish — ask in your own words.</p>
          </div>}
          {chat.messages.map((message) => <GabayMessage key={message.id} message={message} />)}
          {chat.pending && <div className="gabay-pending" role="status"><Mascot size={30} /><span className="gabay-dots" aria-hidden="true"><i /><i /><i /></span><span>Checking published guidance…</span></div>}
          {!canSend && <div className="gabay-info" role="note">
            {closed ? <p>{closedCycleNotice(cycle!.end!)}</p> : guide?.demo ? <p>This illustrative guide is a walkthrough. Choose a published scholarship guide to ask Gabay.</p> : <p>Gabay needs a selected scholarship cycle to look up published information.</p>}
            <Link href="/onboarding" onClick={dismiss}>Choose a guide <ArrowUpRight size={14} /></Link>
          </div>}
          {chat.error && <div className="gabay-error" role="alert"><p>{chat.error}</p>{chat.last && <button type="button" disabled={chat.pending || !canSend} onClick={() => send(chat.last!.text, true)}><RotateCcw size={14} />Retry last question</button>}</div>}
          {!!chat.messages.length && !chat.pending && !chat.error && <button type="button" className="gabay-followup" disabled={!canSend} onClick={() => suggest("What preparation steps should I take for this scholarship?")}>What should I prepare next?</button>}
        </div>
        <footer className="gabay-composer">
          <p className="gabay-privacy" id="gabay-privacy">Don&apos;t share personal details. Lumen stores chat messages.</p>
          <form onSubmit={(event) => { event.preventDefault(); send(); }}>
            <MessageCircle size={20} aria-hidden="true" />
            <label className="gabay-sr-only" htmlFor="gabay-question">Your scholarship question</label>
            <textarea id="gabay-question" ref={input} value={chat.draft} rows={1} maxLength={CHAT_MESSAGE_MAX_CHARS} placeholder="Ask about scholarships…" disabled={!canSend} aria-describedby="gabay-privacy gabay-input-help" onChange={(event) => chat.setDraft(event.target.value)} onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
            }} />
            {chat.pending ? <button type="button" aria-label="Stop request" onClick={chat.stop}><Square size={17} /></button> : <button type="submit" aria-label="Send question" disabled={!canSend || !chat.draft.trim()}><Send size={19} /></button>}
          </form>
          <div className="gabay-input-help" id="gabay-input-help"><span>Enter to send · Shift + Enter for a new line</span><span>{chat.draft.length}/{CHAT_MESSAGE_MAX_CHARS}</span></div>
          <p className="gabay-session-note">This visit only. Each question uses your guide, not earlier messages.</p>
        </footer>
      </section>}
      <button ref={launcher} type="button" className={`gabay-launcher${open ? " is-open" : ""}`} aria-label={open ? "Minimize Ask Gabay" : "Open Ask Gabay"} aria-expanded={open} aria-controls={open ? "gabay-chat-panel" : undefined} onClick={() => open ? dismiss() : setOpen(true)}><span className="gabay-launcher-mascot"><Mascot size={64} /></span><MessageCircle size={19} aria-hidden="true" /><span>Ask Gabay</span><Sparkles className="gabay-launcher-spark" size={15} aria-hidden="true" /></button>
    </div>
  </GabayContext.Provider>;
}
