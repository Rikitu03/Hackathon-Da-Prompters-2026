import test from "node:test";
import assert from "node:assert/strict";
import {
  progressOf,
  reconcile,
  signature,
  storageKey,
  validateFile,
  safeHttps,
  serviceMessage,
  stageForPath,
  journeyProgress,
  nextStage,
  citedSegments,
} from "../src/lib/applicant/model.ts";

const item = {
  id: "r1",
  title: "Enrollment",
  description: "Current document",
  required: true,
  steps: ["Ask the registrar"],
  faqs: [],
};
test("progress counts only current requirements and never produces NaN", () => {
  assert.deepEqual(progressOf([], {}), { prepared: 0, total: 0, percent: 0 });
  assert.deepEqual(
    progressOf([item, { ...item, id: "r2" }, { ...item, id: "r3" }], {
      r1: { status: "prepared" },
      removed: { status: "prepared" },
    }),
    { prepared: 1, total: 3, percent: 33 },
  );
});
test("cycle and requirement storage keys isolate application cycles", () => {
  assert.notEqual(storageKey("2026", "r1"), storageKey("2027", "r1"));
  assert.notEqual(storageKey("2026", "r1"), storageKey("2026", "r2"));
});
test("valid saved statuses survive JSON serialization and refresh", () => {
  for (const status of [
    "not-started",
    "in-progress",
    "needs-review",
    "prepared",
  ]) {
    const entry = { status, signature: signature(item) };
    assert.deepEqual(reconcile(item, JSON.parse(JSON.stringify(entry))), entry);
  }
});
test("changed instructions require review until explicitly acknowledged", () => {
  const old = { status: "prepared", signature: signature(item) };
  const updated = { ...item, steps: ["A newly published process"] };
  const flagged = reconcile(updated, old);
  assert.equal(flagged.status, "needs-review");
  assert.equal(
    reconcile(updated, JSON.parse(JSON.stringify(flagged))).status,
    "needs-review",
  );
  assert.equal(
    reconcile(updated, { status: "prepared", signature: signature(updated) })
      .status,
    "prepared",
  );
});
test("changed source information also requires another review", () => {
  const source = {
    id: "s1",
    title: "Guide",
    url: "https://example.org",
    reviewedAt: "2026-01-01",
  };
  assert.equal(
    reconcile(
      item,
      { status: "prepared", signature: signature(item, [source]) },
      [{ ...source, reviewedAt: "2026-02-01" }],
    ).status,
    "needs-review",
  );
});
test("malformed or obsolete stored records start safely", () => {
  for (const value of [
    null,
    42,
    "prepared",
    {},
    { status: "approved", signature: "x" },
    { status: "prepared" },
  ])
    assert.equal(reconcile(item, value).status, "not-started");
});
test("file validation rejects empty, oversized, wrong type, and mismatched extensions", () => {
  assert.match(
    validateFile({ name: "x.pdf", type: "application/pdf", size: 0 }),
    /empty/,
  );
  assert.match(
    validateFile({
      name: "x.pdf",
      type: "application/pdf",
      size: 4 * 1024 * 1024 + 1,
    }),
    /larger than 4 MB/,
  );
  assert.match(
    validateFile({ name: "x.svg", type: "image/svg+xml", size: 200 }),
    /JPG/,
  );
  assert.match(
    validateFile({ name: "x.pdf", type: "image/png", size: 200 }),
    /does not match/,
  );
  for (const [name, type] of [
    ["x.PDF", "application/pdf"],
    ["x.png", "image/png"],
    ["x.jpg", "image/jpeg"],
    ["x.jpeg", "image/jpeg"],
  ])
    assert.equal(validateFile({ name, type, size: 4 * 1024 * 1024 }), null);
});
test("the exact server upload boundary is accepted", () => {
  assert.equal(validateFile({ name: "x.pdf", type: "application/pdf", size: 4 * 1024 * 1024 }), null);
});
test("journey stages follow route families", () => {
  for (const [path, expected] of [["/", null], ["/dashboard", null], ["/onboarding", "guide"], ["/scholarships", "guide"], ["/scholarships/id", "guide"], ["/my-checklist", "checklist"], ["/requirements/id", "checklist"], ["/document-review", "document"], ["/assistant", "ask"], ["/summary", "official"]])
    assert.equal(stageForPath(path), expected);
});
test("optional visit work and checklist progress do not imply official submission", () => {
  const input = { hasCycle: false, prepared: 0, total: 0, documentsChecked: 0, asked: false };
  assert.equal(nextStage(journeyProgress(input)), "guide");
  assert.equal(nextStage(journeyProgress({ ...input, hasCycle: true, prepared: 1, total: 2 })), "checklist");
  assert.equal(nextStage(journeyProgress({ ...input, hasCycle: true, prepared: 2, total: 2, documentsChecked: 1 })), "ask");
  assert.equal(journeyProgress({ ...input, asked: true }).official, "todo");
});
test("inline citations map known groups and keep unknown numbers as text", () => {
  assert.deepEqual(citedSegments("Hall [1]. ID [1, 2]. Odd [7].", 2), [
    { text: "Hall " }, { cite: 1 }, { text: ". ID " }, { cite: 1 }, { cite: 2 }, { text: ". Odd [7]." },
  ]);
  assert.deepEqual(citedSegments("Unknown [1, 9].", 2), [{ text: "Unknown [1, 9]." }]);
});
test("contract failures give an actionable explanation", () => {
  assert.match(serviceMessage(403, "Ask Gabay"), /another site/);
  assert.match(serviceMessage(404, "Ask Gabay"), /no longer published/);
  assert.match(serviceMessage(422, "Document review"), /couldn't be read/);
});
test("citation links allow HTTPS and block executable protocols", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.org",
    null,
    "/relative",
  ])
    assert.equal(safeHttps(url), null);
  assert.equal(
    safeHttps("https://scholars.pasigcity.gov.ph/"),
    "https://scholars.pasigcity.gov.ph/",
  );
});
test("integration failures explain recovery without fake provider answers", () => {
  assert.match(serviceMessage(400, "Ask Gabay"), /Check your input/);
  assert.match(serviceMessage(413, "OCR"), /smaller/);
  assert.match(serviceMessage(429, "Ask Gabay"), /wait/);
  assert.match(serviceMessage(501, "OCR"), /not connected/);
  assert.match(serviceMessage(503, "OCR"), /unavailable/);
  assert.match(serviceMessage(500, "OCR"), /Try again/);
});
