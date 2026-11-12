# ShipSafe

**From a product photo to a protected PayPal sale, without leaving the phone.**

People who sell through Instagram DMs and WhatsApp chats already take PayPal. What they lack is the proof trail. When a buyer says "it never arrived", a seller with no tracking on the PayPal order has little to stand on. ShipSafe gives every chat sale that trail:

1. **Photo to listing.** The seller photographs the product, and Claude drafts the title, description, colours, category, price and product details.
2. **Payment link.** ShipSafe creates a PayPal payment link with the Payment Links and Buttons API. The seller copies a ready-made message with the link into the chat.
3. **Buyer pays on PayPal.** A verified PayPal webhook brings in the order, the chosen colour and the buyer's shipping address.
4. **Slip to tracking.** The seller photographs the courier slip. Claude reads the carrier and tracking number, and code checks them: the UPU S10 check digit, the address against PayPal's, and that the number isn't already used.
5. **Protected.** ShipSafe adds the tracking to the PayPal order with `notify_payer: true`. PayPal emails the buyer, and the sale carries the delivery evidence PayPal Seller Protection relies on.

## Try it

| | |
|---|---|
| Live app, PayPal sandbox | https://mrutyunjaypatil.dev/shipsafe |
| Sample-data preview, no login | https://shipsafe-preview.patilmrutyunjay2.workers.dev |

- **The live app** signs in with Log in with PayPal using a sandbox Business account. Its logins are in the Devpost testing instructions.
- **To pay as a buyer,** open any payment link the app makes and pay with the sandbox Personal account from the same instructions.
- **The preview** runs the same app on built-in sample data, with nothing sent to PayPal.
- **Test photos:** product photos are in `submission/demo-assets/test-products/`. Courier slips addressed to the sandbox buyer are in `submission/demo-assets/test-slips/`.

## What's in it

**Selling**
- **AI listing from one photo.** Claude Haiku 5.5 vision returns strict JSON. Repeated colours are removed, and the description is cut at a sentence end.
- **Up to six photos per listing.** Add from the camera or gallery and pick the cover. Phone photos are shrunk to about 1600 px before upload.
- **Product details** with suggestions for any product type, and an AI rewrite of the description from the details. Descriptions can use PayPal's full 2,048 characters, with details listed one per line on PayPal's page.

**Payment links**
- **Copy and Send** give a short message with the link, not a bare URL.
- **Editing a product** updates the live PayPal link in place.
- **Stock controls the link.** The link closes when the last unit sells. Raising stock on a sold-out product makes a fresh link, because PayPal deletes sold-out links.
- **Links for one buyer.** Each has an optional special price and fixed colour. It closes after one payment, when the product sells out, when the seller closes it, or when it expires. An hourly job handles expiry. The order shows whose link was paid.

**Orders and shipping**
- **Orders** come in through a signed PayPal webhook, with idempotent event handling. If two buyers pay for the last unit, ShipSafe flags the extra order for a one-tap refund.
- **Slip scan.** Claude reads the courier slip, and code runs the checks. The slip text is treated as untrusted data, and a printed prompt injection is ignored.
- **Tracking is added to the PayPal order** through Orders v2 `/track`. It can be cancelled, and orders can be refunded.

**Other screens**
- **Order board** on desktop, built with AG Grid, plus a phone list.
- **Dashboard** with a sales chart, a protection meter, an activity feed and a setup checklist.
- **Ask your shop:** Claude answers questions such as "which paid orders aren't protected yet?" using read-only tools over the shop's orders and PayPal's order and dispute endpoints.

## PayPal and AI used

| PayPal | Used for |
|---|---|
| Payment Links and Buttons API, `/v1/checkout/payment-resources` | Create, update (PUT), read and delete links, with colour variants |
| Webhooks, `CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED` and `PAYMENT.CAPTURE.REFUNDED` | Orders, with signature verification |
| Orders v2, including `/v2/checkout/orders/{id}/track` and tracker PATCH | Variant, shipping address, add and cancel tracking |
| Payments v2 captures and refunds | Seller protection status, refunds |
| Disputes, `/v1/customer/disputes` | Ask your shop |
| Log in with PayPal, OpenID Connect | Seller sign-in |

| AI | Used for |
|---|---|
| Claude Haiku 5.5 (`claude-haiku-5-5`) via `@anthropic-ai/sdk`, structured output with zod | Reading product photos, reading courier slips, writing descriptions, and Ask your shop with tool use |

Every PayPal step was checked against the sandbox before the app was built. The results and redacted raw responses are in `shipsafe-prereq/REPORT.md` and `shipsafe-prereq/evidence/`.

## Stack

- **Frontend:** a Vite, React 19 and TypeScript PWA with Tailwind v4, shadcn/ui, TanStack Query and AG Grid.
- **Backend:** a Cloudflare Worker with Hono, D1 for listings, orders, buyer links and sessions, and R2 for photos.
- **Deploys:** Cloudflare Workers Builds deploys the app and the preview on every push to `master`, after applying D1 migrations. GitHub Actions runs type-checks, lint and both builds on every push and pull request, see `.github/workflows/checks.yml`.

## Run it yourself

You need Node 22, a Cloudflare account, a PayPal developer sandbox app with Payment Links and Log in with PayPal turned on, and an Anthropic API key.

```bash
cd app
npm ci

# Sample-data preview, no accounts needed
VITE_MOCK=1 npm run dev

# Full app
npx wrangler d1 create shipsafe        # put the id in wrangler.jsonc
npx wrangler r2 bucket create shipsafe-photos
npx wrangler d1 migrations apply shipsafe --remote
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put PAYPAL_WEBHOOK_ID   # webhook pointing at https://<your worker>/webhooks/paypal
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put SESSION_SECRET      # any long random string
npm run build && npx wrangler deploy
```

In the PayPal app:
- Add `https://<your worker>/auth/paypal/callback` as the Log in with PayPal return URL.
- Subscribe the webhook to `CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED` and `PAYMENT.CAPTURE.REFUNDED`.
- Remove `LOGIN_REDIRECT_URI` from `wrangler.jsonc` unless you also need a forwarding hop.

End-to-end check against the sandbox: `node app/e2e/flow.mjs <app url> login sell pay ship`. It reads sandbox logins from `shipsafe-prereq/.env`.

## Limits worth knowing

- **Everything runs in the PayPal sandbox.**
- **Payment links can't be single-use.** ShipSafe deletes them when they should close.
- **PayPal's checkout page has no photo field,** so photos show in ShipSafe and in the chat message.
- **Sandbox Log in with PayPal returns no verification field,** so the app says "PayPal connected", not "verified".

## Team

ShipSafe was built by:

- Mrutyunjay Patil ([Mrutyunjay-Patil](https://github.com/Mrutyunjay-Patil))
- Justin ([justingeorge912](https://github.com/justingeorge912))

## License

MIT. See `LICENSE`.
