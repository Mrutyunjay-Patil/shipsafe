"""C4. Minimal PayPal webhook listener.

Saves every delivery (headers + raw body) to evidence/webhook-<ts>.json and
returns 200. The raw body is kept unredacted in memory only, so C5 can verify
signatures through GET /webhooks/recent (protected by PROBE_READ_TOKEN when set,
which matters once this runs on a public host like Render).

Run: uvicorn probes.webhook_server:app --port 8000
"""
from __future__ import annotations

import json
import os
import sys
import time
from collections import deque
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EVIDENCE, redact  # noqa: E402

app = FastAPI()
RECENT: deque = deque(maxlen=200)
KEEP = ("paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id",
        "paypal-transmission-sig", "paypal-transmission-time", "content-type", "user-agent")


@app.get("/")
def health():
    return {"ok": True, "received": len(RECENT)}


@app.post("/webhooks/paypal")
async def paypal(request: Request):
    raw = await request.body()
    ts = time.strftime("%Y%m%dT%H%M%S") + f"{int(time.time() * 1000) % 1000:03d}"
    headers = {k: v for k, v in request.headers.items() if k.lower() in KEEP}
    try:
        event = json.loads(raw)
    except Exception:
        event = {"_unparsed": raw.decode(errors="replace")}
    RECENT.append({"received_at": ts, "headers": headers, "raw_body": raw.decode(errors="replace")})
    rec = {"received_at": ts, "event_type": event.get("event_type"), "headers": headers, "event": event}
    if os.getenv("WRITE_EVIDENCE", "1") == "1":
        (EVIDENCE / f"webhook-{ts}.json").write_text(json.dumps(redact(rec), indent=2, ensure_ascii=False))
    print(f"webhook {ts} {event.get('event_type')} {event.get('id')}", flush=True)
    return {"ok": True}


@app.get("/webhooks/recent")
def recent(authorization: str | None = Header(default=None)):
    want = os.getenv("PROBE_READ_TOKEN")
    if want and authorization != f"Bearer {want}":
        raise HTTPException(401)
    return list(RECENT)
