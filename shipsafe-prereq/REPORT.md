# ShipSafe prerequisite check

Run on 2026-11-12 against the PayPal sandbox only. Every raw request and response is in `evidence/`, with buyer names, emails and street lines redacted.

## 1. Verdict

GO with the Payment Links architecture. Keep Orders v2 per buyer as a tested fallback.

## 2. Results

| ID | Check | Result | Time | Evidence | File |
|---|---|---|---|---|---|
| C1 | Developer and sandbox accounts | PASS | 25 min | Seller is a Business account that holds USD. The first buyer was registered in India and could not pay. A US Personal buyer was created and works. | `evidence/c01-1.json` |
| C2 | OAuth token | PASS | 2 min | 200, `expires_in` 32400, 29 scopes including `checkout/payment-resources`, `applications/webhooks` and disputes. No scope mentions tracking, and tracking works anyway. | `evidence/c02-1.json` |
| C3 | Payment Links CRUD | PASS | 6 min | Create 201, get 200, list 200, put 204 to 26.00, delete 204, then get 404. Shipping collection and the Colour variant were accepted. | `evidence/c03-summary.json` |
| C4 | Webhook listener | PASS | 8 min | Cloudflare quick tunnels can't connect from the cloud container because port 7844 is closed. A Cloudflare Worker relay got simulated events in under 3 s. | `evidence/c04-*.json` |
| C5 | Signature verification | PASS | 4 min | Simulated and real events both return `SUCCESS`. A tampered amount or a wrong webhook ID returns `FAILURE`. | `evidence/c05-summary.json`, `evidence/c05-negative.json` |
| C6 | Payment Link paid, mapped to order and capture | PASS | 30 min | Webhook carries `payment_resource_id`, `transaction_id`, which is the capture ID, the shipping address and the payer. The capture links to order `0AY2418885929025Y`. The order holds the variant Rust. | `evidence/webhook-*PAYMENT-RESOURCE*.json`, `evidence/c06-*.json` |
| C7 | Add tracking, notify buyer | PARTIAL | 5 min | Tracker created with 201 and read back as `SHIPPED`. The buyer tracking email and buyer view are unconfirmed, because the sandbox Activity page renders blank in headless Chromium. | `evidence/c07-*.json` |
| C8 | Fix a wrong tracking number | PASS | 3 min | Cancel 204. Second patch 422 `CANNOT_PATCH_CANCELLED_TRACKER`. New number 201. Same number again 200 and no new tracker. | `evidence/c08-summary.json` |
| C9 | Orders v2 fallback | PASS | 4 min | Create, approve, capture 201 and track 201 all work. `custom_id` reaches the capture. The legacy `trackers-batch` returns 403. | `evidence/c09-*.json` |
| C10 | Refund | PASS | 1 min | Refunded the duplicate Payment Link sale. Status `COMPLETED` at once. | `evidence/c10-1.json` |
| C11 | Disputes read | PASS | 1 min | 200 with an empty list. | `evidence/c11-1.json` |
| C12 | PayPal MCP server | PARTIAL | 8 min | `@paypal/mcp` 1.8.1 starts in sandbox with 28 tools. `get_order` and `list_disputes` work. `list_transactions` and `get_shipment_tracking` return 403. | `evidence/mcp-tools.json`, `evidence/c12-calls.json` |
| C13 | Vision extraction | PASS, slips only | 6 min | `claude-haiku-5-5`, 4 of 4 tracking numbers exact. The injection slip returned only schema fields. The product photo step was not run, because no photo was supplied. | `evidence/c13-slips.json` |
| C14 | Validators | PASS | 3 min | 10 of 10 cases, including the three given and seven more. | `evidence/c14-validators.json` |
| C15 | Render hosting | SKIPPED | 0 min | No Render key. The Cloudflare Worker covers webhook delivery for development. | none |
| C16 | AG Grid build | PASS | 3 min | `npm run build` succeeds with a status cell renderer. | `evidence/c16-build.log` |

## 3. Facts we now know

Webhooks for a Payment Link sale:
- A Payment Link sale fires exactly one event: `CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED`, with `resource_type` `payment-resource`. That event is missing from PayPal's published event list at https://developer.paypal.com/api/rest/webhooks/event-names.md.
- No `PAYMENT.CAPTURE.COMPLETED` and no `CHECKOUT.ORDER.*` arrived for the two link sales. The Orders v2 path does send `CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED`. Subscribing with `*` catches both paths.
- It took about 15 s from paying to delivery.

Where each field comes from:
- The listing reference is in the webhook as `resource.payment_resource_id`, for example `PLB-5PGXCE53JB4F`. The order also has it in `items[].item_id`, and the link's `product_id` comes back as `items[].sku`.
- The capture ID is the webhook's `resource.transaction_id`. `GET /v2/payments/captures/{id}` returns `status` `COMPLETED` and `seller_protection.status` `ELIGIBLE`.
- The order ID is in the capture's `supplementary_data.related_ids.order_id`, and in its `links[]` with `rel: "up"`.
- The shipping address is in the webhook's `resource.shipping.address` and in the order's `purchase_units[0].shipping.address`.
- The chosen variant is only on the order, in `items[].item_option_selections[].select`. The webhook leaves it out.
- The payer ID and country are in the webhook's `resource.payer`. The order adds `account_status` `VERIFIED`.

Payment Links:
- The URL is only in `links[]` with `rel: "payment_link"`, in the form `https://www.sandbox.paypal.com/ncp/payment/PLB-XXXXXXXXXXXX`. The top-level `payment_link` field in the spec at https://developer.paypal.com/api/payment-links-buttons/v1/schema.json never appeared.
- Single-use links don't exist. `reusable: "SINGLE"` gives 422 `SINGLE_REUSABLE_NOT_SUPPORTED`. The FAQ at https://developer.paypal.com/payment-links-buttons/faq.md agrees.
- No inventory field exists. `adjustable_quantity.maximum: 1` is accepted. A link never deactivates by itself after a sale, so ShipSafe has to delete it on the first webhook.
- PUT changes the price and keeps the same URL.
- `POST` needs a `PayPal-Request-Id` header.

Tracking:
- India Post is `INDIA_POST_INT` for international mail and `INDIA_POST` for domestic. `IN_INDIAPOST` doesn't exist. Source: https://developer.paypal.com/track-orders/carriers.
- The tracker ID is `{capture_id}-{tracking_number}`, for example `0B495248659291430-EE482913507IN`.
- Cancelling is a PATCH that sets `/status` to `CANCELLED`. A cancelled tracker can't be patched again, and stays on the order with status `CANCELLED`.
- Adding the same number again returns 200 and creates nothing.
- Whether the buyer got a tracking email is unknown. The sandbox sends no real emails. Check it on the buyer account's Notifications page in the developer dashboard.

MCP server:
- The package is `@paypal/mcp@1.8.1`. The library behind it is `@paypal/agent-toolkit`, version 1.11.0.
- The useful tools are `get_order`, `list_disputes`, `get_dispute`, `create_shipment_tracking`, `get_shipment_tracking`, `list_transactions` and `create_refund`. It has no payment link tools.
- `list_transactions` and `get_shipment_tracking` return 403 with this app.

Vision:
- The model is `claude-haiku-5-5`, with low effort and structured JSON output.
- Each call took 1.1 to 4.3 s and used about 1,800 input and 67 output tokens.
- Accuracy on the synthetic slips was 4 of 4, including the rotated and blurred ones.

Market:
- PayPal refused an India-to-India payment with `UNSUPPORTED_PAYEE_CURRENCY`. ShipSafe's Indian sellers can only take PayPal payments from buyers outside India. The demo buyer has to be a foreign account.

## 4. Blockers and workarounds

| Check | Problem | Workaround |
|---|---|---|
| C4 | Cloudflare quick tunnels need outbound port 7844, which the cloud container blocks. | The Worker `shipsafe-webhook-probe` on Cloudflare stores deliveries in KV. On a laptop, the quick tunnel or ngrok would work. |
| C7 | Buyer email and buyer view unconfirmed. | A manual check, listed in section 7. The tracker itself is confirmed by the API. |
| C12 | `list_transactions` and `get_shipment_tracking` return 403. | Turn on Transaction Search in the app's settings and re-test. Otherwise, back "Ask your shop" with a small set of read-only tools that call `GET /v2/checkout/orders/{id}` and read the trackers, which work. |
| C13 | Product photo step not run. | Run `python probes/vision_probe.py product <photo>` once a photo is available. |
| C15 | No Render key. | Deploy later. The Worker relay covers the hackathon demo. |
| Links | No single-use or inventory limit. | Delete the link via API on the first `PAYMENT-RESOURCE.PAYMENT-COMPLETED`. If a second buyer pays in the gap, refund them, as tested in C10. |

## 5. Recommended architecture

1. Each listing gets its own Payment Link with `product_id` set to the listing ID and shipping collection on. ShipSafe stores the `PLB-` ID.
2. A single webhook endpoint verifies each signature, then handles `CHECKOUT.PAYMENT-RESOURCE.PAYMENT-COMPLETED`. It maps `payment_resource_id` to the listing and `transaction_id` to the capture.
3. ShipSafe calls `GET /v2/payments/captures/{id}` to get the order ID and seller protection status, then `GET /v2/checkout/orders/{id}` to get the variant and address.
4. For the last item in stock, ShipSafe deletes the link on the first sale and refunds any second payment.
5. The courier slip goes through Haiku vision, the S10 check, the address match and the duplicate check. Then `POST /track` with `INDIA_POST_INT` and `notify_payer: true`. A wrong number is fixed by cancelling and re-adding.

## 6. Manual steps done

1. Created a sandbox app with Payment Links & Buttons enabled, and shared the client ID and secret. These are in the gitignored `.env`.
2. Shared logins for the sandbox seller and the India buyer. The India buyer couldn't pay.
3. Created a US Personal sandbox buyer under Testing Tools > Sandbox Accounts > Create account, and shared its login.
4. Shared an Anthropic API key for C13.
5. Everything else ran automatically: the Worker deploy, the webhook registration, both buyer payments through headless Playwright, tracking, refund and MCP.

## 7. Open questions

- Does the buyer get a tracking email? Check the US buyer under Testing Tools > Sandbox Accounts > Notifications.
- Does tracking show on the buyer's transaction page? Log in to sandbox.paypal.com as the US buyer and open the $26.00 scarf payment.
- Does a `PAYMENT.CAPTURE.REFUNDED` event arrive for refunds of Payment Link sales? None had arrived when this report was written.
- Do any later events fire for a link sale, such as `PAYMENT.CAPTURE.COMPLETED` delivered late? Re-run `python probes/pull_webhooks.py`.
- Does turning on Transaction Search fix the MCP `list_transactions` 403?
- How does vision do on a real product photo and a real slip photo?

## How to re-run

```
cd shipsafe-prereq
python probes/c02_token.py
python probes/c03_links.py
python probes/c04_webhook_setup.py register <public url>/webhooks/paypal
node probes/buyer_pay.js <payment link url> Rust
python probes/pull_webhooks.py
python probes/orders_probe.py inspect <order_id> <capture_id>
python probes/orders_probe.py track <order_id> <capture_id> EE482913507IN
python probes/vision_probe.py slips
python probes/validators.py
```
