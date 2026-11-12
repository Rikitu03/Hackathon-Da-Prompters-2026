import assert from "node:assert/strict";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const base = new URL(process.env.BACKEND_TEST_URL ?? "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Development seeding must target a localhost backend");
assert.equal(process.env.SEED_PROJECT_REF, "jchbbechdldfcyralrln", "Expected the shared development project");
assert.ok(email && password, "The ignored .env.seed.local credentials file is required");
const cookies = new Map();
async function request(path, { method = "GET", data, anonymous = false, expected = 200 } = {}) {
  const response = await fetch(new URL(path, base), {
    method, redirect: "error", signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": "application/json", Origin: base.origin,
      ...(!anonymous && cookies.size ? { Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; ") } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  if (!anonymous) for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    const value = pair.slice(separator+1);
    if (!value || /max-age=0(?:;|$)/i.test(cookie)) cookies.delete(name); else cookies.set(name, value);
  }
  const result = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, got ${response.status}: ${result.error ?? "Unexpected response"}`);
  return result;
}
function document(title, approved) {
  return {
    title,
    description: "Synthetic development seed. These sample documents, dates, and links are for testing only and are not official scholarship guidance.",
    academicYear: "DEMO 2026–2027", applicationStart: "2026-11-01", applicationEnd: "2026-12-31",
    officialUrl: "https://example.com/demo-scholarship-application",
    requirements: [
      { title: "DEMO — Proof of enrollment", description: "Use a made-up document to test the checklist. Do not upload personal documents.", required: true,
        steps: ["Read the synthetic preparation instructions.", "Prepare an invented enrollment record for the demo.", "Check the example name and academic year."],
        faqs: [{ question: "Is this an official enrollment requirement?", answer: "No. All requirements in this guide are synthetic testing examples." }] },
      { title: "DEMO — Academic record", description: "A second invented document used to test multiple preparation requirements.", required: true,
        steps: ["Create a synthetic academic record.", "Check that its sample details match the demo guide."],
        faqs: [{ question: "Will the app submit my scholarship application?", answer: "No. This prototype only helps with preparation." }] },
      { title: "DEMO — Optional preparation notes", description: "An optional item used to check required versus optional fields.", required: false,
        steps: ["Write a short practice preparation note."],
        faqs: [{ question: "Where is checklist progress saved?", answer: "Only in this browser. It is not saved as an applicant database record." }] },
    ],
    sources: [{ title: "DEMO — Synthetic preparation reference", url: "https://example.com/demo-reference", approved,
      content: "SYNTHETIC DEVELOPMENT REFERENCE — NOT OFFICIAL GUIDANCE. The sample preparation guide contains an invented proof of enrollment, an invented academic record, and optional preparation notes. Read the practice instructions, prepare synthetic examples, and check their sample details. This text exists only to test source approval, persistence, and searchable knowledge chunks. No real eligibility rules, scholarship requirements, or dates are claimed." }],
  };
}

let signedIn = false;
try {
  const auth = await request("/api/auth/login", { method: "POST", data: { email, password } });
  signedIn = true;
  assert.equal(auth.role, "publisher");
  assert.ok(cookies.size > 0, "Sign-in must set session cookies");
  assert.equal((await request("/api/auth/session")).user.id, auth.user.id);
  console.log("PASS real publisher password login and cookie session");
  const { guides: existing } = await request("/api/admin/guides");
  const seeded = [];
  for (const [title, publish] of [["DEMO — Published test scholarship", true], ["DEMO — Private draft scholarship", false]]) {
    const match = existing.find((guide) => guide.scholarship_programs.title===title);
    if (match) {
      const { guide } = await request(`/api/admin/guides/${match.id}`);
      seeded.push(guide);
      console.log(`KEPT existing ${title}; no edits overwritten`);
      continue;
    }
    const draft = document(title, false);
    const first = await request("/api/admin/guides", { method: "POST", data: draft, expected: 201 });
    let { guide: loaded } = await request(`/api/admin/guides/${first.guide.cycleId}`);
    assert.equal(loaded.title, draft.title);
    assert.equal(loaded.status, "draft");
    assert.equal(loaded.requirements.length, 3);
    assert.deepEqual(loaded.requirements.map((item) => item.steps), draft.requirements.map((item) => item.steps));
    assert.deepEqual(loaded.requirements.map((item) => item.faqs), draft.requirements.map((item) => item.faqs));
    assert.equal(loaded.sources[0].content, draft.sources[0].content);
    assert.equal(loaded.sources[0].approved, false);
    await request(`/api/scholarships/${loaded.programId}`, { anonymous: true, expected: 404 });
    await request("/api/admin/publish", { method: "POST", data: { cycleId: loaded.cycleId }, expected: 400 });
    console.log("PASS persistent draft, requirements, steps, FAQs, source text, and review gate");
    if (publish) {
      const { status: _status, ...editable } = loaded;
      void _status;
      editable.sources[0].approved = true;
      await request("/api/admin/guides", { method: "POST", data: editable });
      await request("/api/admin/publish", { method: "POST", data: { cycleId: loaded.cycleId } });
      const visible = await request(`/api/scholarships/${loaded.programId}`, { anonymous: true });
      assert.equal(visible.program.application_cycles[0].requirements.length, 3);
      assert.equal(visible.program.application_cycles[0].knowledge_sources.length, 1);
      await request(`/api/requirements/${loaded.requirements[0].id}`, { anonymous: true });
      await request("/api/admin/publish", { method: "POST", data: { cycleId: loaded.cycleId, publish: false } });
      await request(`/api/scholarships/${loaded.programId}`, { anonymous: true, expected: 404 });
      await request("/api/admin/publish", { method: "POST", data: { cycleId: loaded.cycleId } });
      console.log("PASS reviewed draft update, publish, anonymous detail/requirement reads, unpublish, and republish");
      ({ guide: loaded } = await request(`/api/admin/guides/${loaded.cycleId}`));
    }
    seeded.push(loaded);
    console.log(`SAVED ${title} (${loaded.status})`);
  }
  // Independent requests read back committed rows rather than trusting write responses.
  for (const guide of seeded) {
    const reloaded = await request(`/api/admin/guides/${guide.cycleId}`);
    assert.equal(reloaded.guide.title, guide.title);
    if (guide.status === "draft") await request(`/api/scholarships/${guide.programId}`, { anonymous: true, expected: 404 });
    else await request(`/api/scholarships/${guide.programId}`, { anonymous: true });
  }
  console.log("PASS database records persist across independent requests; published and private draft examples are retained");
} finally {
  if (signedIn) {
    await request("/api/auth/logout", { method: "POST" });
    await request("/api/auth/session", { expected: 401 });
    console.log("PASS sign-out clears the test session");
  }
}
