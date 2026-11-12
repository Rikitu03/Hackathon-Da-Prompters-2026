"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  MessageCircle,
  Send,
  Square,
} from "lucide-react";
import { askGabay, type ChatReply } from "@/lib/applicant/api";
import { citedSegments, safeHttps } from "@/lib/applicant/model";
import { CHAT_CLIENT_TIMEOUT_MS, CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai-limits";
import { closedCycleNotice, cycleWindow } from "@/lib/cycle-window";
import { JourneyRail } from "./journey";
import { Empty, Notice, OfficialLink, useWorkspace } from "./workspace";

type Message = {
  id: number;
  role: "user" | "assistant" | "notice";
  text: string;
  sources?: Extract<ChatReply, { kind: "answer" }>["sources"];
  officialUrl?: string | null;
};
export function Assistant({
  initialRequirementId = "",
}: {
  initialRequirementId?: string;
}) {
  const { guide, cycle, loading, recordQuestion } = useWorkspace();
  const closed = !!cycle && cycleWindow(cycle.start, cycle.end) === "closed";
  const [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [requirementId, setRequirementId] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [last, setLast] = useState(""),
    [simulated, setSimulated] = useState(false);
  const controller = useRef<AbortController | null>(null),
    sequence = useRef(0),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, pending]);
  useEffect(() => {
    controller.current?.abort();
    setMessages([]);
    setError("");
    setInput("");
    setLast("");
    setRequirementId(
      cycle?.requirements.some((r) => r.id === initialRequirementId)
        ? initialRequirementId
        : "",
    );
    setSimulated(false);
    setPending(false);
  }, [cycle, initialRequirementId]);
  async function send(text: string, retry = false) {
    if (!cycle || closed || simulated || pending || !text.trim()) return;
    const message = text.trim().slice(0, CHAT_MESSAGE_MAX_CHARS);
    setError("");
    setLast(message);
    setInput("");
    if (!retry)
      setMessages((m) => [
        ...m,
        { id: ++sequence.current, role: "user", text: message },
      ]);
    setPending(true);
    const c = new AbortController();
    controller.current = c;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      c.abort();
    }, CHAT_CLIENT_TIMEOUT_MS);
    try {
      const answer = await askGabay(
        cycle.id,
        message,
        requirementId || undefined,
        c.signal,
      );
      if (!c.signal.aborted) {
        setMessages((m) => [
          ...m,
          {
            id: ++sequence.current,
            role: answer.kind === "answer" ? "assistant" : "notice",
            text: answer.answer,
            ...(answer.kind === "answer" ? { sources: answer.sources } : { officialUrl: answer.officialUrl }),
          },
        ]);
        recordQuestion();
      }
    } catch (e) {
      if (!c.signal.aborted || timedOut)
        setError(
          timedOut
            ? "The assistant took too long. Try again, or use the written preparation guide."
            : e instanceof Error
              ? e.message
              : "Could not reach Ask Gabay. Check your connection and try again.",
        );
    } finally {
      clearTimeout(timeout);
      if (controller.current === c) {
        setPending(false);
        controller.current = null;
      }
    }
  }
  function showExample() {
    controller.current?.abort();
    setPending(false);
    setError("");
    setSimulated(true);
    setMessages([
      {
        id: ++sequence.current,
        role: "user",
        text: "Can GabayIskolar confirm that I’m eligible?",
      },
      {
        id: ++sequence.current,
        role: "notice",
        text: "GabayIskolar helps you prepare. It cannot determine eligibility or approve an application. Confirm current rules and application instructions with the official scholarship office.",
        officialUrl: cycle?.officialUrl,
      },
    ]);
  }
  return (
    <>
      <JourneyRail current="ask" />
      <div className="page-heading">
        <h1>Ask Gabay</h1>
        <p>A little guidance when you’re not sure of the next step.</p>
      </div>
      {!cycle || !guide ? (
        <>
          <Empty
            title={
              loading ? "Your guide is loading" : "Choose a guide to ask about"
            }
            detail="The assistant needs your selected scholarship cycle to look for relevant published guidance."
          />
          <div className="demo-switch">
            <p>See the conversation layout without sending a request.</p>
            <button className="btn secondary compact" onClick={showExample}>
              View simulated conversation
            </button>
          </div>
        </>
      ) : null}
      {(cycle || simulated) && (
        <div className="chat-layout">
          <section className="chat-panel">
            <header className="chat-header">
              <span className="assistant-symbol">
                <MessageCircle size={23} />
              </span>
              <div>
                <h2>Your preparation companion</h2>
                <p>{guide?.title ?? "Simulated conversation"}</p>
              </div>
            </header>
            {simulated && (
              <Notice tone="warning">
                <strong>Simulated conversation.</strong> This fixed example is
                not a live AI answer.{" "}
                <button
                  className="text-link"
                  onClick={() => {
                    setSimulated(false);
                    setMessages([]);
                  }}
                >
                  Return to live assistant
                </button>
              </Notice>
            )}
            <div
              className="chat-log"
              role="log"
              aria-label="Conversation with Gabay"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {!messages.length && (
                <div className="chat-welcome">
                  <MessageCircle size={38} />
                  <h2>What would you like to understand?</h2>
                  <p>
                    Ask about your chosen guide or a particular requirement.
                    Answers should point you back to published sources.
                  </p>
                  <div className="suggested-questions">
                    {[
                      "Where should I start preparing?",
                      "What should I check on my documents?",
                    ].map((q) => (
                      <button key={q} onClick={() => setInput(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => m.role === "notice" ? (
                <aside key={m.id} role="note" className="chat-notice">
                  <h3>Not in the published guide</h3>
                  <p>{m.text}</p>
                  {safeHttps(m.officialUrl ?? cycle?.officialUrl) && <a className="text-link" href={safeHttps(m.officialUrl ?? cycle?.officialUrl)!} target="_blank" rel="noopener noreferrer">Open the official page<ArrowUpRight size={16} /></a>}
                </aside>
              ) : (
                <article key={m.id} className={`chat-message ${m.role}`}>
                  <strong>
                    {m.role === "user" ? "You" : "Gabay"}
                    {simulated ? " · simulated" : ""}
                  </strong>
                  <p>{citedSegments(m.text, m.sources?.length ?? 0).map((segment, i) => {
                    if ("text" in segment) return segment.text;
                    const url = safeHttps(m.sources?.[segment.cite - 1]?.url);
                    return url ? <a key={i} className="inline-citation" href={url} target="_blank" rel="noopener noreferrer">[{segment.cite}]</a> : <span key={i}>[{segment.cite}]</span>;
                  })}</p>
                  {m.sources?.length ? (
                    <div className="citation-chips">
                      {m.sources.map((s, i) => {
                        const url = safeHttps(s.url);
                        return url ? (
                          <a
                            key={`${s.sourceId}-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {i + 1} {s.title}
                            <ArrowUpRight size={12} />
                          </a>
                        ) : (
                          <span key={`${s.sourceId}-${i}`}>
                            {i + 1} {s.title} · No link provided
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    m.role === "assistant" && (
                      <small>
                        No cited evidence supplied. Check official guidance.
                      </small>
                    )
                  )}
                </article>
              ))}
              {pending && (
                <p className="chat-pending" role="status">
                  Looking through the guide…
                </p>
              )}
              <div ref={end} />
            </div>
            {error && (
              <Notice tone="error">
                <p>{error}</p>
                <div className="inline-actions">
                  <button
                    className="text-link"
                    onClick={() => send(last, true)}
                  >
                    Retry last question
                  </button>
                  <OfficialLink className="text-link" />
                </div>
              </Notice>
            )}
            {closed && <Notice>{closedCycleNotice(cycle!.end!)}</Notice>}
            <p className="helper chat-privacy" id="chat-privacy">Don&apos;t include names, addresses or ID numbers. Lumen, the AI service, stores chat messages.</p>
            <form
              className="chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <label className="sr-only" htmlFor="gabay-message">
                Your scholarship question
              </label>
              <textarea
                id="gabay-message"
                value={input}
                maxLength={CHAT_MESSAGE_MAX_CHARS}
                aria-describedby="chat-privacy chat-composer-help"
                rows={2}
                placeholder={
                  simulated
                    ? "Return to live assistant to ask a question"
                    : "Ask about your selected guide…"
                }
                disabled={!cycle || closed || simulated || pending}
                onChange={(e) => setInput(e.target.value.slice(0, CHAT_MESSAGE_MAX_CHARS))}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              {pending ? (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Stop request"
                  onClick={() => {
                    controller.current?.abort();
                    setPending(false);
                    setError(
                      "Request stopped. You can retry your last question.",
                    );
                  }}
                >
                  <Square size={18} />
                </button>
              ) : (
                <button
                  className="btn primary send-button"
                  disabled={!input.trim() || !cycle || closed || simulated}
                  aria-label="Send question"
                >
                  <Send size={18} />
                </button>
              )}
              <p className="helper" id="chat-composer-help">
                Enter to send · Shift + Enter for a new line · {input.length}/{CHAT_MESSAGE_MAX_CHARS}
              </p>
            </form>
          </section>
          <aside className="context-panel">
            <BookOpen size={27} />
            <h2>Keep the context clear.</h2>
            <label className="field">
              Ask about
              <select
                value={requirementId}
                onChange={(e) => setRequirementId(e.target.value)}
                disabled={pending || simulated}
              >
                <option value="">The whole guide</option>
                {cycle?.requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Gabay uses the selected cycle and requirement. It may be
              unavailable while the service is being connected.
            </p>
            <p className="helper">
              Avoid sharing personal identifiers or document contents in chat.
              Answers do not determine eligibility.
            </p>
            <OfficialLink className="text-link" />
            {!simulated && (
              <button className="text-link" onClick={showExample}>
                View simulated conversation
              </button>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
