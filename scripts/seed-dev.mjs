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
const SYNTHETIC_REQUIREMENTS = [
  { title: "DEMO — Proof of enrollment", description: "Use a made-up document to test the checklist. Do not upload personal documents.", required: true,
    steps: ["Read the synthetic preparation instructions.", "Prepare an invented enrollment record for the demo.", "Check the example name and academic year."],
    faqs: [{ question: "Is this an official enrollment requirement?", answer: "No. All requirements in this guide are synthetic testing examples." }] },
  { title: "DEMO — Academic record", description: "A second invented document used to test multiple preparation requirements.", required: true,
    steps: ["Create a synthetic academic record.", "Check that its sample details match the demo guide."],
    faqs: [{ question: "Will the app submit my scholarship application?", answer: "No. This prototype only helps with preparation." }] },
  { title: "DEMO — Optional preparation notes", description: "An optional item used to check required versus optional fields.", required: false,
    steps: ["Write a short practice preparation note."],
    faqs: [{ question: "Where is checklist progress saved?", answer: "Only in this browser. It is not saved as an applicant database record." }] },
];
const SYNTHETIC_SOURCE = "SYNTHETIC DEVELOPMENT REFERENCE — NOT OFFICIAL GUIDANCE. The sample preparation guide contains an invented proof of enrollment, an invented academic record, and optional preparation notes. Read the practice instructions, prepare synthetic examples, and check their sample details. This text exists only to test source approval, persistence, and searchable knowledge chunks. No real eligibility rules, scholarship requirements, or dates are claimed.";

// The three priority documents (docs/scholarships/pscs/three-document-scope.md), kept separate from the
// generic synthetic example above. Still synthetic: no official acceptance, fee or processing-time claims.
const THREE_DOCUMENT_REQUIREMENTS = [
  { title: "DEMO — Certificate of Registration", description: "A sample school record showing the student number, name, address, course, department, enrollment date, school year and year level. Confirm the accepted enrollment document in the official guide.", required: true,
    steps: ["Confirm in the official guide which enrollment document and academic period are requested.", "Request your latest Certificate of Registration from your school registrar.", "Use Check this document to compare the details read from it with your original."],
    faqs: [{ question: "Can I use last year's Certificate of Registration?", answer: "This demo cannot confirm accepted periods. The document check flags an enrollment date from an earlier year so you can confirm with the scholarship office." }] },
  { title: "DEMO — Barangay Certificate of Residency", description: "A sample barangay certificate showing the resident's name, address, years of residence, date issued and city. A Certificate of Indigency is a different document.", required: true,
    steps: ["Confirm the accepted residency document and issuing office in the official guide.", "Request the certificate from your barangay.", "Use Check this document to compare its name and address with your Certificate of Registration."],
    faqs: [{ question: "Is a Certificate of Indigency the same?", answer: "No. Residency and indigency are different documents. Request the one your cycle names." }] },
  { title: "DEMO — School ID or any Valid-ID", description: "A sample ID showing the holder's name, student number and section. Accepted ID types and whether both sides are needed depend on the selected cycle.", required: true,
    steps: ["Confirm accepted ID types in the official guide.", "Prepare a clear copy of the front and back.", "Use Check this document to compare the name and student number with your Certificate of Registration."],
    faqs: [{ question: "Can I use a different valid ID?", answer: "Accepted alternatives depend on the cycle. This demo cannot confirm them; ask the scholarship office." }] },
];
const THREE_DOCUMENT_SOURCE = "SYNTHETIC DEVELOPMENT REFERENCE — NOT OFFICIAL GUIDANCE. This sample guide covers three documents only: a Certificate of Registration, a Barangay Certificate of Residency, and a School ID or any Valid-ID. Prepare synthetic copies, read their key details, and check that the name, student number and address match across documents. It is a partial guide; confirm the complete official checklist, accepted document types, and dates at the official scholarship portal. No real eligibility rules, fees, or processing times are claimed.";

function document(title, approved, requirements = SYNTHETIC_REQUIREMENTS, sourceContent = SYNTHETIC_SOURCE) {
  return {
    title,
    description: "Synthetic development seed. These sample documents, dates, and links are for testing only and are not official scholarship guidance.",
    academicYear: "DEMO 2026–2027", applicationStart: "2026-11-01", applicationEnd: "2026-12-31",
    officialUrl: "https://example.com/demo-scholarship-application",
    requirements,
    sources: [{ title: "DEMO — Synthetic preparation reference", url: "https://example.com/demo-reference", approved, content: sourceContent }],
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
  for (const [title, publish, requirements, sourceContent] of [
    ["DEMO — Published test scholarship", true],
    ["DEMO — Private draft scholarship", false],
    ["DEMO — Three-document preparation guide", true, THREE_DOCUMENT_REQUIREMENTS, THREE_DOCUMENT_SOURCE],
  ]) {
    const match = existing.find((guide) => guide.scholarship_programs.title===title);
    if (match) {
      const { guide } = await request(`/api/admin/guides/${match.id}`);
      seeded.push(guide);
      console.log(`KEPT existing ${title}; no edits overwritten`);
      continue;
    }
    const draft = document(title, false, requirements, sourceContent);
    const first = await request("/api/admin/guides", { method: "POST", data: draft, expected: 201 });
    let { guide: loaded } = await request(`/api/admin/guides/${first.guide.cycleId}`);
    assert.equal(loaded.title, draft.title);
    assert.equal(loaded.status, "draft");
    assert.equal(loaded.requirements.length, draft.requirements.length);
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
      assert.equal(visible.program.application_cycles[0].requirements.length, draft.requirements.length);
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
