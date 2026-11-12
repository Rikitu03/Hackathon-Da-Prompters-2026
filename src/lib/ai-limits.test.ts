import { expect, it } from "vitest";
import { maxDuration as chatMax } from "@/app/api/ai/chat/route";
import { maxDuration as ocrMax } from "@/app/api/ai/ocr/route";
import { MAX_QUESTION_CHARS } from "./rag/prompt";
import { CHAT_CLIENT_TIMEOUT_MS, CHAT_MESSAGE_MAX_CHARS, OCR_CLIENT_TIMEOUT_MS } from "./ai-limits";

it("allows the route budgets and transport time", () => {
  expect(CHAT_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(chatMax * 1000 + 5000);
  expect(OCR_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(ocrMax * 1000 + 5000);
  expect(MAX_QUESTION_CHARS).toBe(CHAT_MESSAGE_MAX_CHARS);
});
