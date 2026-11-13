"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askGabay, askProductHelp, type ChatReply } from "@/lib/applicant/api";
import { CHAT_CLIENT_TIMEOUT_MS, CHAT_MESSAGE_MAX_CHARS } from "@/lib/ai-limits";

export type GabayMessage = {
  id: number;
  role: "user" | "assistant" | "notice";
  text: string;
  sources?: Extract<ChatReply, { kind: "answer" }>["sources"];
  officialUrl?: string | null;
};

// Memory only: nothing is written to browser storage or an applicant account.
// The current API accepts one question, not transcript/history/session fields.
export function useGabayChat(cycleId: string | undefined, recordQuestion: () => void, mode: "product" | "scholarship" = "scholarship") {
  const contextKey = mode === "product" ? "product" : cycleId ?? "";
  const [messages, setMessages] = useState<GabayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [loadedCycleId, setLoadedCycleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [last, setLast] = useState<{ text: string; requirementId?: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
    setDraft("");
    setPending(false);
    setError("");
    setLast(null);
    setLoadedCycleId(contextKey);
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, [contextKey]);

  const send = useCallback(async (text: string, requirementId?: string, retry = false) => {
    const question = text.trim();
    if ((mode === "scholarship" && !cycleId) || loadedCycleId !== contextKey || controller.current || !question) return;
    if (question.length > CHAT_MESSAGE_MAX_CHARS) {
      setError(`Keep your question to ${CHAT_MESSAGE_MAX_CHARS} characters.`);
      return;
    }
    // Synchronous lock also protects against two submissions before React renders.
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError("");
    setLast({ text: question, requirementId });
    if (!retry) {
      setDraft("");
      setMessages((m) => [...m, { id: ++sequence.current, role: "user", text: question }]);
    }
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, CHAT_CLIENT_TIMEOUT_MS);
    try {
      const reply = mode === "product"
        ? await askProductHelp(question, request.signal)
        : await askGabay(cycleId!, question, requirementId, request.signal);
      if (controller.current !== request || request.signal.aborted) return;
      setMessages((m) => [...m, {
        id: ++sequence.current,
        role: reply.kind === "answer" ? "assistant" : "notice",
        text: reply.answer,
        ...(reply.kind === "answer" ? { sources: reply.sources } : { officialUrl: reply.officialUrl }),
      }]);
      if (mode === "scholarship") recordQuestion();
      setLast(null);
    } catch (e) {
      if (controller.current === request && (!request.signal.aborted || timedOut)) {
        setError(timedOut
          ? "Gabay took too long to respond. Please retry your question."
          : e instanceof Error ? e.message : "Could not reach Gabay. Check your connection and retry.");
      }
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) {
        controller.current = null;
        setPending(false);
      }
    }
  }, [cycleId, loadedCycleId, recordQuestion, mode, contextKey]);

  const stop = useCallback(() => {
    if (!controller.current) return;
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setError("Request stopped. You can retry your question.");
  }, []);

  // Don't enable input until the cycle reset has finished; a fast question must
  // never be erased by a reset effect from the guide that just loaded.
  return { ready: loadedCycleId === contextKey, messages, draft, setDraft, pending, error, last, send, stop };
}
