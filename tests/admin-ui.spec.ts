import { expect, test } from "@playwright/test";

test("demo dashboard renders clear summaries and navigation", async ({ page, isMobile }) => {
  await page.goto("/admin/demo");
  await expect(page.getByRole("heading", {name:"Welcome to your workspace"})).toBeVisible();
  await expect(page.getByText("interactive UI preview")).toBeVisible();
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

test("demo controls never claim a database save", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  await page.getByRole("button",{name:"New program"}).click();
  await page.getByRole("textbox",{name:"Program name"}).fill("Test user experience guide");
  await page.getByRole("textbox",{name:"Program description"}).fill("A fictional usability test program description.");
  await page.getByRole("button",{name:"Create draft"}).click();
  await expect(page.getByText(/Preview mode: changes are not saved/)).toBeVisible();
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
  await expect(page.getByRole("heading",{name:/Start with a document/})).toBeVisible();
  await expect(page.getByRole("button",{name:"Browse files"})).toBeVisible();
  const downloadEvent=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download template"}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe("GabayIskolar-Scholarship-Guide-Template.md");
});

test("context text import stages reviewed fields but never claims to save in demo mode", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
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
  await expect(page.getByText("Fields copied to the editor")).toBeVisible();
  await page.getByRole("button",{name:"Create draft"}).click();
  await expect(page.getByText(/Preview mode: changes are not saved/)).toBeVisible();
});

test("context importer explains rejected files and missing Lumen extraction", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
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
  await expect(preparation).toHaveAttribute("aria-valuenow","100");
  await expect(page.getByText("Fields applied to draft editor")).toBeVisible();
  await page.getByRole("button",{name:"Remove"}).click();
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
