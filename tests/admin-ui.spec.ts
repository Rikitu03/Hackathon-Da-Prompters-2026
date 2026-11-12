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
