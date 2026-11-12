# ShipSafe explainer video: recording brief

This brief is for the session that records and edits the demo. The video must be under 3 minutes. Everything below runs on the live site against the PayPal sandbox, so no step needs to be faked.

## What ShipSafe is, in one line

A seller who sells through Instagram or WhatsApp photographs a product, AI drafts the listing, ShipSafe makes a PayPal payment link to paste into the chat, and once the buyer pays, a photo of the courier slip becomes validated tracking on the PayPal order. That tracking is the delivery evidence PayPal Seller Protection relies on.

The story to tell: **from a product photo to a protected PayPal sale, without leaving the phone.**

## Sites and accounts

| What | Where |
|---|---|
| Live app, real PayPal sandbox | https://mrutyunjaypatil.dev/shipsafe |
| Sample-data preview, no login | https://shipsafe-preview.patilmrutyunjay2.workers.dev |
| Buyer checkout | PayPal sandbox pages opened from a link, `www.sandbox.paypal.com/ncp/payment/PLB-…` |

- **Seller login:** the sandbox Business account. Its email and password are in `shipsafe-prereq/.env` as `SANDBOX_SELLER_EMAIL` and `SANDBOX_SELLER_PASSWORD`. That file is gitignored, so ask the owner for these. Never write them into a file you commit, and never show them on screen.
- **Buyer login:** the sandbox Personal account, `SANDBOX_BUYER_EMAIL` and `SANDBOX_BUYER_PASSWORD` in the same file. Its shipping address is San Jose, CA 95131, US.
- PayPal's sign-in page can show a cookie banner (`#acceptAllButton`) and an "Agree and Continue" consent screen. `app/e2e/flow.mjs` shows how to click through both with Playwright.

## Assets in this repo

- Product photos: `test-products/<product>/`. The `*_all-colours_*` photo is the listing photo, and the per-colour photos are extras for the gallery.
- Courier slips, all addressed to the sandbox buyer in San Jose, with new tracking numbers that pass the UPU S10 check digit:
  - `submission/demo-assets/slip-1-san-jose-EE612048571IN.png`
  - `submission/demo-assets/slip-2-san-jose-EE733150687IN.png`
  - `submission/demo-assets/slip-3-san-jose-EE844261797IN.png`
  - Use one per take. A number already sent to PayPal is flagged as a duplicate on the next scan.
- `submission/demo-assets/slip-wrong-address-berlin-EE955372805IN.png` is addressed to Berlin. Use it to show the address check catching a wrong slip.
- `app/e2e/slip.png` holds a number that was already used. Scanning it shows the duplicate warning.
- Regenerate slips with `python shipsafe-prereq/probes/make_demo_slips.py` after changing the serial numbers in it.

## Recording setup

- Record the seller screens at phone size, 390 × 844, with `deviceScaleFactor: 2`. ShipSafe is phone-first.
- Show the Orders board and the dashboard once at desktop size, 1440 × 900, to show the AG Grid board and the side navigation.
- Record the buyer's PayPal checkout in a separate, signed-out browser context, so it reads as a different person.
- On the Sell and slip screens, the file inputs are `input[type=file]:not([capture]):not([multiple])` for the main photo and `input[type=file][multiple]` for extra photos. The camera input has `capture`.
- AI steps take 2 to 4 seconds and PayPal pages take 3 to 8. Cut the waits in editing, but keep one loading state on screen so viewers see it's real.
- Webhook arrival: after the buyer pays, the order usually appears in the seller's Orders list within 10 to 40 seconds. Reload Orders, or wait on it.

## The scene list (target 2:50)

Times are targets for the edited cut. Captions in quotes are suggested on-screen text or voice-over.

### 1. The problem, 0:00 to 0:12

- Landing page at desktop size, scrolled slowly from the hero to "From a photo to a protected sale in four steps".
- Voice-over: "Millions of people sell through Instagram and WhatsApp. They take PayPal, but when a buyer says it never arrived, they have no proof. ShipSafe fixes that."

### 2. Sign in with PayPal, 0:12 to 0:22

- Tap "Continue with PayPal". The PayPal sandbox login opens, the seller signs in, and the app lands on the dashboard.
- Caption: "Sellers sign in with Log in with PayPal. No new password."

### 3. Photo to listing with AI, 0:22 to 0:55

1. Tap the "+" button, which opens Sell.
2. Choose `test-products/05-cotton-kurta/kurta_all-colours_studio.jpg`, or another product not yet listed today.
3. Show "Writing your listing". Claude drafts the title, description, colours, category, price and details.
4. Under "More photos", add two per-colour photos. Tap the star on one to show it can become the cover.
5. Under "Product details", tap a suggested chip such as Material or Size, type a value, then tap "Rewrite description from details".
6. Tap "Make the PayPal link".
7. "Your link is ready to send" appears with the message preview: title, price, the colours, "You pay securely on PayPal. Pay here:" and the link.
8. Tap "Copy".

- Caption: "Claude reads the photo and writes the listing. ShipSafe creates a PayPal payment link through the Payment Links API."

### 4. The buyer pays on PayPal, 0:55 to 1:20

1. Switch to the buyer's browser context. Open the link.
2. PayPal's hosted page shows the title, price, description and details, with a Colour dropdown.
3. Pick a colour, tap the PayPal button, sign in as the buyer and tap "Complete Purchase".
4. The buyer lands on ShipSafe's "Thanks, your payment went through" page.

- Caption: "The buyer pays on PayPal's own page. ShipSafe never sees card details."

### 5. The order arrives by webhook, 1:20 to 1:32

- Back on the seller's phone, open Orders. The new order slides in like a letter arriving, with the buyer's city, the chosen colour and a "To post" badge.
- Caption: "A PayPal webhook brings in the order and the buyer's shipping address. The signature is verified first."

### 6. Ship it: scan the courier slip, 1:32 to 2:05

1. Open the order. Show the journey, the shipping address with a copy button, and the PayPal details.
2. Tap "Scan the courier slip" and choose `slip-1-san-jose-EE612048571IN.png`.
3. "Check before PayPal sees it" shows each check:
   - tracking number read;
   - UPU S10 check digit valid;
   - city, postcode and country match the PayPal address;
   - not used on another order.
4. Tap "Send tracking to PayPal".
5. The order turns into the SHIPPED SAFE stamp, "Protected by PayPal".

- Caption: "Claude reads the slip. Code checks the check digit, the address and duplicates. ShipSafe adds the tracking to the PayPal order, PayPal emails the buyer, and the sale is backed by Seller Protection."
- Optional 5-second extra: scan `slip-wrong-address-berlin-…png` on another paid order to show the address check failing.

### 7. One buyer, one link, 2:05 to 2:25

1. Open Products, then a product such as the scarf. Show the photo gallery with thumbnails.
2. Under "Links for one buyer", tap "New".
3. Type "Priya, WhatsApp". Lower the price to show "$4.00 off the usual". Pick one colour. Choose 7 days.
4. Tap "Make the link". Show the personal message: "Hi Priya, here's your link… That's the special price for you. It's just for you and works for one payment."

- Caption: "Each buyer can get their own link, with a special price or a set colour. It closes after one payment, and the order shows who paid."

### 8. Edit safely, 2:25 to 2:35

- On a product, tap "Edit product". Change the price and add a photo, then tap Save. The toast says "Saved. Buyers see the changes on the PayPal link."
- Caption: "Edits update the live PayPal link in place. Same link, new details."

### 9. Ask your shop, 2:35 to 2:45

- Open Ask and tap or type "Which paid orders aren't protected yet?". Claude answers from the shop's orders and PayPal data.
- Caption: "Ask your shop answers from real orders and PayPal data, read-only."

### 10. Close, 2:45 to 2:55

- Desktop view: the dashboard with the sales chart and protection meter, then the Orders board in AG Grid.
- End card: "ShipSafe. From a photo to a protected PayPal sale." Show the live URL.

## Things not to claim

- Don't say "verified seller". Sandbox Log in with PayPal returns no verification field, so the app says "PayPal connected".
- Don't say the photo shows on PayPal's checkout. PayPal's payment links have no image field. Photos show in ShipSafe and in the chat message preview.
- Don't promise Seller Protection for every sale. Say the tracking gives the sale the delivery evidence PayPal's Seller Protection relies on, and that the app shows PayPal's own eligibility for each order.
- Everything runs in the PayPal sandbox. Say so once, for example in the end card: "Built and demoed on the PayPal sandbox."

## If something fails while recording

- **PayPal says "invalid client_id or redirect_uri" at sign-in:** retry after a minute. The app's return URL goes through a forwarding Worker because of PayPal's propagation lag.
- **No order appears after paying:** wait 60 seconds and reload Orders. Webhooks retry.
- **Slip checks show a duplicate:** that tracking number was used before. Take the next slip file.
- **"This product is not on sale" when making a buyer link:** that product is sold out. Use another, or raise its stock in Edit product.
