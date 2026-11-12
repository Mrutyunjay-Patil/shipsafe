"""C4. Register a webhook for all events and fire a simulated event.

Usage:
  python probes/c04_webhook_setup.py register https://<public-host>/webhooks/paypal
  python probes/c04_webhook_setup.py simulate [EVENT_TYPE]
  python probes/c04_webhook_setup.py list
"""
import os
import sys

from common import call, set_env

cmd = sys.argv[1] if len(sys.argv) > 1 else "list"

if cmd == "register":
    url = sys.argv[2]
    r = call("c04", "POST", "/v1/notifications/webhooks",
             {"url": url, "event_types": [{"name": "*"}]})
    if r.status_code in (200, 201):
        wid = r.json()["id"]
        key = sys.argv[3] if len(sys.argv) > 3 else "PAYPAL_WEBHOOK_ID"
        set_env(key, wid)
        print(f"webhook id {wid} saved to .env as {key}")
    else:
        print(r.text[:800])
elif cmd == "simulate":
    ev = sys.argv[2] if len(sys.argv) > 2 else "PAYMENT.CAPTURE.COMPLETED"
    wid = os.getenv(sys.argv[3] if len(sys.argv) > 3 else "PAYPAL_WEBHOOK_ID")
    r = call("c04", "POST", "/v1/notifications/simulate-event",
             {"webhook_id": wid, "event_type": ev, "resource_version": "2.0"})
    print(r.status_code, r.text[:400])
elif cmd == "list":
    r = call("c04", "GET", "/v1/notifications/webhooks")
    for w in r.json().get("webhooks", []):
        print(w["id"], w["url"], [e["name"] for e in w.get("event_types", [])])
elif cmd == "delete":
    call("c04", "DELETE", f"/v1/notifications/webhooks/{sys.argv[2]}")
