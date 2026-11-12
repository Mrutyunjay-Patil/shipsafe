"""C6-C11 helpers: orders, captures, tracking, refunds, disputes.

  python probes/orders_probe.py inspect <order_id> [capture_id]       # C6 step 4
  python probes/orders_probe.py track <order_id> <capture_id> <num> [carrier] [check]   # C7
  python probes/orders_probe.py trackers <order_id>                   # C7 read back
  python probes/orders_probe.py fix <order_id> <capture_id> <tracker_id>  # C8
  python probes/orders_probe.py create                                # C9 step 1
  python probes/orders_probe.py capture <order_id>                    # C9 step 3
  python probes/orders_probe.py batch <capture_id> <num>              # C9 step 4 legacy
  python probes/orders_probe.py refund <capture_id>                   # C10
  python probes/orders_probe.py disputes                              # C11
"""
import json
import os
import sys

from common import call, save_evidence
from validators import s10_make, s10_valid

ITEM = {"name": "Hand block-printed cotton scarf", "quantity": "1",
        "unit_amount": {"currency_code": "USD", "value": "24.00"}, "sku": "SCARF-INDIGO"}
# Carrier enum: see https://developer.paypal.com/docs/tracking/reference/carriers/
CARRIER = os.getenv("PROBE_CARRIER", "IN_INDIAPOST")


def _pu_trackers(order: dict) -> list:
    out = []
    for pu in order.get("purchase_units", []):
        out += pu.get("shipping", {}).get("trackers", []) or []
    return out


def inspect(order_id, capture_id=None):
    o = call("c06", "GET", f"/v2/checkout/orders/{order_id}").json()
    pu = (o.get("purchase_units") or [{}])[0]
    caps = pu.get("payments", {}).get("captures", [])
    capture_id = capture_id or (caps[0]["id"] if caps else None)
    summary = {
        "order_status": o.get("status"),
        "intent": o.get("intent"),
        "custom_id": pu.get("custom_id"), "invoice_id": pu.get("invoice_id"),
        "reference_id": pu.get("reference_id"),
        "items": [{k: i.get(k) for k in ("name", "sku", "quantity", "description")} for i in pu.get("items", [])],
        "shipping_address_present": bool(pu.get("shipping", {}).get("address")),
        "shipping_city_pc_cc": {k: pu.get("shipping", {}).get("address", {}).get(k)
                                for k in ("admin_area_2", "postal_code", "country_code")},
        "capture_ids": [c["id"] for c in caps],
        "capture_status": [c.get("status") for c in caps],
    }
    if capture_id:
        c = call("c06", "GET", f"/v2/payments/captures/{capture_id}").json()
        summary["capture_get_status"] = c.get("status")
        summary["capture_custom_id"] = c.get("custom_id")
        summary["seller_protection"] = c.get("seller_protection")
    print(json.dumps(summary, indent=2))
    save_evidence("c06", summary, name=f"c06-summary-{order_id}.json")
    return summary


def track(order_id, capture_id, num, carrier=CARRIER, check="c07"):
    body = {"capture_id": capture_id, "tracking_number": num, "notify_payer": True,
            "items": [{"name": ITEM["name"], "sku": ITEM["sku"], "quantity": "1"}]}
    if carrier == "OTHER":
        body.update(carrier="OTHER", carrier_name_other="India Post")
    else:
        body["carrier"] = carrier
    r = call(check, "POST", f"/v2/checkout/orders/{order_id}/track", body)
    if r.status_code >= 400:
        print(json.dumps(r.json(), indent=2)[:1500])
    trackers = _pu_trackers(r.json()) if r.status_code < 300 else []
    for t in trackers:
        print("tracker", t.get("id"), t.get("status"))
    return r


def trackers(order_id, check="c07"):
    o = call(check, "GET", f"/v2/checkout/orders/{order_id}").json()
    ts = _pu_trackers(o)
    print(json.dumps(ts, indent=2))
    return ts


def fix(order_id, capture_id, tracker_id):
    patch = [{"op": "replace", "path": "/status", "value": "CANCELLED"}]
    r1 = call("c08", "PATCH", f"/v2/checkout/orders/{order_id}/trackers/{tracker_id}", patch)
    print("cancel ->", r1.status_code, r1.text[:300])
    r2 = call("c08", "PATCH", f"/v2/checkout/orders/{order_id}/trackers/{tracker_id}", patch)
    print("re-patch cancelled ->", r2.status_code, r2.text[:600])
    new = "EE123456785IN" if s10_valid("EE123456785IN") else s10_make("EE", "12345678", "IN")
    r3 = track(order_id, capture_id, new, check="c08")
    print("new tracker ->", r3.status_code)
    r4 = track(order_id, capture_id, new, check="c08")
    print("same number again ->", r4.status_code, r4.text[:600])
    ts = trackers(order_id, check="c08")
    save_evidence("c08", {"cancel": r1.status_code, "repatch": {"status": r2.status_code, "body": r2.json() if r2.content else None},
                          "new_number": new, "readd": r3.status_code,
                          "duplicate": {"status": r4.status_code, "body": r4.json() if r4.content else None},
                          "trackers_after": ts}, name="c08-summary.json")


def create():
    body = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": "listing_demo_001",
            "custom_id": "listing_demo_001",
            "description": ITEM["name"],
            "amount": {"currency_code": "USD", "value": "24.00",
                       "breakdown": {"item_total": {"currency_code": "USD", "value": "24.00"}}},
            "items": [{**ITEM, "category": "PHYSICAL_GOODS"}],
        }],
        "payment_source": {"paypal": {"experience_context": {
            "shipping_preference": "GET_FROM_FILE",
            "user_action": "PAY_NOW",
            "brand_name": "ShipSafe Probe",
            "return_url": "https://example.com/return",
            "cancel_url": "https://example.com/cancel",
        }}},
    }
    r = call("c09", "POST", "/v2/checkout/orders", body)
    o = r.json()
    approve = next((l["href"] for l in o.get("links", []) if l["rel"] in ("payer-action", "approve")), None)
    print("order", o.get("id"), o.get("status"))
    print("approve url:", approve)
    return o


def capture(order_id):
    r = call("c09", "POST", f"/v2/checkout/orders/{order_id}/capture", {})
    o = r.json()
    caps = [c for pu in o.get("purchase_units", []) for c in pu.get("payments", {}).get("captures", [])]
    print("status", o.get("status"), "captures", [(c["id"], c["status"]) for c in caps])
    return o


def batch(capture_id, num):
    body = {"trackers": [{"transaction_id": capture_id, "tracking_number": num, "status": "SHIPPED",
                          "carrier": CARRIER, "notify_buyer": True}]}
    r = call("c09", "POST", "/v1/shipping/trackers-batch", body)
    print(r.status_code, r.text[:800])


def refund(capture_id):
    r = call("c10", "POST", f"/v2/payments/captures/{capture_id}/refund",
             {"note_to_payer": "Sorry, the last one sold twice."})
    print(r.status_code, r.json().get("status"), r.json().get("id"))


def disputes():
    r = call("c11", "GET", "/v1/customer/disputes", params={"page_size": 10})
    print(r.status_code, "items:", len(r.json().get("items", [])) if r.status_code == 200 else r.text[:300])


if __name__ == "__main__":
    cmd, args = sys.argv[1], sys.argv[2:]
    globals()[cmd](*args)
