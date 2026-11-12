// Log in with PayPal (sandbox): drive the consent screen as a sandbox account.
// Usage: node probes/login_paypal.js <seller|buyer> <state>
// The return URL lands on the Worker, which stores the authorization code under <state>.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const [who, state] = process.argv.slice(2);
const EMAIL = who === 'seller' ? process.env.SANDBOX_SELLER_EMAIL : process.env.SANDBOX_BUYER_EMAIL;
const PASS = who === 'seller' ? process.env.SANDBOX_SELLER_PASSWORD : process.env.SANDBOX_BUYER_PASSWORD;
const REDIRECT = 'https://shipsafe-webhook-probe.patilmrutyunjay2.workers.dev/auth/paypal/callback';
const SCOPE = 'openid email https://uri.paypal.com/services/paypalattributes';
const url = 'https://www.sandbox.paypal.com/connect/?flowEntry=static' +
  `&client_id=${encodeURIComponent(process.env.PAYPAL_CLIENT_ID)}&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}&redirect_uri=${encodeURIComponent(REDIRECT)}&state=${state}`;
let n = 0;
const shot = (pg, l) => pg.screenshot({ path: path.join(root, 'evidence', `pay-login-${who}-${++n}-${l}.png`), fullPage: true }).catch(() => {});
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1200, height: 1000 }, locale: 'en-US' })).newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4000);
  await shot(p, 'start');
  const text = async () => (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ');
  if (/redirect|invalid|error/i.test(await text()) && !(await p.locator('input#email').isVisible().catch(() => false))) {
    console.log('PayPal refused the request:', (await text()).slice(0, 300)); await b.close(); return;
  }
  await p.click('#acceptAllButton', { timeout: 3000 }).catch(() => {});
  await p.fill('input#email', EMAIL, { timeout: 20000 });
  if (await p.locator('button#btnNext').isVisible({ timeout: 3000 }).catch(() => false)) await p.click('button#btnNext');
  await p.locator('input#password').waitFor({ state: 'visible', timeout: 20000 });
  await p.fill('input#password', PASS);
  await p.click('button#btnLogin');
  for (let i = 0; i < 30 && !p.url().startsWith(REDIRECT); i++) {
    const consent = p.locator('button:has-text("Agree and Continue"), button:has-text("Agree & Continue"), button:has-text("Continue"), button#agreeConsent');
    if (await consent.first().isVisible({ timeout: 1000 }).catch(() => false)) { await shot(p, 'consent'); await consent.first().click(); }
    await p.waitForTimeout(1000);
  }
  await shot(p, 'end');
  console.log('landed:', p.url().startsWith(REDIRECT) ? 'callback' : p.url().slice(0, 120));
  console.log((await text()).slice(0, 200));
  await b.close();
})();
