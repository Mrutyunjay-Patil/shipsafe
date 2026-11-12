// Sandbox guest card checkout (no PayPal account) as a US buyer.
// Usage: node probes/guest_pay.js <checkoutnow url | ncp payment link url> [variant]
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const [url, variant] = process.argv.slice(2);
const tag = url.includes('ncp/payment') ? 'link' : 'order';
let n = 0;
const shot = (pg, l) => pg.screenshot({ path: path.join(root, 'evidence', `pay-guest-${tag}-${++n}-${l}.png`), fullPage: true }).catch(() => {});

async function fillCard(f) {
  await f.click('button:has-text("Yes, I accept"), #acceptAllButton', { timeout: 3000 }).catch(() => {});
  await f.selectOption('select[name="country"]', 'US').catch(() => {});
  await f.waitForTimeout(2000);
  const fill = (s, v) => f.fill(s, v, { timeout: 8000 }).catch(e => console.log('fill', s, e.message.slice(0, 60)));
  await fill('input[name="cardnumber"]', '4111111111111111');
  await fill('input[name="exp-date"]', '12/30');
  await fill('input[name="cvv"]', '123');
  await fill('input[name="fname"]', 'Test');
  await fill('input[name="lname"]', 'Buyer');
  await fill('input[name="billingLine1"]', '2211 N First St');
  await fill('input[name="billingCity"]', 'San Jose');
  await f.selectOption('select[name="billingState"]', 'CA').catch(() => {});
  await fill('input[name="billingPostalCode"]', '95131');
  const ph = f.locator('input[name="phone"], input[type="tel"][autocomplete*="tel"]').first();
  await ph.click({ timeout: 5000 }).catch(() => {});
  await ph.pressSequentially('4085550123', { delay: 30 }).catch(e => console.log('phone', e.message.slice(0, 60)));
  await fill('input[name="email"]', 'shipsafe-guest@example.com');
  await f.keyboard.press('Tab');
  await shot(f, 'filled');
  await f.click('button:has-text("Pay now as guest"), button:has-text("Continue as Guest"), button:has-text("Pay Now")', { timeout: 10000 })
    .catch(e => console.log('submit', e.message.slice(0, 80)));
  for (let i = 0; i < 20 && !f.isClosed(); i++) await f.waitForTimeout(1000);
  if (!f.isClosed()) {
    await shot(f, 'after-submit');
    console.log('still open:', f.url().slice(0, 120));
    console.log((await f.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').match(/.{0,80}(error|sorry|declin|try again|required|invalid).{0,80}/gi)?.slice(0, 5));
  } else console.log('popup closed after submit');
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1200, height: 1100 }, locale: 'en-US' });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 160)); });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(3000);
  if (tag === 'link') {
    if (variant) await p.locator('select[name="variant-dropdown-0"]').selectOption({ label: variant }, { force: true });
    await p.waitForTimeout(1500);
    const cf = p.frames().find(fr => fr.url().includes('fundingSource=card'));
    const popP = ctx.waitForEvent('page', { timeout: 15000 });
    await cf.click('[data-funding-source="card"], div[role="link"], button', { timeout: 15000 });
    const pop = await popP;
    await pop.waitForLoadState('networkidle').catch(() => {});
    await fillCard(pop);
    await p.waitForTimeout(10000).catch(() => {});
    await shot(p, 'main-final');
    console.log('main:', p.url().slice(0, 120), '|', (await p.innerText('body').catch(() => '')).replace(/\n+/g, ' | ').slice(0, 250));
  } else {
    const guest = p.locator('button:has-text("Pay with Debit or Credit Card"), a:has-text("Pay with Debit or Credit Card"), #createAccount');
    await guest.first().click({ timeout: 20000 }).catch(e => console.log('guest btn', e.message.slice(0, 80)));
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(4000);
    await fillCard(p);
    if (!p.isClosed()) console.log('final:', p.url().slice(0, 140));
  }
  await b.close();
})();
