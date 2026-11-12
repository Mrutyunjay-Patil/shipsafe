// Log in to sandbox.paypal.com as the sandbox SELLER and read the account country
// and currency settings. Sandbox only. Screenshots stay out of git (pay-*.png rule).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const who = process.argv[2] || 'seller';
const EMAIL = who === 'seller' ? process.env.SANDBOX_SELLER_EMAIL : process.env.SANDBOX_BUYER_EMAIL;
const PASS = who === 'seller' ? (process.env.SANDBOX_SELLER_PASSWORD || process.env.SANDBOX_BUYER_PASSWORD) : process.env.SANDBOX_BUYER_PASSWORD;
let n = 0;
const shot = (pg, l) => pg.screenshot({ path: path.join(root, 'evidence', `pay-${who}-${++n}-${l}.png`), fullPage: true }).catch(() => {});
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 }, locale: 'en-US' });
  const p = await ctx.newPage();
  await p.goto('https://www.sandbox.paypal.com/signin', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.click('#acceptAllButton', { timeout: 4000 }).catch(() => {});
  await p.fill('input#email', EMAIL);
  if (await p.locator('button#btnNext').isVisible({ timeout: 3000 }).catch(() => false)) await p.click('button#btnNext');
  await p.locator('input#password').waitFor({ state: 'visible', timeout: 20000 });
  await p.fill('input#password', PASS);
  await p.click('button#btnLogin');
  await p.waitForLoadState('networkidle', { timeout: 45000 }).catch(() => {});
  await p.waitForTimeout(4000);
  console.log('after login:', p.url().slice(0, 100));
  await shot(p, 'home');
  for (const u of (process.argv[3] ? process.argv.slice(3) : ['https://www.sandbox.paypal.com/myaccount/settings/', 'https://www.sandbox.paypal.com/myaccount/money'])) {
    await p.goto(u, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await shot(p, u.split('/').filter(Boolean).pop());
    const t = (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
    const hits = t.match(/.{0,60}(India|United States|INR|USD|currenc|country|track|EE48|EE12|RR28|India Post|shipped).{0,60}/gi) || [];
    console.log('\n==', u, '\n', [...new Set(hits)].slice(0, 12).join('\n '));
  }
  await b.close();
})();
