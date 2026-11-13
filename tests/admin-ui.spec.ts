import { expect, test } from "@playwright/test";

test("demo dashboard renders clear summaries and navigation", async ({ page, isMobile }) => {
  await page.goto("/admin/demo");
  await expect(page.getByRole("heading", {name:"Welcome to your workspace"})).toBeVisible();
  await expect(page.getByText(/interactive demo sandbox/)).toBeVisible();
  await expect(page.getByRole("link", {name:"Scholarship guides"})).toBeVisible();
  await expect(page.getByRole("link", {name:"Requirements & FAQs"})).toBeVisible();
  await expect(page.getByRole("link", {name:"Knowledge & sources"})).toBeVisible();
  await expect(page.getByRole("link", {name:"Review & publish"})).toBeVisible();
  await page.screenshot({path:test.info().outputPath(isMobile?"dashboard-mobile.png":"dashboard-desktop.png"),fullPage:true});
});

test("dropdown has keyboard-accessible options with no browser-native blue highlight", async ({page}) => {
  await page.goto("/admin/demo?view=requirements");
  const trigger = page.getByRole("combobox", {name:"Scholarship program"});
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByRole("option", {name:"Example Renewal Guide"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("step arrows reorder correctly and deletion can be undone", async ({page}) => {
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button", {name:/Example enrollment document/}).click();
  await expect(page.getByLabel("Instruction for step 1")).toHaveValue(/Consult the issuing office/);
  await page.getByRole("button", {name:"Move step 1 down"}).click();
  await expect(page.getByLabel("Instruction for step 1")).toHaveValue(/Check the document against/);
  await page.getByRole("button", {name:"Remove step 1"}).click();
  await expect(page.getByRole("button", {name:"Undo"})).toBeVisible();
  await page.getByRole("button", {name:"Undo"}).click();
  await expect(page.getByLabel("Instruction for step 1")).toHaveValue(/Check the document against/);
  await expect(page.getByRole("button", {name:/Drag to reorder step 1/})).toBeVisible();
});

test("mobile layouts avoid horizontal document scrolling and retain usable controls", async ({page, isMobile}) => {
  test.skip(!isMobile, "mobile-only viewport assertion");
  for (const view of ["overview", "programs", "requirements", "knowledge", "preview"]) {
    await page.goto("/admin/demo?view="+view);
    await expect(page.getByText("Demo preview", {exact:false}).first()).toBeVisible();
    const dims = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth
    }));
    if (dims.document > dims.viewport+1) {
      const offenders = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("body *")]
        .map(el=>({tag:el.tagName,cls:String(el.className).slice(0,130),text:el.textContent?.trim().slice(0,60),right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)}))
        .filter(el=>el.right > document.documentElement.clientWidth+3)
        .slice(0,20));
      console.log("Overflow in",view,JSON.stringify(offenders));
    }
    expect(dims.document, view+" has horizontal overflow").toBeLessThanOrEqual(dims.viewport+1);
  }
});

test("demo create-draft button updates sample records without backend writes", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"New program"}).click();
  await page.getByRole("textbox",{name:"Program name"}).fill("Test user experience guide");
  await page.getByRole("textbox",{name:"Program description"}).fill("A fictional usability test program description.");
  await page.getByRole("button",{name:"Create draft"}).click();
  await expect(page.getByText(/Demo program draft updated locally/)).toBeVisible();
});



test("demo Create guide shortcut opens the program form", async ({page}) => {
  await page.goto("/admin/demo");
  await page.getByRole("link", { name: "Create guide" }).click();
  await expect(page).toHaveURL(/view=programs&new=1/);
  await expect(page.getByRole("textbox", { name: "Program name" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create draft" })).toBeVisible();
});

test("demo draft persists across navigation and reset restores samples", async ({page}) => {
  const unexpectedWrites: string[] = [];
  page.on("request", req => {
    if (/\/api\/admin\//.test(req.url()) && req.method() !== "GET") unexpectedWrites.push(req.url());
  });
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button", { name: "New program" }).click();
  await page.getByRole("textbox", { name: "Program name" }).fill("Sandbox Test Guide");
  await page.getByRole("textbox", { name: "Program description" }).fill("Fictional guide for locally testing admin actions.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByRole("listitem").filter({hasText:"Sandbox Test Guide"})).toBeVisible();
  await page.getByRole("link", { name: "Knowledge & sources" }).click();
  await page.getByRole("link", { name: "Scholarship guides" }).click();
  await expect(page.getByRole("listitem").filter({hasText:"Sandbox Test Guide"})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem").filter({hasText:"Sandbox Test Guide"})).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("listitem").filter({hasText:"Sandbox Test Guide"})).toHaveCount(0);
  expect(unexpectedWrites).toEqual([]);
});

test("demo Save draft cycle updates the visible cycle list", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button", { name: "Add cycle" }).click();
  await page.locator("#cycle-year").fill("Demo 2026-2027");
  await page.getByRole("button", { name: "Save draft cycle" }).click();
  await expect(page.getByText("Demo 2026-2027", { exact: true })).toBeVisible();
  await expect(page.getByText(/Demo cycle draft updated locally/)).toBeVisible();
});

test("demo Save requirement draft updates checklist and steps", async ({page}) => {
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button", { name: "Add requirement" }).click();
  await page.locator("#req-title").fill("Fictional sandbox clearance");
  await page.getByLabel("Instruction for step 1").fill("Ask the fictional office for a sample form.");
  await page.getByRole("button", { name: "Save requirement draft" }).click();
  await expect(page.getByRole("button", { name: /Fictional sandbox clearance/ })).toBeVisible();
  await page.getByRole("button", { name: /Fictional sandbox clearance/ }).click();
  await expect(page.getByLabel("Instruction for step 1")).toHaveValue("Ask the fictional office for a sample form.");
});

test("demo Save source and review adds a local reference", async ({page}) => {
  await page.goto("/admin/demo?view=knowledge");
  await page.locator("#source-title").fill("Fictional sandbox source");
  await page.locator("#source-url").fill("https://example.test/demo-source");
  await page.locator("#source-content").fill("Sample text only. Not a verified official document.");
  await page.getByRole("button", { name: "Save source and review" }).click();
  await expect(page.getByRole("heading", { name: "Fictional sandbox source" })).toBeVisible();
  await expect(page.getByText(/Demo reference updated in this browser tab only/)).toBeVisible();
  await page.goto("/admin/demo?view=preview");
  await expect(page.getByRole("button", { name: "Publish verified guide" })).toBeDisabled();
});


test("demo Edit program updates its list item without server storage", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  const row = page.getByRole("listitem").filter({hasText:"Sample Scholarship Preparation Guide"});
  await row.getByRole("button", { name:"Edit" }).click();
  await page.getByRole("textbox", { name:"Program name" }).fill("Edited fictional guide");
  await page.getByRole("button", { name:"Save changes" }).click();
  await expect(page.getByRole("listitem").filter({hasText:"Edited fictional guide"})).toBeVisible();
});

test("demo Edit source invalidates local approval when its reference text changes", async ({page}) => {
  await page.goto("/admin/demo?view=knowledge");
  await page.locator("#source-title").fill("Sandbox reviewed reference");
  await page.locator("#source-url").fill("https://example.test/reference");
  await page.locator("#source-content").fill("Fictional example reference text.");
  await page.getByLabel(/I have reviewed this source/).check();
  await page.getByRole("button", { name:"Save source and review" }).click();
  const article = page.locator("article").filter({hasText:"Sandbox reviewed reference"});
  await expect(article.getByText("approved")).toBeVisible();
  await article.getByRole("button", { name:"Edit source and review" }).click();
  await page.locator("#source-content").fill("Edited fictional reference text.");
  await expect(page.getByLabel(/I have reviewed this source/)).not.toBeChecked();
  await page.getByRole("button", { name:"Save source and review" }).click();
  await expect(page.locator("article").filter({hasText:"Sandbox reviewed reference"}).getByText("in review")).toBeVisible();
});

test("overview program entries are fully clickable and Refresh is not required", async ({page}) => {
  await page.goto("/admin/demo");
  await expect(page.getByRole("button", {name:/^Refresh$/})).toHaveCount(0);
  const program = page.getByRole("link", {name:"Open Sample Scholarship Preparation Guide program details"});
  await expect(program).toBeVisible();
  await program.click();
  await expect(page).toHaveURL(/view=programs&program=demo-program-1/);
  await expect(page.getByRole("heading", {name:"Scholarship guides"})).toBeVisible();
});

test("selected blue cards keep readable action hierarchy", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  const listRow = page.getByRole("listitem").filter({hasText:"Sample Scholarship Preparation Guide"});
  await expect(listRow.getByRole("button",{name:"Edit"})).toHaveCSS("background-color","rgb(255, 255, 255)");
  await expect(listRow.getByRole("button",{name:"View cycles"})).toHaveCSS("color","rgb(248, 251, 255)");
  await expect(page.getByRole("button",{name:"Select"}).first()).toHaveCSS("color","rgb(248, 251, 255)");
});

test("step editor has a single label and constrains drag movement horizontally", async ({page}) => {
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button", {name:/Example enrollment document/}).click();
  const first = page.locator(".admin-step-card").first();
  await expect(first.getByText("Step 1",{exact:true})).toBeVisible();
  await expect(first.getByText("01",{exact:true})).toHaveCount(0);
  const grip = page.getByRole("button",{name:/Drag to reorder step 1/});
  const handleRect = await grip.boundingBox();
  const before = await first.boundingBox();
  expect(handleRect).not.toBeNull();
  expect(before).not.toBeNull();
  if (!handleRect || !before) return;
  const centerX = handleRect.x + handleRect.width/2;
  const centerY = handleRect.y + handleRect.height/2;
  await page.mouse.move(centerX,centerY);
  await page.mouse.down();
  await page.mouse.move(centerX+240,centerY,{steps:12});
  const during = await first.boundingBox();
  expect(during).not.toBeNull();
  expect(Math.abs((during?.x || 0)-before.x)).toBeLessThanOrEqual(3);
  await page.mouse.up();
  const overflow = await page.evaluate(()=>document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("description editor grows with content and hides the native resize handle", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("listitem").filter({hasText:"Sample Scholarship Preparation Guide"}).getByRole("button",{name:"Edit"}).click();
  const description = page.locator("#program-desc");
  await expect(description).toBeVisible();
  await expect(description).toHaveCSS("resize","none");
  const initial = await description.evaluate(element=>({height:element.clientHeight,scrollHeight:element.scrollHeight}));
  expect(initial.height).toBeGreaterThanOrEqual(initial.scrollHeight-2);
  await description.fill("This sample contains a longer description. ".repeat(18));
  const after = await description.evaluate(element=>({height:element.clientHeight,scrollHeight:element.scrollHeight}));
  expect(after.height).toBeGreaterThan(initial.height);
});

test("FAQ preview uses accessible chevron accordion with answer", async ({page}) => {
  await page.goto("/admin/demo?view=preview");
  const question = page.getByRole("button",{name:"Is this an official requirement?"});
  await expect(question).toHaveAttribute("aria-expanded","false");
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded","true");
  await expect(page.getByText("No. This entry is fictional UI-preview data, not scholarship policy.")).toBeVisible();
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded","false");
});

test("search offers real matching programs and tab-scoped recent history", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  const search = page.getByRole("combobox",{name:"Search scholarship programs"});
  await search.fill("Renewal");
  const suggestion = page.getByRole("option",{name:/Example Renewal Guide/}).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(search).toHaveValue("Example Renewal Guide");
  await page.getByRole("button",{name:"Clear search"}).click();
  await expect(page.getByRole("button",{name:"Clear history"})).toBeVisible();
  await expect(page.getByRole("option",{name:/Example Renewal Guide/}).first()).toContainText("Recent");
  await page.getByRole("button",{name:"Clear history"}).click();
  await expect(page.getByRole("button",{name:"Clear history"})).toHaveCount(0);
});

test("active form field displays a single two-pixel focus indicator", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"New program"}).click();
  const field = page.getByRole("textbox",{name:"Program name"});
  await field.focus();
  const css = await field.evaluate(el => {
    const style = getComputedStyle(el);
    return {width:style.outlineWidth,offset:style.outlineOffset,border:style.borderColor};
  });
  expect(css.width).toBe("2px");
  expect(css.offset).toBe("2px");
  // Neutral border must not become a second green focus ring.
  expect(css.border).not.toBe("rgb(53, 120, 84)");
  expect(css.border).not.toBe("rgb(35, 110, 78)");
});


test("authenticated admin navigation reuses one verified session and loaded data", async ({page}) => {
  const uid = "00000000-0000-4000-8000-000000000001";
  const user = {id:uid, aud:"authenticated", role:"authenticated", email:"admin@test.invalid"};
  let authReads = 0;
  let dataReads = 0;

  await page.route("**/api/auth/session", async route => {
    authReads++;
    await route.fulfill({ json: { user, role: "editor" } });
  });
  await page.route("**/api/admin/workspace", async route => {
    dataReads++;
    await route.fulfill({ json: { data: { programs: [], cycles: [], requirements: [], steps: [], faqs: [], sources: [] } } });
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading",{name:"Welcome to your workspace"})).toBeVisible();
  expect(authReads).toBeGreaterThan(0);
  expect(dataReads).toBeGreaterThan(0);

  const authenticated = authReads;
  const dataLoaded = dataReads;
  await page.getByRole("link",{name:"Scholarship guides"}).click();
  await expect(page).toHaveURL(/\/admin\/programs$/);
  await expect(page.getByRole("heading",{name:"Scholarship guides",level:1})).toBeVisible();
  await page.getByRole("link",{name:"Requirements & FAQs"}).click();
  await expect(page).toHaveURL(/\/admin\/requirements$/);
  await expect(page.getByRole("heading",{name:"Requirements & FAQs"})).toBeVisible();
  await page.getByRole("link",{name:"Knowledge & sources"}).click();
  await expect(page.getByRole("heading",{name:"Knowledge & sources"})).toBeVisible();

  // No refetches or "checking access" flashes on client-side navigation.
  expect(authReads).toBe(authenticated);
  expect(dataReads).toBe(dataLoaded);
  await expect(page.getByText("Checking access securely…")).toHaveCount(0);
});


test("Admin V2 charts derive from sample records and provide practical navigation", async ({page}) => {
  await page.goto("/admin/demo");
  await expect(page.getByRole("heading",{name:"Scholarship guide status"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Official source reviews"})).toBeVisible();
  const charts = page.locator('[aria-label="Content operation charts"]');
  await expect(charts).toBeVisible();
  await expect(charts.getByText("Published",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Needs attention"})).toBeVisible();
  await expect(page.getByRole("link",{name:/Create guide/})).toBeVisible();
  await page.getByRole("link",{name:/Sources awaiting verification/}).click();
  await expect(page).toHaveURL(/\/admin\/demo\?view=knowledge/);
  await expect(page.getByRole("heading",{name:"Knowledge & sources"})).toBeVisible();
});

test("guided authoring steps and applicant preview use the same saved guide fields", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  const flow=page.getByRole("navigation",{name:"Guide authoring workflow"});
  await expect(flow).toBeVisible();
  await expect(flow.getByRole("link",{name:/Guide details/})).toHaveAttribute("aria-current","step");
  await flow.getByRole("link",{name:/Review & publish/}).click();
  await expect(page).toHaveURL(/\/admin\/demo\?view=preview/);
  await expect(page.getByRole("heading",{name:"Review & publish"})).toBeVisible();
  const preview=page.locator('[aria-label="Applicant content preview"]');
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Sample Scholarship Preparation Guide")).toBeVisible();
  await expect(preview.getByText("Example enrollment document")).toBeVisible();
  await expect(preview.getByRole("heading",{name:"How to prepare"}).first()).toBeVisible();
  await expect(page.getByRole("link",{name:/Open editor to fix/}).first()).toBeVisible();
});

test("Admin V2 primary blue links and buttons have readable white text", async ({page}) => {
  await page.goto("/admin/demo");
  const create = page.getByRole("link",{name:"Create guide"});
  await expect(create).toBeVisible();
  await expect(create).toHaveCSS("background-color","rgb(21, 91, 176)");
  await expect(create).toHaveCSS("color","rgb(248, 251, 255)");
  await expect(create.locator("svg")).toHaveCSS("color","rgb(248, 251, 255)");
  await create.hover();
  await expect(create).toHaveCSS("color","rgb(255, 255, 255)");

  await page.goto("/admin/demo?view=programs");
  const newProgram = page.getByRole("button",{name:"New program"});
  await expect(newProgram).toHaveCSS("background-color","rgb(21, 91, 176)");
  await expect(newProgram).toHaveCSS("color","rgb(248, 251, 255)");
  await expect(newProgram.locator("svg")).toHaveCSS("color","rgb(248, 251, 255)");
  await newProgram.hover();
  await expect(newProgram).toHaveCSS("color","rgb(255, 255, 255)");
});


test("context importer offers a real Markdown template and visible supported formats", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"Import file"}).click();
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toBeVisible();
  await expect(page.getByRole("heading",{name:/Start with a document/})).toBeVisible();
  await expect(page.getByRole("button",{name:"Browse files"})).toBeVisible();
  const downloadEvent=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download template"}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe("GabayIskolar-Scholarship-Guide-Template.md");
});

test("context text import stages reviewed fields but never claims to save in demo mode", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"Import file"}).click();
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toBeVisible();
  await page.getByLabel("Choose scholarship source file").setInputFiles({
    name:"sample-guide.md",mimeType:"text/markdown",
    buffer:Buffer.from("# Official sample\nScholarship Name: Example Education Grant\nDescription: A fictional guide used for accessibility and usability tests.\nAcademic Year: 2026-2027\nOfficial Application URL: https://example.test/official\n")
  });
  await expect(page.getByRole("heading",{name:"Review suggested fields"})).toBeVisible();
  await expect(page.getByLabel("Scholarship name")).toHaveValue("Example Education Grant");
  await expect(page.getByLabel("Academic year")).toHaveValue("2026-2027");
  await expect(page.getByText("LOCAL TEXT PREFILL · NOT AI")).toBeVisible();
  await page.getByRole("button",{name:/Apply to draft form/}).click();
  await expect(page.getByRole("textbox",{name:"Program name"})).toHaveValue("Example Education Grant");
  await expect(page.getByRole("textbox",{name:"Program description"})).toHaveValue(/fictional guide/);
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toHaveCount(0);
  await page.getByRole("button",{name:"Create draft"}).click();
  await expect(page.getByText(/Demo program draft updated locally/)).toBeVisible();
});

test("context importer explains rejected files and missing Lumen extraction", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"Import file"}).click();
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toBeVisible();
  const input=page.getByLabel("Choose scholarship source file");
  await input.setInputFiles({name:"unsafe.exe",mimeType:"application/octet-stream",buffer:Buffer.from("not a document")});
  await expect(page.getByRole("region",{name:/Start with a document/}).getByRole("alert")).toContainText("This file type is not supported");
  await expect(page.getByRole("region",{name:/Start with a document/}).getByRole("alert")).toContainText("415");
  await page.getByRole("button",{name:"Dismiss upload error"}).click();

  await input.setInputFiles({name:"reference.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7\nexample bytes")});
  await expect(page.getByText("AI document extraction is not connected yet")).toBeVisible();
  await expect(page.getByText(/No document was sent or saved/)).toBeVisible();
  await expect(page.getByRole("button",{name:/Apply to draft form/})).toHaveCount(0);
});

test("reviewed import keeps cycle fields after saving its program through the backend", async ({page}) => {
  const programId = "10000000-0000-4000-8000-000000000009";
  const cycleId = "20000000-0000-4000-8000-000000000009";
  let program: Record<string, unknown> | null = null;
  let cycle: Record<string, unknown> | null = null;
  let savedCycle: Record<string, unknown> | null = null;
  await page.route("**/api/auth/session", route => route.fulfill({ json: { user: { id: "publisher-test" }, role: "publisher" } }));
  await page.route("**/api/admin/workspace", route => route.fulfill({ json: { data: { programs: program ? [program] : [], cycles: cycle ? [cycle] : [], requirements: [], steps: [], faqs: [], sources: [] } } }));
  await page.route("**/api/admin/programs", async route => {
    const payload = route.request().postDataJSON();
    program = { ...payload, id: programId, status: "draft", created_at: "2026-11-01T00:00:00Z" };
    await route.fulfill({ status: 201, json: { program } });
  });
  await page.route("**/api/admin/content", async route => {
    savedCycle = route.request().postDataJSON();
    cycle = { id: cycleId, program_id: programId, academic_year: savedCycle!.academicYear, application_start: savedCycle!.applicationStart, application_end: savedCycle!.applicationEnd, official_url: savedCycle!.officialUrl, status: "draft", published_at: null };
    await route.fulfill({ json: { guide: { programId, cycleId, status: "draft" } } });
  });
  await page.route("**/api/admin/guides/*/readiness", route => route.fulfill({ json: { checks: [], ready: false, status: "draft" } }));
  await page.goto("/admin/programs");
  await page.getByRole("button",{name:"Import file"}).click();
  await page.getByLabel("Choose scholarship source file").setInputFiles({ name: "synthetic-import.md", mimeType: "text/markdown", buffer: Buffer.from("Scholarship Name: Synthetic Imported Guide\nDescription: Fictional import and backend integration test only.\nAcademic Year: 2026-2027\nApplication Opens: 2026-11-01\nApplication Closes: 2026-12-31\nOfficial Application URL: https://example.test/apply\n") });
  await page.getByRole("button", { name: "Apply to draft form", exact: true }).click();
  await page.getByRole("button", { name: "Create draft", exact: true }).click();
  await expect(page.locator("#cycle-year")).toHaveValue("2026-2027");
  await expect(page.locator("#cycle-start")).toHaveValue("2026-11-01");
  await expect(page.locator("#cycle-end")).toHaveValue("2026-12-31");
  await expect(page.locator("#cycle-url")).toHaveValue("https://example.test/apply");
  await page.getByRole("button", { name: "Save draft cycle", exact: true }).click();
  await expect(page.getByText("New draft cycle created.", { exact: true })).toBeVisible();
  expect(savedCycle).toMatchObject({ action: "save_cycle", programId, academicYear: "2026-2027", applicationStart: "2026-11-01", applicationEnd: "2026-12-31", officialUrl: "https://example.test/apply" });
});


test("import progress is backed by completed device reading, not fictitious AI upload", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"Import file"}).click();
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toBeVisible();
  await page.getByLabel("Choose scholarship source file").setInputFiles({
    name:"progress-check.md",mimeType:"text/markdown",
    buffer:Buffer.from("Scholarship Name: Mock Scholarship\nDescription: Fictional progress indicator sample for UI testing.\nAcademic Year: 2026-2027\n")
  });
  const preparation=page.getByRole("progressbar",{name:"Import preparation milestones"});
  await expect(preparation).toHaveAttribute("aria-valuenow","75");
  await expect(preparation).toHaveAttribute("aria-valuetext","3 of 4 import preparation steps complete");
  const progress=page.getByRole("progressbar",{name:"Local source file reading progress"});
  await expect(progress).toBeVisible();
  await expect(progress).toHaveAttribute("aria-valuenow","100");
  await expect(page.getByText("Local file reading complete")).toBeVisible();
  await expect(page.getByText("Real device-read progress only.")).toBeVisible();
  await page.getByRole("button",{name:"Apply to draft form"}).click();
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toHaveCount(0);
  await expect(page.getByRole("textbox",{name:"Program name"})).toHaveValue("Mock Scholarship");
  await page.getByRole("button",{name:"Import file"}).click();
  await expect(preparation).toHaveAttribute("aria-valuenow","0");
  await expect(progress).toHaveCount(0);
  await page.getByLabel("Choose scholarship source file").setInputFiles({
    name:"scanned.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7\nnot a real document")
  });
  await expect(page.getByRole("progressbar",{name:"Local source file reading progress"})).toHaveCount(0);
  await expect(preparation).toHaveAttribute("aria-valuenow","50");
  await expect(page.getByText("Needs Lumen backend")).toBeVisible();
  await expect(page.getByText("AI document extraction is not connected yet")).toBeVisible();
});


test("import preparation tracker exposes errors without simulated completion", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"Import file"}).click();
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toBeVisible();
  const preparation=page.getByRole("progressbar",{name:"Import preparation milestones"});
  await expect(preparation).toHaveAttribute("aria-valuenow","0");
  await expect(page.getByText("Choose a document to start")).toBeVisible();
  await page.getByLabel("Choose scholarship source file").setInputFiles({
    name:"not-supported.exe",mimeType:"application/octet-stream",buffer:Buffer.from("invalid test fixture")
  });
  await expect(preparation).toHaveAttribute("aria-valuenow","0");
  await expect(page.getByText("File rejected — see correction below")).toBeVisible();
  await expect(page.getByText("Fix selected file")).toBeVisible();
  await expect(page.getByRole("region",{name:/Start with a document/}).getByRole("alert")).toContainText("415");
});


test("Admin V3 uses a real-dated gradient chart and hides pagers for short lists", async ({page}) => {
  await page.goto("/admin/demo");
  await expect(page.getByRole("heading",{name:"Scholarship activity"})).toBeVisible();
  const chart=page.getByRole("img",{name:/Monthly scholarship activity:/});
  await expect(chart).toBeVisible();
  await expect(chart.locator("linearGradient")).toHaveCount(1);
  await page.getByRole("link",{name:"Scholarship guides"}).click();
  await expect(page.getByRole("navigation",{name:"scholarship guides pagination"})).toHaveCount(0);
  await page.getByRole("link",{name:"Requirements & FAQs"}).click();
  await expect(page.getByRole("navigation",{name:"requirements pagination"})).toHaveCount(0);
  await page.getByRole("link",{name:"Knowledge & sources"}).click();
  await expect(page.getByRole("navigation",{name:"sources pagination"})).toHaveCount(0);
});

test("Admin V3 paginates more than 10 Supabase-visible guides and resets on search", async ({page}) => {
  const user={id:"00000000-0000-4000-8000-000000000001",aud:"authenticated",role:"authenticated",email:"admin@test.invalid"};
  const guides=Array.from({length:13},(_,i)=>({
    id:"v3-guide-"+(i+1),
    title:"Test Scholarship "+String(i+1).padStart(2,"0"),
    description:"Fictional record for pagination regression testing only.",
    status:"draft",created_at:"2026-11-01T00:00:00Z"
  }));
  await page.route("**/api/auth/session", route => route.fulfill({ json: { user, role: "editor" } }));
  await page.route("**/api/admin/workspace", route => route.fulfill({ json: { data: { programs: guides, cycles: [], requirements: [], steps: [], faqs: [], sources: [] } } }));
  await page.goto("/admin/programs");
  const pager=page.getByRole("navigation",{name:"scholarship guides pagination"});
  await expect(pager).toBeVisible();
  await expect(pager).toContainText("Showing");
  await expect(pager).toContainText("13");
  await expect(page.getByRole("heading",{name:"Test Scholarship 01"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Test Scholarship 11"})).toHaveCount(0);
  await pager.getByRole("button",{name:"Next page"}).click();
  await expect(page.getByRole("heading",{name:"Test Scholarship 11"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Test Scholarship 01"})).toHaveCount(0);
  await page.getByRole("combobox",{name:"Search scholarship programs"}).fill("Scholarship 03");
  await expect(page.getByRole("heading",{name:"Test Scholarship 03"})).toBeVisible();
  await expect(pager).toHaveCount(0);
});


test("document import opens as a focus-trapped modal and restores the trigger on dismissal",async ({page})=>{
  await page.goto("/admin/demo?view=programs");
  await expect(page.getByRole("dialog",{name:"Import scholarship source"})).toHaveCount(0);
  const trigger=page.getByRole("button",{name:"Import file"});
  await trigger.click();
  const dialog=page.getByRole("dialog",{name:"Import scholarship source"});
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading",{name:/Start with a document/})).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow","hidden");
  const backdrop=await dialog.evaluate(node=>getComputedStyle(node,"::backdrop").backgroundColor);
  expect(backdrop).toBe("rgba(8, 17, 31, 0.72)");
  await expect(dialog.getByRole("button",{name:"Close import dialog"})).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow","hidden");
  await trigger.click();
  await dialog.getByRole("button",{name:"Close import dialog"}).click();
  await expect(dialog).toHaveCount(0);
});

test("import modal remains scrollable and within mobile viewport",async ({page,isMobile})=>{
  test.skip(!isMobile,"Mobile modal sizing");
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"Import file"}).click();
  const modal=page.getByRole("dialog",{name:"Import scholarship source"});
  await expect(modal).toBeVisible();
  const geometry=await modal.evaluate(dialog=>{
    const b=dialog.getBoundingClientRect();
    return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,overflowY:getComputedStyle(dialog).overflowY};
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth+1);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight+1);
  expect(geometry.overflowY).toBe("auto");
});

test("requirement text import reviews labeled fields and stages an office map pin", async ({page}) => {
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button",{name:/Example enrollment document/}).click();
  const open=page.getByRole("button",{name:"Import text / file"});
  await open.click();
  const dialog=page.getByRole("dialog",{name:"Import requirement details"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button",{name:"Close requirement import"})).toBeFocused();
  const overlay=await dialog.evaluate(node=>getComputedStyle(node,"::backdrop").backgroundColor);
  expect(overlay).toBe("rgba(8, 17, 31, 0.72)");
  await dialog.getByLabel("Or paste source text").fill(
    "Document name: Fictional Proof of Enrollment\n"+
    "Purpose: Confirm active enrollment for this demonstration.\n"+
    "Issuing office: Sample Campus Registrar\n"+
    "Office address: Example Street, Pasig City, Philippines\n"+
    "Office hours: Mon–Fri, 9:00 AM–4:00 PM\n"+
    "Maps URL: https://www.google.com/maps?q=14.58,121.07\n"+
    "Step 1: Request the document at the registrar.\n"+
    "Step 2: Check the official stamp before submitting."
  );
  await dialog.getByRole("button",{name:"Extract from pasted text"}).click();
  await expect(dialog.getByRole("textbox",{name:"Requirement title"})).toHaveValue("Fictional Proof of Enrollment");
  await expect(dialog.getByRole("textbox",{name:"Issuing office"})).toHaveValue("Sample Campus Registrar");
  await expect(dialog.getByRole("textbox",{name:"Full office address"})).toHaveValue("Example Street, Pasig City, Philippines");
  await expect(dialog.getByLabel("Pinned map link")).toHaveValue("https://www.google.com/maps?q=14.58,121.07");
  await dialog.getByRole("button",{name:"Apply suggestions to requirement"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.locator("#req-title")).toHaveValue("Fictional Proof of Enrollment");
  await expect(page.locator("#req-office")).toHaveValue("Sample Campus Registrar");
  await expect(page.locator("#req-address")).toHaveValue("Example Street, Pasig City, Philippines");
  await expect(page.locator("#req-map")).toHaveValue("https://www.google.com/maps?q=14.58,121.07");
  await expect(page.getByRole("link",{name:"Preview pinned location"})).toHaveAttribute("target","_blank");
  await expect(page.getByLabel("Instruction for step 1")).toHaveValue("Request the document at the registrar.");
  await expect(page.getByText("Suggestions are copied to the draft editor")).toBeVisible();
  await page.getByRole("button",{name:"Save requirement draft"}).click();
  await expect(page.getByText(/Demo requirement updated locally/)).toBeVisible();
});

test("requirement importer supports local files and rejects unsupported or oversized files",async ({page})=>{
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button",{name:/Example enrollment document/}).click();
  await page.getByRole("button",{name:"Import text / file"}).click();
  const dialog=page.getByRole("dialog",{name:"Import requirement details"});
  const file=dialog.getByLabel("Choose requirement source file");
  await file.setInputFiles({name:"guide.docx",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",buffer:Buffer.from("unsupported")});
  await expect(dialog.getByRole("alert")).toContainText("Unsupported format");
  await file.setInputFiles({name:"guide.md",mimeType:"text/markdown",buffer:Buffer.from("Requirement title: University certificate\nStep 1: Contact the issuing office for current requirements.\n")});
  await expect(dialog.getByRole("textbox",{name:"Requirement title"})).toHaveValue("University certificate");
  await dialog.getByRole("button",{name:"Close requirement import"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Import text / file"})).toBeFocused();
});

test("PDF requirement extraction requires explicit consent and does not auto-publish",async ({page})=>{
  await page.route("**/api/ai/ocr",route=>route.fulfill({status:200,json:{
    rawText:"Document name: Certified enrollment letter\nIssuing office: Records Office\nStep 1: Ask the official office to issue an original.",
    fields:[],warnings:[],disclaimer:"Review all extracted fields."
  }}));
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button",{name:/Example enrollment document/}).click();
  await page.getByRole("button",{name:"Import text / file"}).click();
  const dialog=page.getByRole("dialog",{name:"Import requirement details"});
  await dialog.getByLabel("Choose requirement source file").setInputFiles({name:"sample.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.7\nexample")});
  const extract=dialog.getByRole("button",{name:"Extract text with OCR"});
  await expect(extract).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await extract.click();
  await expect(dialog.getByRole("textbox",{name:"Requirement title"})).toHaveValue("Certified enrollment letter");
  await dialog.getByRole("button",{name:"Apply suggestions to requirement"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#req-title")).toHaveValue("Certified enrollment letter");
});

test("requirement importer never accepts arbitrary map links as verified pins",async ({page})=>{
  await page.goto("/admin/demo?view=requirements");
  await page.getByRole("button",{name:/Example enrollment document/}).click();
  await page.getByRole("button",{name:"Import text / file"}).click();
  const dialog=page.getByRole("dialog",{name:"Import requirement details"});
  await dialog.getByLabel("Or paste source text").fill("Document name: Example certificate\nMaps URL: https://unsafe.example.invalid/location\n");
  await dialog.getByRole("button",{name:"Extract from pasted text"}).click();
  await dialog.getByRole("button",{name:"Apply suggestions to requirement"}).click();
  await expect(dialog.getByRole("alert")).toContainText("direct HTTPS Google Maps");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("Admin chart hover and month selection never expose a full-height focus rectangle",async ({page})=>{
  await page.goto("/admin/demo");
  const chart=page.getByRole("img",{name:/Monthly scholarship activity:/});
  await expect(chart).toBeVisible();
  const target=chart.locator('[data-chart-hit="month"]').last();
  await expect(target).not.toHaveAttribute("tabindex","0");
  await expect(target).not.toHaveAttribute("role","button");
  await target.hover();
  await expect(chart.locator('[data-chart-tooltip="true"]')).toBeVisible();
  const selected=page.getByRole("group",{name:"Select activity month"});
  const november=selected.getByRole("button",{name:/Nov 2026:/});
  await november.focus();
  await expect(november).toHaveAttribute("aria-pressed","true");
  await expect(november).toHaveCSS("outline-width","2px");
  await expect(chart.locator("rect[tabindex]")).toHaveCount(0);
  await expect(page.getByText("Recommended workflow")).toHaveCount(0);
});

test("Admin importer remains hidden until requested to keep the guide list readable",async ({page})=>{
  await page.goto("/admin/demo?view=programs");
  await expect(page.getByRole("heading",{name:"Scholarship guides"})).toBeVisible();
  await expect(page.getByRole("heading",{name:/Start with a document/})).toHaveCount(0);
  await page.getByRole("button",{name:"Import file"}).click();
  const dialog=page.getByRole("dialog",{name:"Import scholarship source"});
  await expect(dialog.getByRole("heading",{name:/Start with a document/})).toBeVisible();
  await dialog.getByRole("button",{name:"Close import dialog"}).click();
  await expect(dialog).toHaveCount(0);
});
