"""C3. Payment Links and Buttons API: create, read, list, replace, delete.

Spec: https://developer.paypal.com/api/payment-links-buttons/v1/schema.json
Guide: https://developer.paypal.com/api/payment-links-buttons.md
"""
import json
import uuid

from common import call, save_evidence, set_env


def link_body(price="24.00", reusable="MULTIPLE"):
    body = {
        "integration_mode": "LINK",
        "type": "BUY_NOW",
        "return_url": "https://example.com/thanks",
        "line_items": [{
            "name": "Hand block-printed cotton scarf",
            "product_id": "listing_demo_001",
            "description": "Cotton, hand block-printed in Jaipur",
            "unit_amount": {"currency_code": "USD", "value": price},
            "collect_shipping_address": True,
            "variants": {"dimensions": [{
                "name": "Colour", "primary": True,
                "options": [{"label": "Indigo"}, {"label": "Rust"}],
            }]},
        }],
    }
    if reusable:
        body["reusable"] = reusable
    return body


def create(body):
    return call("c03", "POST", "/v1/checkout/payment-resources", body,
                headers={"PayPal-Request-Id": str(uuid.uuid4())})


def url_of(res):
    top = res.get("payment_link")
    rel = next((l["href"] for l in res.get("links", []) if l.get("rel") == "payment_link"), None)
    return top, rel


out = {}
r = create(link_body())
out["create_multiple"] = r.status_code
if r.status_code >= 300:
    print(json.dumps(r.json(), indent=2)[:2000])
    raise SystemExit(1)
res = r.json()
lid = res["id"]
top, rel = url_of(res)
out.update(id=lid, status=res.get("status"), url_top_level=top, url_links_rel=rel,
           response_keys=sorted(res.keys()))
set_env("PAYPAL_PAYMENT_LINK_ID", lid)
set_env("PAYPAL_PAYMENT_LINK_URL", top or rel or "")
print("created", lid, res.get("status"), "url:", top or rel)

for single in ("SINGLE", "ONCE", "SINGLE_USE"):
    rs = create(link_body(reusable=single))
    out[f"create_reusable_{single}"] = {"status": rs.status_code,
                                        "issue": (rs.json().get("details") or [{}])[0].get("issue") if rs.status_code >= 400 else None}
    if rs.status_code < 300:
        call("c03", "DELETE", f"/v1/checkout/payment-resources/{rs.json()['id']}")

g = call("c03", "GET", f"/v1/checkout/payment-resources/{lid}")
gj = g.json()
li = (gj.get("line_items") or [{}])[0]
out["get"] = g.status_code
out["shipping_collection_kept"] = li.get("collect_shipping_address")
out["variants_kept"] = li.get("variants")
lst = call("c03", "GET", "/v1/checkout/payment-resources", params={"page_size": 10, "total_required": "true"})
out["list"] = {"status": lst.status_code, "keys": sorted(lst.json().keys()) if lst.status_code == 200 else None}

p = call("c03", "PUT", f"/v1/checkout/payment-resources/{lid}", link_body(price="26.00"))
out["put"] = p.status_code
if p.status_code >= 300:
    print(p.text[:1200])
g2 = call("c03", "GET", f"/v1/checkout/payment-resources/{lid}").json()
out["price_after_put"] = (g2.get("line_items") or [{}])[0].get("unit_amount")
out["url_after_put"] = url_of(g2)

t = create(link_body(price="1.00"))
tid = t.json()["id"]
d = call("c03", "DELETE", f"/v1/checkout/payment-resources/{tid}")
after = call("c03", "GET", f"/v1/checkout/payment-resources/{tid}")
out["delete"] = d.status_code
out["get_after_delete"] = {"status": after.status_code,
                           "resource_status": after.json().get("status") if after.content else None}
out["deleted_link_url"] = url_of(t.json())[0]

# Quantity cap probe: adjustable_quantity.maximum is the only limit in the spec.
q = link_body()
q["line_items"][0]["adjustable_quantity"] = {"maximum": 1}
qr = create(q)
out["adjustable_quantity_max_1"] = qr.status_code
if qr.status_code < 300:
    call("c03", "DELETE", f"/v1/checkout/payment-resources/{qr.json()['id']}")

save_evidence("c03", out, name="c03-summary.json")
print(json.dumps(out, indent=2))
