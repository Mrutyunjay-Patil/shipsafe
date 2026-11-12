// Pay as the sandbox buyer with headless Playwright.
// Usage: node probes/buyer_pay.js <checkoutnow url | ncp payment link url> [variant label]
// Reads SANDBOX_BUYER_EMAIL / SANDBOX_BUYER_PASSWORD from .env. Screenshots go to
// evidence/pay-*.png (they can show the buyer name, so they stay out of git).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const EMAIL = process.env.SANDBOX_BUYER_EMAIL, PASS = process.env.SANDBOX_BUYER_PASSWORD;
const [url, variant] = process.argv.slice(2);
const tag = url.includes('ncp/payment') ? 'link' : 'order';
let n = 0;
const shot = (pg, label) => pg.screenshot({ path: path.join(root, 'evidence', `pay-${tag}-${++n}-${label}.png`), fullPage: true }).catch(() => {});

async function login(pg) {
  await pg.waitForLoadState('domcontentloaded');
  await pg.click('button:has-text("Accept"), #acceptAllButton', { timeout: 4000 }).catch(() => {});
  const email = pg.locator('input#email, input[name="login_email"]');
  if (await email.isVisible({ timeout: 20000 }).catch(() => false)) {
    await email.fill(EMAIL);
    const next = pg.locator('button#btnNext');
    if (await next.isVisible({ timeout: 3000 }).catch(() => false)) await next.click();
    const pw = pg.locator('input#password, input[name="login_password"]');
    await pw.waitFor({ state: 'visible', timeout: 20000 });
    await pw.fill(PASS);
    await shot(pg, 'login');
    await pg.click('button#btnLogin, button[type="submit"]:has-text("Log In")');
  } else {
    console.log('no login form visible; url', pg.url().slice(0, 100));
  }
}

async function finish(pg) {
  for (let i = 0; i < 30; i++) {
    if (pg.isClosed()) return 'closed';
    const btn = pg.locator('button[data-id="payment-submit-btn"], button#payment-submit-btn, button:has-text("Complete Purchase"), button:has-text("Pay Now"), button:has-text("Continue to Review Order"), button:has-text("Continue")').first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await shot(pg, 'review');
      const label = (await btn.innerText().catch(() => '')).trim();
      console.log('clicking', JSON.stringify(label));
      await btn.click().catch(e => console.log('click', e.message.slice(0, 100)));
      await pg.waitForTimeout(6000);
      return label;
    }
    const body = (await pg.innerText('body').catch(() => '')).toLowerCase();
    if (body.includes('captcha') || body.includes('security challenge') || body.includes("confirm it's you")) { await shot(pg, 'challenge'); return 'challenge'; }
    await pg.waitForTimeout(1000);
  }
  await shot(pg, 'stuck');
  return 'stuck';
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 1100 }, locale: 'en-US' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  let pg = p;
  if (tag === 'link') {
    await p.waitForTimeout(3000);
    if (variant) await p.locator('select[name="variant-dropdown-0"]').selectOption({ label: variant }, { force: true });
    await p.waitForTimeout(1500);
    const f = p.frames().find(fr => fr.url().includes('fundingSource=paypal'));
    const popupP = ctx.waitForEvent('page', { timeout: 15000 });
    await f.click('[data-funding-source="paypal"], div[role="link"], button', { timeout: 15000 });
    pg = await popupP;
  }
  await login(pg);
  await pg.waitForTimeout(5000);
  let r = await finish(pg);
  console.log('step1:', r);
  if (!pg.isClosed() && r !== 'challenge' && r !== 'stuck' && /continue/i.test(r)) { r = await finish(pg); console.log('step2:', r); }
  await p.waitForTimeout(8000);
  await shot(p, 'final');
  console.log('final url:', p.url().slice(0, 140));
  console.log((await p.innerText('body').catch(() => '')).slice(0, 300).replace(/\n+/g, ' | '));
  await b.close();
})();
