"""Shared helpers for ShipSafe sandbox probes.

Loads .env, gets a PayPal sandbox OAuth token, and logs every call to
evidence/<check>-<n>.json with secrets masked and buyer PII redacted.
Sandbox only: BASE is hard-coded and every call is checked against it.
"""
from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)
load_dotenv(ROOT / ".env")

BASE = "https://api-m.sandbox.paypal.com"

# Keys whose values are personal data. City, postcode and country stay.
PII_KEYS = {
    "email_address", "email", "payer_email", "given_name", "surname",
    "full_name", "name", "address_line_1", "address_line_2", "address_line_3",
    "phone_number", "national_number", "payer_name", "shipping_name",
    "alternate_full_name", "receiver_email",
}
# Keys that hold an item or business name, not a person. Keep them.
KEEP_NAME_PARENTS = {"items", "item_details", "item", "product", "line_items", "variants",
                     "options", "dimensions", "carrier_name_other"}

# A bare "name" key is personal data only under these parents.
PERSON_NAME_PARENTS = {"payer", "shipping", "paypal", "card", "payment_source", "resource", "subscriber"}

SECRET_KEYS = {"access_token", "client_secret", "authorization", "password",
               "refresh_token", "id_token", "nonce"}


def mask(value: str | None) -> str:
    if not value:
        return "<empty>"
    value = str(value)
    if len(value) <= 10:
        return "…" * 3
    return f"{value[:4]}…{value[-4:]}"


def _secret_values() -> list[str]:
    vals = []
    for k in ("PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "SANDBOX_BUYER_PASSWORD",
              "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "RENDER_API_KEY", "NGROK_AUTHTOKEN"):
        v = os.getenv(k)
        if v and len(v) > 6:
            vals.append(v)
    if _TOKEN.get("value"):
        vals.append(_TOKEN["value"])
    return vals


def redact(obj: Any, parent: str = "") -> Any:
    """Return a copy with secrets masked and personal fields replaced."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            lk = k.lower()
            if lk in SECRET_KEYS and isinstance(v, str):
                out[k] = mask(v)
            elif lk == "name" and parent not in PERSON_NAME_PARENTS:
                out[k] = redact(v, lk)
            elif lk in PII_KEYS and isinstance(v, (str, dict)) and parent not in KEEP_NAME_PARENTS:
                out[k] = "<redacted>"
            else:
                out[k] = redact(v, lk)
        return out
    if isinstance(obj, list):
        return [redact(v, parent) for v in obj]
    if isinstance(obj, str):
        s = obj
        for secret in _secret_values():
            s = s.replace(secret, mask(secret))
        s = re.sub(r"[\w.+-]+@[\w-]+\.[\w.]+", "<email>", s)
        return s
    return obj


_COUNTERS: dict[str, int] = {}


def save_evidence(check: str, payload: Any, name: str | None = None) -> Path:
    if name is None:
        _COUNTERS[check] = _COUNTERS.get(check, 0) + 1
        n = _COUNTERS[check]
        path = EVIDENCE / f"{check}-{n}.json"
        while path.exists():
            n += 1
            path = EVIDENCE / f"{check}-{n}.json"
        _COUNTERS[check] = n
    else:
        path = EVIDENCE / name
    path.write_text(json.dumps(redact(payload), indent=2, ensure_ascii=False))
    return path


_TOKEN: dict[str, Any] = {}


def get_token(check: str | None = None, force: bool = False) -> dict:
    if not force and _TOKEN.get("value") and _TOKEN["exp"] > time.time() + 60:
        return _TOKEN["raw"]
    cid, sec = os.getenv("PAYPAL_CLIENT_ID"), os.getenv("PAYPAL_CLIENT_SECRET")
    if not cid or not sec:
        raise SystemExit("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET missing in .env")
    r = httpx.post(f"{BASE}/v1/oauth2/token", auth=(cid, sec),
                   data={"grant_type": "client_credentials"}, timeout=30)
    body = r.json()
    if check:
        save_evidence(check, {"request": {"method": "POST", "path": "/v1/oauth2/token"},
                              "status": r.status_code, "response": body})
    r.raise_for_status()
    _TOKEN.update(value=body["access_token"], exp=time.time() + body["expires_in"], raw=body)
    return body


def call(check: str, method: str, path: str, json_body: Any = None,
         params: dict | None = None, headers: dict | None = None,
         quiet: bool = False) -> httpx.Response:
    url = path if path.startswith("http") else BASE + path
    if not url.startswith(BASE):
        raise SystemExit(f"refusing non-sandbox URL: {url}")
    get_token()
    h = {"Authorization": f"Bearer {_TOKEN['value']}", "Content-Type": "application/json",
         "Prefer": "return=representation"}
    h.update(headers or {})
    t0 = time.time()
    r = httpx.request(method, url, json=json_body, params=params, headers=h, timeout=60)
    ms = int((time.time() - t0) * 1000)
    try:
        body = r.json()
    except Exception:
        body = r.text
    rec = {
        "request": {"method": method, "path": url.replace(BASE, ""), "params": params,
                    "body": json_body,
                    "headers": {k: v for k, v in h.items() if k.lower() != "authorization"}},
        "status": r.status_code,
        "elapsed_ms": ms,
        "debug_id": r.headers.get("paypal-debug-id"),
        "response": body,
    }
    p = save_evidence(check, rec)
    if not quiet:
        print(f"[{check}] {method} {url.replace(BASE, '')} -> {r.status_code} ({ms} ms) {p.name}")
    return r


def set_env(key: str, value: str) -> None:
    """Write or replace KEY=value in .env without printing it."""
    env = ROOT / ".env"
    lines = env.read_text().splitlines() if env.exists() else []
    out, done = [], False
    for line in lines:
        if line.startswith(f"{key}="):
            out.append(f"{key}={value}")
            done = True
        else:
            out.append(line)
    if not done:
        out.append(f"{key}={value}")
    env.write_text("\n".join(out) + "\n")
    os.environ[key] = value
