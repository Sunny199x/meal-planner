// Visits every page at phone width (375 px) and desktop width (1280 px) and
// reports pages that scroll sideways or show errors. Saves screenshots to
// .screenshots/. Needs a running app and the passcode, e.g.:
//
//   HOUSEHOLD_PASSCODE="..." node scripts/check-pages.mjs http://localhost:3000
//
// Uses the Playwright browser that is pre-installed in Claude Code cloud
// sessions; it is not a project dependency.
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const passcode = process.env.HOUSEHOLD_PASSCODE;
if (!passcode) {
  console.error("Set HOUSEHOLD_PASSCODE to the app's passcode.");
  process.exit(1);
}

const SIZES = [
  ["phone", { width: 375, height: 812 }],
  ["desktop", { width: 1280, height: 900 }],
];
const problems = [];
await mkdir(".screenshots", { recursive: true });
const browser = await chromium.launch();

// Signed out: icons and the home-screen manifest must load; pages must not.
const anon = await browser.newPage();
for (const path of ["/icon.svg", "/apple-icon.png", "/manifest.webmanifest", "/icons/icon-192.png"]) {
  const response = await anon.request.get(base + path, { maxRedirects: 0 });
  if (response.status() !== 200) problems.push(`${path} gives ${response.status()} when signed out`);
}
const redirect = await anon.request.get(base + "/settings", { maxRedirects: 0 });
if (![302, 307].includes(redirect.status())) problems.push(`/settings is not locked when signed out`);

const context = await browser.newContext({ viewport: SIZES[0][1] });
const page = await context.newPage();
page.on("pageerror", (error) => problems.push(`${page.url()}: page error: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`${page.url()}: console error: ${message.text()}`);
});

await page.goto(base + "/login");
await page.waitForSelector("input[name=passcode]");
await page.screenshot({ path: ".screenshots/login-phone.png", fullPage: true });
await page.fill("input[name=passcode]", passcode);
await page.click("button[type=submit]");
await page.waitForURL(base + "/");

// Make sure there is something to look at.
await page.goto(base + "/settings");
await page.click("text=Load recipes from files");
await page.waitForSelector("text=The database now holds");
await page.goto(base + "/");
await page.waitForSelector("main article");
const firstRecipe = await page.getAttribute("main article h2 a", "href");

// A coming week with its setup saved and one dish chosen.
await page.goto(base + "/week");
if (await page.locator("button:has-text('Save setup')").count()) {
  await page.click("button:has-text('Save setup')");
  await page.locator("ul.grid > li").first().locator("button:has-text('Add')").click();
  await page.waitForSelector("text=1 of");
}

const pages = [
  ["recipes", "/"],
  ["week", "/week"],
  ["week-setup", "/week?week=2030-01-07"],
  ["recipes-filtered", "/?time=45&diet=vegetarian&protein=1"],
  ["recipe", firstRecipe],
  ["edit", `${firstRecipe}/edit`],
  ["add", "/recipes/new"],
  ["settings", "/settings"],
  ["not-found", "/recipes/00000000-0000-0000-0000-000000000000"],
];

for (const [sizeName, viewport] of SIZES) {
  await page.setViewportSize(viewport);
  for (const [name, path] of pages) {
    await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    if (name === "recipes-filtered") await page.click("button:has-text('Filters')");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (scrollWidth > clientWidth) {
      problems.push(`${path} scrolls sideways at ${sizeName} width (${scrollWidth} > ${clientWidth} px)`);
    }
    await page.screenshot({ path: `.screenshots/${name}-${sizeName}.png`, fullPage: true });
  }
}

await browser.close();
if (problems.length) {
  console.log("Problems found:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`All ${pages.length} pages look fine at phone and desktop width. Screenshots are in .screenshots/.`);
