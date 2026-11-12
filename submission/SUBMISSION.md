# ShipSafe: PayPal AI Hackathon submission

Hackathon: PayPal AI Hackathon, https://paypalaihackathon.devpost.com/. The deadline is Nov 12, 2026, 12:00 PM Pacific Time, which is Nov 13, 1:30 AM IST.

## 1. Requirements checklist

| Rule | Status |
|---|---|
| Meaningfully uses PayPal, in the free sandbox | Done. Six PayPal products, listed in section 4. |
| Meaningfully uses AI | Done. Claude reads product photos and courier slips, writes descriptions, and answers shop questions with tools. |
| Working prototype judges can run or use | Done. Live app and a no-login preview, links below. |
| Text description of features and functionality | Done. Paste section 3 into Devpost. |
| Name the AI tools and explain how they're used | Done. Section 4. |
| Public repo with source, assets and run instructions | **To do: make the repo public.** The README has the run instructions. |
| Open source license visible in the repo's About box | `LICENSE` (MIT) is added. GitHub shows it once the repo is public and `master` is the default branch. |
| Demo video under 3 minutes, public on YouTube, no unlicensed music | Done: https://youtu.be/gIJYRgauNBs. Check that it's under 3:00 and has no unlicensed music. |
| Login details for judges, if the site is private | **To do.** Put the sandbox seller and buyer logins in the Devpost testing instructions field, using the template in section 5. |
| Available free to judges until judging ends on Dec 15, 2026 | Keep both Workers running, and don't rotate the sandbox app's keys until after Dec 15. |
| A new project, or one significantly updated during the submission period | New. All of it was built during the submission period. |

## 2. Links for the form

- **Live app, PayPal sandbox:** https://mrutyunjaypatil.dev/shipsafe
- **Preview with sample data:** https://shipsafe-preview.patilmrutyunjay2.workers.dev
- **Repository:** https://github.com/Mrutyunjay-Patil/shipsafe
- **Video:** https://youtu.be/gIJYRgauNBs
- **Built with:** paypal-payment-links, paypal-orders-v2, paypal-webhooks, log-in-with-paypal, claude, anthropic, cloudflare-workers, hono, cloudflare-d1, cloudflare-r2, react, typescript, vite, tailwindcss, shadcn-ui, ag-grid, tanstack-query

## 3. Text for the Devpost description

**Title:** ShipSafe

**Tagline:** Snap your product to get a PayPal payment link. Snap your courier slip to keep the money.

### Inspiration

Priya sells hand-block-printed scarves from Jaipur to buyers abroad. She has no Shopify store and no developer, just a phone, Instagram, WhatsApp and the local post office. A buyer asks "is the blue one available, how do I pay?", and today a PayPal link answers that. Getting paid is the easy part now. **Keeping the money is not.**

PayPal's Seller Protection for an Item Not Received claim asks for proof of delivery, including "an online and verifiable tracking number", the delivered status and a recipient address that matches the transaction. PayPal's Add Tracking API overview says that for tangible goods on hold, "the fastest way that you can access these funds is to send PayPal the tracking number". Store platforms such as Shopify and WooCommerce sync tracking to PayPal for their merchants. A seller who works out of chats has nothing doing that. They're at a post office counter, and typing a 13-character tracking number into the right PayPal order by hand isn't going to happen.

There are a lot of these sellers. Statista estimates worldwide social commerce at about $586 billion in 2026. Bain and Flipkart's *How India Shops Online 2026* found that the number of online sellers in India tripled, with growth led by smaller towns. ShipSafe turns the step they skip into a photo.

This is human-to-human social selling. There are no shopping agents and no agent checkout. The AI drafts and reads, code decides, and the seller approves every change.

### What it does

ShipSafe turns a chat sale into a protected PayPal sale in four steps:

1. **Photo to listing.** The seller photographs the product. Claude drafts the title, description, colours, category, price and details. The seller checks it, can add up to six photos, and taps "Make the PayPal link".
2. **Link to chat.** ShipSafe creates a PayPal payment link with colour options. Copy and Send give the seller a ready-made message with the link to paste into the chat.
3. **Buyer pays on PayPal.** A signed PayPal webhook brings the order into ShipSafe with the buyer's colour choice and shipping address.
4. **Slip to tracking.** The seller photographs the courier slip. Claude reads the carrier and tracking number, then code checks them before anything reaches PayPal:
   - the UPU S10 check digit;
   - that the city, postcode and country match PayPal's shipping address;
   - that the number isn't on another order.

   ShipSafe then adds the tracking to the PayPal order and asks PayPal to notify the buyer. The order shows the "Shipped safe" stamp, with PayPal's own seller protection status.

Around that loop:

- **Links for one buyer.** A personal link with a special price or a fixed colour. It closes after one payment and the order shows who paid.
- **Live link editing.** Price, colours, stock, details and photos can change, and the PayPal link updates in place. When the last unit sells, every link for that product closes. Raising stock makes a fresh link.
- **Oversell protection.** If two buyers pay for the last unit, the extra order is flagged for a one-tap refund.
- **Ask your shop.** Claude answers questions such as "which paid orders aren't protected yet?" in Markdown with tables, and can act: it proposes refunds, price and stock changes, buyer links or closing a link, and each runs only when the seller taps Confirm. Its tools are bound to the signed-in seller, so it only ever sees that seller's sales. It reads the shop's orders and PayPal's order and dispute data.
- **A desktop order board** built with AG Grid, and a dashboard with sales, a protection meter and a setup checklist.

### How we built it

Before writing the app, every PayPal step was proven against the sandbox with small probe scripts. That covers 17 checks, recorded with redacted evidence in `shipsafe-prereq/REPORT.md`. The most important question was whether a Payment Links sale gives an Orders v2 order ID we can attach tracking to. It does, through the capture's `supplementary_data.related_ids.order_id`. That shaped the whole design.

The app is a mobile-first PWA built with Vite, React and TypeScript, with Tailwind, shadcn/ui and AG Grid. It's served by a single Cloudflare Worker running Hono, with D1 for data and R2 for photos. The Worker talks to PayPal's REST APIs directly:
- Payment Links and Buttons: create, PUT, delete;
- Orders v2 and `/track`;
- captures and refunds;
- disputes;
- webhook signature verification;
- Log in with PayPal.

Claude Haiku 5.5 handles vision and text through Anthropic's SDK, with structured JSON output validated by zod. Cloudflare Workers Builds deploys on every merge to `master`, and GitHub Actions runs the checks.

### Challenges we ran into

- **Payment links are never single-use.** `reusable: "SINGLE"` returns `SINGLE_REUSABLE_NOT_SUPPORTED`, and links have no stock limit. ShipSafe tracks stock itself and deletes links through the API at the right moment. It deletes a buyer link after its one payment, and every link when the product sells out. It flags anyone who pays in the gap for a refund.
- **Truncated descriptions.** An early version stored only 140 characters, cut mid-word, and product details never reached PayPal's page. Now descriptions can use PayPal's full 2,048 characters, are cut only at a sentence end, and list details one per line.
- **No photos on PayPal's checkout.** The payment links schema has no image field. Photos live in ShipSafe and travel with the chat message.
- **Slips are untrusted input.** A test slip carried a printed prompt injection. Claude reads the slip into a fixed schema, and code, not the model, decides whether the tracking is valid.
- **Sandbox Log in with PayPal returns no verification field,** so ShipSafe says "PayPal connected", never "verified".

### Accomplishments that we're proud of

- **The full loop runs end to end on the live sandbox:** sign in, photo, AI listing, link, buyer pays, webhook, slip scan, tracking on PayPal, protected.
- **Buyer links were tested with a real sandbox payment.** The $20 special-price, Black-only link was paid, the order recorded the buyer's name, and PayPal returned 404 for the link afterwards.
- **The seller never types a tracking number.**

### What we learned

- PayPal's Orders v2 tracking is the bridge between a chat sale and Seller Protection, and Payment Links sales reach it cleanly.
- AI is most useful at the edges, reading messy photos. Every decision that matters, such as check digits, address matching and duplicates, is safer in plain code.

### What's next for ShipSafe

- A public product page with the photos and a Pay with PayPal button, to share instead of a bare link.
- Carriers beyond India Post, and courier pickup booking.
- Disputes in the app: when a buyer opens one, ShipSafe prepares the tracking evidence.
- Moving from the sandbox to live PayPal accounts.
- Listings in Hindi and Tamil, for sellers who write to buyers in their own language.

### Honest limits

- Everything runs in the PayPal sandbox. The sandbox doesn't show held funds being released or a parcel being delivered, so the demo shows what is real: the tracker added to the PayPal order and read back, and PayPal's own seller protection status for each order.
- ShipSafe doesn't promise protection. It gives the sale the delivery evidence PayPal's Seller Protection policy asks for.

### Sources for the facts above

- PayPal Seller Protection policy: https://www.paypal.com/us/legalhub/paypal/seller-protection
- PayPal Add Tracking API overview: https://developer.paypal.com/docs/tracking/tracking-api/
- PayPal Payment Links and Buttons API: https://developer.paypal.com/api/payment-links-buttons
- Statista, social commerce market size, worldwide, chart updated May 2026.
- Bain & Company and Flipkart, *How India Shops Online 2026*, published April 8, 2026.

## 4. Tools and how they're used

**PayPal developer platform, sandbox**
- **Payment Links and Buttons API:** create links with colour variants, update them in place with PUT, delete them when stock runs out or a buyer link is used.
- **Webhooks:** `CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED` creates orders and `PAYMENT.CAPTURE.REFUNDED` marks refunds. Every event's signature is verified, and repeat deliveries are ignored.
- **Orders v2:** the buyer's colour choice and shipping address. `/track` adds tracking with `notify_payer`, and a tracker PATCH cancels it.
- **Payments v2:** capture details, including seller protection status, and refunds.
- **Disputes API:** read by Ask your shop, filtered to the seller's own captures.
- **Log in with PayPal:** seller sign-in with OpenID Connect.

**AI: Claude Haiku 5.5 (`claude-haiku-5-5`) through the Anthropic SDK**
- **Product photo to listing draft:** title, description, colourways, category, price, visible details and suggested detail names, as strict JSON.
- **Courier slip to carrier and tracking number,** as strict JSON. The slip is treated as untrusted text.
- **Description rewrite** from the seller's own details, adding no claims it wasn't given.
- **Ask your shop:** tool use. The read tools are `shop_summary`, `list_orders`, `list_listings`, `list_buyer_links`, `get_paypal_order` against PayPal Orders v2, and `list_disputes`. The `propose_` tools cover refunds, listing updates, buyer links and closing links. Proposals are validated against the seller's data and run only after the seller confirms in the app.

**Sponsor tool:** AG Grid powers the desktop order board. That makes the project eligible for the AG Grid sponsor prize.

## 5. Testing instructions template for the Devpost form

Fill the angle-bracket parts from `shipsafe-prereq/.env`. Keep the logins out of the repository.

```
Live app (PayPal sandbox): https://mrutyunjaypatil.dev/shipsafe
1. Tap "Continue with PayPal" and sign in with the sandbox seller:
   <SANDBOX_SELLER_EMAIL> / <SANDBOX_SELLER_PASSWORD>
2. Tap + to list a product. Use any photo; sample photos are in the repo under submission/demo-assets/test-products/.
3. Copy the payment link, open it in a private window, and pay with the sandbox buyer:
   <SANDBOX_BUYER_EMAIL> / <SANDBOX_BUYER_PASSWORD>
4. Back in ShipSafe, open Orders; the order arrives within a minute. Open it, tap
   "Scan the courier slip" and use a slip from submission/demo-assets/test-slips/ (addressed to the
   sandbox buyer). Each tracking number can be sent once.

No-login preview with sample data: https://shipsafe-preview.patilmrutyunjay2.workers.dev
```

## 6. Prizes to select on the form

- **Main prizes and honorable mentions:** Most Impactful and Best Use of PayPal + AI fit best.
- **Best Use of Agentic Commerce:** your research suggests skipping this one, because your team entry is in that lane. ShipSafe's Ask can act, but only after the seller taps Confirm, and it never shops for anyone.
- **Sponsor prize:** Best Use of AG Grid. The desktop order board is built with AG Grid.
- **Limit:** a project can win at most one main prize or honorable mention, plus one sponsor prize.

## 7. Where each judging criterion is answered

The five criteria are weighted equally.

- **Technological implementation:**
  - six PayPal APIs, each proven in the sandbox before use;
  - webhook signature checks and idempotent handling;
  - link lifecycle management that makes up for links not being single-use;
  - AI with strict schemas, and code-side validation of AI output.
- **Design:** a complete product rather than a proof of concept:
  - sign-in;
  - dashboard;
  - selling;
  - product editing with guards against unsaved changes;
  - buyer links;
  - orders board;
  - order journey;
  - ask;
  - account.

  It's built phone-first, with a desktop layout and a consistent visual language.
- **Potential impact:** a specific audience, chat-based sellers, with a specific failure, no tracking on the PayPal order. The fix is a photo that fits how they already work.
- **Innovation:** the slip scan, where a photo becomes a validated tracker on the exact PayPal order. Buyer links add personal pricing that closes itself after one payment.
- **Presentation:** the video follows the brief in `submission/VIDEO_BRIEF.md`. It shows the full loop on the live sandbox in under 3 minutes.
