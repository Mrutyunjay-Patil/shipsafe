// End-to-end check of the real app against the PayPal sandbox.
// Usage: node e2e/flow.mjs <base url> <step...>
//   steps: login  sell  pay  ship
// Reads sandbox logins from ../shipsafe-prereq/.env. Session cookies persist in e2e/.state.json.
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import fs from 'node:fs'
import path from 'node:path'

const here = path.dirname(new URL(import.meta.url).pathname)
const env = Object.fromEntries(
  fs.readFileSync(path.join(here, '../../shipsafe-prereq/.env'), 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)
const [base, ...steps] = process.argv.slice(2)
const STATE = path.join(here, '.state.json')
const SHOTS = path.join(here, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, `${n}.png`) }).catch(() => {})
const memo = path.join(here, '.memo.json')
const M = fs.existsSync(memo) ? JSON.parse(fs.readFileSync(memo, 'utf8')) : {}
const save = () => fs.writeFileSync(memo, JSON.stringify(M, null, 2))

async function paypalLogin(p, email, pass) {
  await p.click('#acceptAllButton', { timeout: 3000 }).catch(() => {})
  await p.fill('input#email', email, { timeout: 25000 })
  if (await p.locator('button#btnNext').isVisible({ timeout: 3000 }).catch(() => false)) await p.click('button#btnNext')
  await p.locator('input#password').waitFor({ state: 'visible', timeout: 20000 })
  await p.fill('input#password', pass)
  await p.click('button#btnLogin')
}

const b = await chromium.launch()
const ctx = await b.newContext({
  viewport: { width: 430, height: 932 }, locale: 'en-US',
  storageState: fs.existsSync(STATE) ? STATE : undefined,
})
const p = await ctx.newPage()

try {
  for (const step of steps) {
    if (step === 'login') {
      await p.goto(`${base}/auth/paypal/login`)
      await p.waitForTimeout(3000)
      if (/invalid client_id or redirect_uri/i.test(await p.innerText('body').catch(() => ''))) throw new Error('PayPal rejected the return URL')
      await paypalLogin(p, env.SANDBOX_SELLER_EMAIL, env.SANDBOX_SELLER_PASSWORD)
      for (let i = 0; i < 40 && !p.url().startsWith(base); i++) {
        const c = p.locator('button:has-text("Agree and Continue"), button:has-text("Agree & Continue"), button#agreeConsent')
        if (await c.first().isVisible({ timeout: 800 }).catch(() => false)) await c.first().click()
        await p.waitForTimeout(800)
      }
      await p.waitForLoadState('networkidle')
      const me = await (await ctx.request.get(`${base}/api/me`)).json()
      console.log('login:', me.signedIn ? `signed in as ${me.seller.id}` : 'NOT signed in', p.url())
      await ctx.storageState({ path: STATE })
      await shot(p, '1-home')
    }
    if (step === 'sell') {
      await p.goto(`${base}/sell`)
      await p.setInputFiles('input[type=file]:not([capture])', path.join(here, '../public/sample/paisley-scarf.jpg'))
      await p.getByRole('button', { name: /Make the PayPal link/ }).waitFor({ timeout: 60000 })
      await shot(p, '2-draft')
      console.log('draft title:', await p.inputValue('#title'), '| price:', await p.inputValue('#price'))
      await p.getByRole('button', { name: /Make the PayPal link/ }).click()
      await p.getByText('Your link is ready to send').waitFor({ timeout: 60000 })
      M.link = (await p.locator('p.tracking-code').innerText()).trim()
      save()
      console.log('link:', M.link)
      await shot(p, '3-link')
    }
    if (step === 'pay') {
      const bp = await (await b.newContext({ viewport: { width: 1200, height: 1000 }, locale: 'en-US' })).newPage()
      await bp.goto(M.link, { waitUntil: 'networkidle' })
      await bp.waitForTimeout(2500)
      const sel = bp.locator('select[name="variant-dropdown-0"]')
      if (await sel.count()) {
        const opts = await sel.locator('option').allInnerTexts()
        await sel.selectOption({ label: opts.filter((o) => o && o !== 'Colour').at(-1) }, { force: true })
      }
      await bp.waitForTimeout(1200)
      const f = bp.frames().find((fr) => fr.url().includes('fundingSource=paypal'))
      const popP = bp.context().waitForEvent('page', { timeout: 20000 })
      await f.click('[data-funding-source="paypal"], div[role="link"], button')
      const pop = await popP
      await paypalLogin(pop, env.SANDBOX_BUYER_EMAIL, env.SANDBOX_BUYER_PASSWORD)
      const btn = pop.locator('button[data-id="payment-submit-btn"], button:has-text("Complete Purchase"), button:has-text("Pay Now")').first()
      await btn.waitFor({ timeout: 45000 })
      await btn.click()
      await bp.waitForTimeout(8000).catch(() => {})
      console.log('buyer paid; landed on', bp.url().slice(0, 80))
      await shot(bp, '4-buyer-done')
      for (let i = 0; i < 30; i++) {
        const orders = await (await ctx.request.get(`${base}/api/orders`)).json()
        const o = orders.find((x) => x.status === 'PAID')
        if (o) { M.order = o.id; save(); console.log('order arrived via webhook:', o.id, o.variant, o.ship_city, o.ship_postcode, o.ship_country); break }
        await p.waitForTimeout(4000)
      }
      if (!M.order) console.log('no PAID order arrived within 2 minutes')
    }
    if (step === 'ship') {
      await p.goto(`${base}/orders/${M.order}`)
      await p.getByRole('button', { name: /Scan the courier slip/ }).waitFor({ timeout: 20000 })
      await p.setInputFiles('input[type=file]:not([capture])', path.join(here, 'slip.png'))
      await p.getByText('Check before PayPal sees it').waitFor({ timeout: 60000 })
      await shot(p, '5-checks')
      await p.getByRole('button', { name: /Send tracking to PayPal/ }).click()
      await p.getByText('Tracking on PayPal').waitFor({ timeout: 30000 })
      await shot(p, '6-tracked')
      const o = await (await ctx.request.get(`${base}/api/orders/${M.order}`)).json()
      console.log('after ship:', o.status, o.trackers.map((t) => `${t.id} ${t.status}`).join(', '))
    }
  }
} catch (e) {
  console.log('FAILED:', e.message.split('\n')[0])
  await shot(p, 'failed')
} finally {
  await b.close()
}
