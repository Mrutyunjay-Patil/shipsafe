# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable PWA, mobile-first. The desktop order board is the one screen designed for laptops.

## Users

Small social sellers in any country who sell through Instagram DMs and WhatsApp chats instead of a web store. They run the shop alone from their phone, often between making, packing and queueing at a courier counter. They are not technical and are often tired; one clear next step per screen matters more than seeing everything.

Secondary audience for this build: PayPal AI Hackathon judges on Devpost, who watch a short demo video and click through the live app.

## Product Purpose

ShipSafe turns a chat sale into a protected PayPal sale. The seller photographs a product and AI drafts the listing; ShipSafe creates a PayPal payment link to paste into the chat. When the buyer pays, a webhook brings in the order and the buyer's PayPal shipping address. The seller photographs the courier slip; AI reads the tracking number, code checks it, and ShipSafe attaches it to the PayPal order so the buyer is emailed and the sale has the delivery evidence PayPal Seller Protection relies on.

Success: a seller goes from photo to protected sale without leaving their phone, and a judge understands that loop within 30 seconds.

## Positioning

Social sellers already take PayPal payments; what they lack is the proof trail. ShipSafe's mechanism is the slip scan: a photo of the courier receipt becomes a validated tracker on the exact PayPal order, with the check digit, the address match and duplicate use verified before anything is sent.

## Operating Context

- Listing starts from a phone camera photo of the product.
- The payment link is pasted into an existing Instagram or WhatsApp conversation.
- Buyers pay on PayPal's hosted page; ShipSafe never sees card details.
- Shipping happens at a post office or courier counter; the slip is photographed there or at home.
- Orders arrive in the background through PayPal webhooks; the seller opens the app to ship.
- A laptop order board exists for sellers who batch-ship.

## Capabilities and Constraints

- PayPal sandbox only for this build. Payment Links and Buttons API, Orders v2 tracking, refunds, disputes read, webhooks with signature verification, Log in with PayPal.
- Payment links cannot be single-use; ShipSafe deletes the link after the last unit sells and flags any buyer who paid in the gap for a one-tap refund.
- Sandbox Log in with PayPal does not return `verified_account`; the seller badge says "PayPal connected", not "verified". Buyer verification comes from the order's `account_status`.
- AI: Claude Haiku reads product photos and courier slips with strict JSON output; slip text is treated as untrusted data. "Ask your shop" answers read-only questions over orders and PayPal data.
- Stack: Cloudflare Workers with Hono, D1 and R2; Vite, React and TypeScript PWA with shadcn components.
- Must load fast on a cheap phone over a slow connection and work one-handed with large tap targets.

## Brand Commitments

- Name: ShipSafe.
- The user chose the blue gradient glass direction from their Pinterest references, with all colour and surface values kept in one swappable theme file (`src/theme.css`), and a lime and deep green alternative kept ready.
- Typeface: chosen by design, self-hosted. The user released the earlier Outfit choice.
- Light mode first, dark mode supported.
- Must not read as a crypto or banking app, must not be busy, must not look like a generic AI app (purple gradients, sparkles, glowing orbs).

## Evidence on Hand

- Sandbox verification of every PayPal step: `../shipsafe-prereq/REPORT.md` and `../shipsafe-prereq/evidence/`.
- No real customers, testimonials, sales figures or press. Demo data in preview mode is synthetic and must stay labelled as sample data.

## Product Principles

1. One next step per screen. The seller should always know what to do now.
2. Proof over promises. Show what PayPal actually confirmed, never imply protection that is not there.
3. The phone is the shop. Every core task works one-handed on a small screen.
4. Check before sending. Anything that goes to PayPal is shown and verified first.

## Accessibility & Inclusion

Non-technical users, often outdoors or under poor light: high contrast, large tap targets, plain language, no reliance on colour alone for state.
