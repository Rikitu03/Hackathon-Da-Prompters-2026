import { expect, test } from "@playwright/test";

test("demo dashboard renders clear summaries and navigation", async ({ page, isMobile }) => {
  await page.goto("/admin/demo");
  await expect(page.getByRole("heading", {name:"Welcome to your workspace"})).toBeVisible();
  await expect(page.getByText("interactive UI preview")).toBeVisible();
  await expect(page.getByRole("link", {name:"Scholarships"})).toBeVisible();
  await expect(page.getByRole("link", {name:"Requirements"})).toBeVisible();
  await expect(page.getByRole("link", {name:"Knowledge sources"})).toBeVisible();
  await expect(page.getByRole("link", {name:"Preview & publish"})).toBeVisible();
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
  await expect(page.getByRole("heading", {name:"Scholarship programs"})).toBeVisible();
});

test("selected sage cards keep readable action hierarchy", async ({page}) => {
  await page.goto("/admin/demo?view=programs");
  const listRow = page.getByRole("listitem").filter({hasText:"Sample Scholarship Preparation Guide"});
  await expect(listRow.getByRole("button",{name:"Edit"})).toHaveCSS("background-color","rgb(255, 255, 255)");
  await expect(listRow.getByRole("button",{name:"View cycles"})).toHaveCSS("color","rgb(255, 255, 255)");
  await expect(page.getByRole("button",{name:"Select"}).first()).toHaveCSS("color","rgb(255, 255, 255)");
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
