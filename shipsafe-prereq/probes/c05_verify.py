"""C5. Verify webhook signatures for every delivery the listener holds in memory.

Usage: python probes/c05_verify.py <listener base url> [WEBHOOK_ID_ENV_KEY]
Reads GET <base>/webhooks/recent (raw bodies), posts each to
/v1/notifications/verify-webhook-signature and prints the status.
"""
import json
import os
import sys

import httpx

from common import call, save_evidence

base = sys.argv[1].rstrip("/")
wid = os.getenv(sys.argv[2] if len(sys.argv) > 2 else "PAYPAL_WEBHOOK_ID")
tok = os.getenv("PROBE_READ_TOKEN")
recent = httpx.get(f"{base}/webhooks/recent", timeout=60,
                   headers={"Authorization": f"Bearer {tok}"} if tok else {}).json()
results = []
for d in recent:
    h = d["headers"]
    if "paypal-transmission-id" not in h:
        continue
    event = json.loads(d["raw_body"])
    body = {
        "auth_algo": h.get("paypal-auth-algo"),
        "cert_url": h.get("paypal-cert-url"),
        "transmission_id": h.get("paypal-transmission-id"),
        "transmission_sig": h.get("paypal-transmission-sig"),
        "transmission_time": h.get("paypal-transmission-time"),
        "webhook_id": wid,
        "webhook_event": event,
    }
    r = call("c05", "POST", "/v1/notifications/verify-webhook-signature", body, quiet=True)
    status = r.json().get("verification_status") if r.status_code == 200 else f"HTTP {r.status_code}"
    simulated = "simulat" in json.dumps(event).lower() or event.get("summary", "").lower().startswith("simulat")
    results.append({"received_at": d["received_at"], "event_type": event.get("event_type"),
                    "event_id": event.get("id"), "looks_simulated": simulated, "verification": status})
    print(results[-1])
save_evidence("c05", results, name="c05-summary.json")
