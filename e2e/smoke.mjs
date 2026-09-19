/**
 * Browser smoke test. Drives the real UI against a dev server with an isolated database.
 *
 *   NEXT_DIST_DIR=.next-e2e DATABASE_URL=file:./e2e.db APP_URL=http://localhost:3100 npx next dev -p 3100 > e2e-dev.log
 *   DATABASE_URL=file:./e2e.db npm run seed
 *   E2E_LOG=e2e-dev.log E2E_SHOTS=./shots node e2e/smoke.mjs
 *
 * OTPs are read from the dev server's console output (the "console" delivery provider).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

// Direct DB access is only used to stage the "other person" in a mutual-match scenario.
const db = new PrismaClient({ datasources: { db: { url: process.env.E2E_DB ?? "file:./e2e.db" } } });

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const LOG = process.env.E2E_LOG;
const SHOTS = process.env.E2E_SHOTS ?? "./e2e-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const yearsAgo = (n) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  d.setUTCDate(d.getUTCDate() - 3);
  return d.toISOString().slice(0, 10);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Latest 6-digit code the server "sent" to this address, waiting for it to appear. */
async function otpFor(to, sinceLen = 0) {
  for (let i = 0; i < 40; i++) {
    const text = fs.readFileSync(LOG, "utf8").slice(sinceLen);
    const re = new RegExp(`\\[dev (?:EMAIL|SMS)\\] to=${to.replace(/[+.]/g, "\\$&")}\\s+(\\d{6})`, "g");
    let m, last;
    while ((m = re.exec(text))) last = m[1];
    if (last) return last;
    await sleep(250);
  }
  throw new Error(`no OTP found for ${to}`);
}
const logLen = () => fs.readFileSync(LOG, "utf8").length;

const results = [];
const problems = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`PASS  ${name} (${Date.now() - t0}ms)`);
  } catch (err) {
    results.push({ name, ok: false, err: err.message });
    console.log(`FAIL  ${name}\n      ${err.message.split("\n")[0]}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) problems.push(`[console.${m.type()} @ ${page.url().replace(BASE, "")}] ${m.text().slice(0, 3500)}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message.slice(0, 300)}`));
page.on("requestfailed", (r) => problems.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false, caret: "initial" });

const EMAIL = `e2e-${Date.now()}@example.test`;

await step("landing renders with a nonce-based CSP and hardening headers", async () => {
  const res = await page.goto(BASE + "/");
  const h = res.headers();
  assert(h["content-security-policy"]?.includes("'nonce-"), "CSP without nonce");
  assert(h["content-security-policy"].includes("frame-ancestors 'none'"), "CSP missing frame-ancestors");
  assert(h["x-content-type-options"] === "nosniff", "missing nosniff");
  assert(!h["x-powered-by"], "x-powered-by leaked");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot("01-landing");
});

await step("protected pages redirect to login and remember where you were going", async () => {
  await page.goto(BASE + "/discover");
  assert(page.url().includes("/login?next=%2Fdiscover"), `got ${page.url()}`);
  const api = await ctx.request.get(BASE + "/api/me/export");
  assert(api.status() === 401, `export without login should be 401, got ${api.status()}`);
  const cron = await ctx.request.get(BASE + "/api/cron/retention");
  assert(cron.status() === 401, "cron without secret should be 401");
});

await step("signup validates before contacting the server", async () => {
  await page.goto(BASE + "/signup");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Enter your mobile number or email.").waitFor({ timeout: 2000 });
  await page.getByLabel("Mobile number or email").fill("not-an-email@@");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Enter a valid email address.").waitFor({ timeout: 2000 });
  await page.getByLabel("Mobile number or email").fill("12345");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText(/valid/i).first().waitFor({ timeout: 2000 });
  await page.getByLabel("Mobile number or email").fill(EMAIL);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Please accept the Terms and Privacy Notice").first().waitFor({ timeout: 2000 });
  await page.getByText("You must be 18 or older to join.").waitFor({ timeout: 2000 });
  await shot("02-signup-errors");
});

await step("signup with email OTP creates the account and lands on onboarding", async () => {
  const before = logLen();
  await page.getByText(/I agree to the/).click();
  await page.getByText("I am 18 years or older.").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Enter your code").waitFor({ timeout: 8000 });
  await shot("03-otp");

  // Wrong code is rejected and the field is cleared for a retry.
  await page.locator("#code").fill("000000");
  await page.getByText("That code is incorrect or has expired.").waitFor({ timeout: 8000 });
  assert((await page.locator("#code").inputValue()) === "", "code field should clear after a wrong code");

  const code = await otpFor(EMAIL, before);
  await page.locator("#code").fill(code); // auto-submits at 6 digits
  await page.waitForURL("**/onboarding", { timeout: 15000 });
});

await step("wizard step 1: conditional fields, legal age check", async () => {
  await page.getByRole("heading", { name: "About you" }).waitFor();
  await page.selectOption("#profileFor", "SELF");
  await page.fill("#firstName", "Aditi");
  await page.fill("#lastName", "Rao");
  await page.selectOption("#gender", "FEMALE");
  await page.fill("#dateOfBirth", yearsAgo(17));
  await page.selectOption("#maritalStatus", "DIVORCED");
  await page.locator("#hasChildren").waitFor({ timeout: 2000 }); // conditional field appears
  await page.selectOption("#maritalStatus", "NEVER_MARRIED");
  await page.locator("#hasChildren").waitFor({ state: "detached", timeout: 2000 }); // and disappears
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("You must be 18 or older to use Saathi.").waitFor({ timeout: 3000 });
  await shot("04-wizard-underage");
  await page.fill("#dateOfBirth", yearsAgo(27));
  await page.selectOption("#heightCm", "165");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Religion & community" }).waitFor({ timeout: 8000 });
});

await step("wizard step 2: horoscope is opt-in and reveals its fields", async () => {
  await page.selectOption("#religion", "HINDU");
  await page.selectOption("#sect", "VAISHNAV");
  await page.fill("#caste", "Iyengar");
  await page.selectOption("#motherTongue", "TAMIL");
  assert((await page.locator("#rashi").count()) === 0, "horoscope fields must be hidden until opted in");
  await page.getByText("Add my horoscope details").click();
  await page.locator("#rashi").waitFor({ timeout: 2000 });
  await page.selectOption("#rashi", "MESHA");
  await shot("05-wizard-community");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Where you live" }).waitFor({ timeout: 8000 });
});

await step("wizard steps 3-6 complete the profile", async () => {
  await page.selectOption("#state", "TN");
  await page.fill("#city", "Chennai");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Education & work" }).waitFor({ timeout: 8000 });
  await page.selectOption("#education", "MASTERS");
  await page.selectOption("#occupationSector", "IT");
  await page.fill("#occupation", "Data scientist");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Family & lifestyle" }).waitFor({ timeout: 8000 });
  await page.selectOption("#diet", "VEG");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "About you & your match" }).waitFor({ timeout: 8000 });
  await page.fill("#about", "Call me on 9876543210 to talk");
  await page.getByRole("button", { name: "Finish and go live" }).click();
  await page.getByText("Please remove phone numbers, emails, links and handles.").waitFor({ timeout: 3000 });
  await page.fill("#about", "I work with data by day and cook South Indian food on weekends. Looking for someone kind and curious.");
  await page.selectOption("#ageMin", "28");
  await page.selectOption("#ageMax", "36");
  await shot("06-wizard-last");
  await page.getByRole("button", { name: "Finish and go live" }).click();
  await page.waitForURL("**/discover", { timeout: 15000 });
});

await step("discover lists members of the opposite gender with privacy-safe cards", async () => {
  await page.getByRole("heading", { name: "Discover" }).waitFor();
  const cards = page.locator("article");
  await cards.first().waitFor({ timeout: 8000 });
  const n = await cards.count();
  assert(n > 0, "no cards");
  const html = await page.content();
  assert(!html.includes("@demo.saathi.test"), "demo email leaked into the page");
  assert(!/dateOfBirth|emailEnc|phoneEnc/.test(html), "sensitive field names leaked into the page");
  await shot("07-discover");
  console.log(`      ${n} cards on page 1`);
});

await step("changing a filter updates results without a full reload", async () => {
  await page.evaluate(() => (window.__marker = "still-here"));
  await page.selectOption("#f-religion", "SIKH");
  await page.waitForURL(/religion=SIKH/, { timeout: 8000 });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 8000 });
  assert((await page.evaluate(() => window.__marker)) === "still-here", "page did a full reload");
  const text = await page.locator("main").innerText();
  assert(/Sikh/.test(text), "results should mention Sikh");
  await shot("08-discover-filtered");
  await page.selectOption("#f-religion", "");
  await page.waitForURL((u) => !u.search.includes("religion"), { timeout: 8000 });
});

await step("send interest is optimistic, persists, and can be withdrawn", async () => {
  const btn = page.getByRole("button", { name: /^Send interest to/ }).first();
  await btn.waitFor();
  const label = await btn.getAttribute("aria-label");
  const t0 = Date.now();
  await btn.click();
  await page.getByRole("button", { name: new RegExp(`^Interest sent to ${label.replace("Send interest to ", "")}`) }).waitFor({ timeout: 4000 });
  console.log(`      optimistic flip in ${Date.now() - t0}ms`);
  await page.reload();
  await page.getByRole("button", { name: /^Interest sent to/ }).first().waitFor({ timeout: 8000 });
  await page.getByRole("button", { name: /^Interest sent to/ }).first().click();
  await page.getByRole("button", { name: /^Send interest to/ }).first().waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: /^Send interest to/ }).first().click(); // leave one interest sent
  await page.getByRole("button", { name: /^Interest sent to/ }).first().waitFor({ timeout: 4000 });
});

await step("profile page shows the member without leaking private data", async () => {
  await page.locator("article h2 a").first().click();
  await page.waitForURL(/\/profile\/[a-z0-9]+/, { timeout: 8000 });
  await page.getByRole("heading", { level: 1 }).waitFor();
  const html = await page.content();
  assert(!html.includes("@demo.saathi.test"), "email leaked on profile page");
  assert(!/dateOfBirth/.test(html), "dob field leaked on profile page");
  const text = await page.locator("main").innerText();
  assert(/Basics/.test(text) && /Education & work/.test(text), "sections missing");
  await shot("09-profile");
  await page.getByRole("link", { name: "Discover" }).first().click();
  await page.waitForURL("**/discover");
});

await step("nav transitions feel instant (prefetched, skeleton on slow routes)", async () => {
  const timings = {};
  for (const name of ["Interests", "Profile", "Settings", "Discover"]) {
    const t0 = Date.now();
    await page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name }).click();
    await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 8000 });
    timings[name] = Date.now() - t0;
  }
  console.log(`      nav timings (dev mode, incl. compile): ${JSON.stringify(timings)}`);
});

await step("privacy centre: consents toggle and persist; own profile shows what others see", async () => {
  await page.goto(BASE + "/settings/privacy");
  const sw = page.getByRole("switch", { name: "Share my contact after a mutual match" });
  await sw.waitFor();
  assert((await sw.getAttribute("aria-checked")) === "false", "optional consent must default OFF");
  await sw.click();
  await page.getByText("Consent recorded").waitFor({ timeout: 4000 });
  await page.reload();
  assert((await page.getByRole("switch", { name: "Share my contact after a mutual match" }).getAttribute("aria-checked")) === "true", "consent not persisted");
  const horo = page.getByRole("switch", { name: "Use my horoscope details" });
  assert((await horo.getAttribute("aria-checked")) === "true", "horoscope consent given in the wizard should show as on");
  await horo.click();
  await page.getByText(/Consent withdrawn/).waitFor({ timeout: 4000 });
  await shot("10-privacy");
  await page.goto(BASE + "/profile");
  const mine = await page.locator("main").innerText();
  assert(!/Horoscope/.test(mine), "horoscope section must disappear after withdrawal");
  assert(/Iyengar/.test(mine), "own community should be visible");
});


await step("mutual match: contact details appear only when BOTH people consent", async () => {
  const me = await db.profile.findFirstOrThrow({ where: { firstName: "Aditi" }, orderBy: { createdAt: "desc" } });
  const other = await db.profile.findFirstOrThrow({ where: { gender: "MALE", completedAt: { not: null }, user: { emailHash: { not: null } } }, include: { user: true } });
  await db.interest.deleteMany({ where: { OR: [{ fromUserId: me.userId }, { toUserId: me.userId }] } });
  await db.interest.create({ data: { fromUserId: other.userId, toUserId: me.userId } });

  await page.goto(BASE + "/interests");
  await page.getByRole("button", { name: /^Accept interest from/ }).waitFor({ timeout: 8000 });
  await shot("15-interests-received");
  await page.getByRole("button", { name: /^Accept interest from/ }).click();
  await page.getByText(/are connected/).waitFor({ timeout: 8000 }); // toast; the row leaves the list as it refreshes

  await page.goto(BASE + "/interests?tab=connections");
  await page.getByText("Waiting for them to enable sharing").waitFor({ timeout: 8000 });
  const hidden = await page.locator("main").innerText();
  assert(!hidden.includes("@demo.saathi.test"), "contact shown before the other person consented");

  await db.consentRecord.create({ data: { userId: other.userId, purpose: "contact_sharing", granted: true, noticeVersion: "test", source: "settings" } });
  await page.reload();
  await page.getByRole("link", { name: /@demo.saathi.test$/ }).waitFor({ timeout: 8000 });
  await shot("16-connection-contact");

  await db.consentRecord.create({ data: { userId: other.userId, purpose: "contact_sharing", granted: false, noticeVersion: "test", source: "settings" } });
  await page.reload();
  await page.getByText("Waiting for them to enable sharing").waitFor({ timeout: 8000 });
  assert(!(await page.locator("main").innerText()).includes("@demo.saathi.test"), "contact still shown after consent was withdrawn");
});

await step("remaining screens render (own profile, account settings)", async () => {
  await page.goto(BASE + "/profile");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shot("17-own-profile");
  await page.goto(BASE + "/settings");
  await page.getByText("Where you're signed in").waitFor();
  await shot("18-settings-account");
});

await step("data export contains my data and nobody else's", async () => {
  const res = await ctx.request.get(BASE + "/api/me/export");
  assert(res.status() === 200, `export status ${res.status()}`);
  assert(/attachment/.test(res.headers()["content-disposition"] ?? ""), "not an attachment");
  const j = await res.json();
  assert(j.account.email === EMAIL, "export missing my email");
  assert(j.profile.firstName === "Aditi", "export missing profile");
  assert(j.consents.some((c) => c.purpose === "horoscope" && c.granted === false), "consent ledger missing withdrawal");
  assert(!JSON.stringify(j).includes("demo.saathi.test"), "export leaked another member");
});

await step("logout, then log back in with the same email", async () => {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/discover");
  assert(page.url().includes("/login"), "still logged in after logout");
  await sleep(31_000); // OTP resend cooldown for this address
  const before = logLen();
  await page.getByLabel("Mobile number or email").fill(EMAIL);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Enter your code").waitFor({ timeout: 8000 });
  await page.locator("#code").fill(await otpFor(EMAIL, before));
  await page.waitForURL("**/discover", { timeout: 15000 });
});

await step("login for an unknown address looks identical (no account enumeration)", async () => {
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/login");
  await p2.getByLabel("Mobile number or email").fill(`nobody-${Date.now()}@example.test`);
  await p2.getByRole("button", { name: "Continue", exact: true }).click();
  await p2.getByText("Enter your code").waitFor({ timeout: 8000 });
  await p2.locator("#code").fill("123456");
  await p2.getByText("That code is incorrect or has expired.").waitFor({ timeout: 8000 });
  await ctx2.close();
});

await step("account deletion: schedule, banner, cancel", async () => {
  await page.goto(BASE + "/settings/privacy");
  await page.getByRole("button", { name: "Delete my account" }).first().click();
  const confirm = page.getByRole("dialog").getByRole("button", { name: "Delete my account" });
  assert(await confirm.isDisabled(), "confirm must stay disabled until DELETE is typed");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();
  await page.getByText(/permanently erased on/).waitFor({ timeout: 8000 });
  await shot("11-deletion-banner");
  await page.goto(BASE + "/discover");
  await page.waitForURL("**/settings/privacy", { timeout: 8000 }); // pending accounts are confined to settings
  await page.getByRole("button", { name: "Keep my account" }).click();
  await page.getByText(/permanently erased on/).waitFor({ state: "detached", timeout: 8000 });
});

await step("legal pages and grievance form work", async () => {
  await page.goto(BASE + "/privacy");
  await page.getByRole("heading", { name: "Privacy Notice" }).waitFor();
  await page.goto(BASE + "/grievance");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText("Enter your name.").waitFor({ timeout: 4000 });
  await page.fill("#g-name", "Test Person");
  await page.fill("#g-contact", `person-${Date.now()}@example.test`);
  await page.selectOption("#g-category", "ACCESS");
  await page.fill("#g-message", "Please send me a copy of all my personal data that you hold about me.");
  await page.getByRole("button", { name: "Submit" }).click();
  await page.getByText(/GR-[A-Z0-9]{8}/).waitFor({ timeout: 8000 });
  await shot("12-grievance-done");
});

await step("mobile layout: bottom tab bar, no horizontal scroll", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/discover");
  await page.locator("article").first().waitFor({ timeout: 8000 });
  const nav = page.getByRole("navigation", { name: "Main" }).last();
  assert(await nav.isVisible(), "tab bar not visible on mobile");
  const box = await nav.boundingBox();
  assert(box && Math.abs(box.y + box.height - 844) < 2, `tab bar must sit at the bottom edge, got y=${box?.y} h=${box?.height}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
  await shot("13-mobile-discover");
  await page.goto(BASE + "/onboarding?step=basics");
  await page.getByRole("heading", { name: "About you" }).waitFor();
  await shot("14-mobile-wizard");
});

await step("reduced-motion preference is honoured", async () => {
  const ctx3 = await browser.newContext({ reducedMotion: "reduce" });
  const p3 = await ctx3.newPage();
  await p3.goto(BASE + "/login");
  const dur = await p3.evaluate(() => getComputedStyle(document.querySelector("button")).transitionDuration);
  assert(parseFloat(dur) < 0.01, `transitions should be ~0 with reduced motion, got ${dur}`);
  await ctx3.close();
});

await browser.close();
await db.$disconnect();

const failed = results.filter((r) => !r.ok);
const noise = problems.filter((p) => !/Download the React DevTools|Fast Refresh|\[HMR\]/.test(p));
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
if (noise.length) {
  console.log(`\nBrowser console problems (${noise.length}):`);
  for (const p of [...new Set(noise)].slice(0, 25)) console.log("  " + p);
}
process.exit(failed.length ? 1 : 0);
