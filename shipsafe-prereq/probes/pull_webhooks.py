"""Pull deliveries from the webhook relay into evidence/webhook-<ts>.json (redacted).

Usage: python probes/pull_webhooks.py [relay base url]
Prints one line per event: time, type, event id, resource id.
"""
import json
import os
import sys

import httpx

from common import EVIDENCE, redact

BASE = (sys.argv[1] if len(sys.argv) > 1 else os.getenv(
    "WEBHOOK_RELAY", "https://shipsafe-webhook-probe.patilmrutyunjay2.workers.dev")).rstrip("/")


def pull():
    r = httpx.get(f"{BASE}/webhooks/recent", timeout=60,
                  headers={"Authorization": f"Bearer {os.getenv('PROBE_READ_TOKEN')}"})
    r.raise_for_status()
    rows = r.json()
    for d in rows:
        ev = json.loads(d["raw_body"])
        ts = d["received_at"].replace(":", "").replace("-", "")
        path = EVIDENCE / f"webhook-{ts}-{ev.get('event_type', 'unknown')}.json"
        if not path.exists():
            path.write_text(json.dumps(redact({"received_at": d["received_at"], "headers": d["headers"],
                                               "event": ev}), indent=2, ensure_ascii=False))
        res = ev.get("resource", {})
        print(d["received_at"], ev.get("event_type"), ev.get("id"), res.get("id"), res.get("status"))
    return rows


if __name__ == "__main__":
    pull()
