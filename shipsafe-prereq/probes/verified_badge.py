"""Seller verified badge probe: Log in with PayPal, then read verification fields.

Usage: python probes/verified_badge.py [seller|buyer]
1. Runs login_paypal.js, which signs in on PayPal's consent screen.
2. Fetches the authorization code the Worker stored.
3. Exchanges it at /v1/oauth2/token (grant_type=authorization_code).
4. Calls /v1/identity/openidconnect/userinfo?schema=openid.
Records verified_account, email_verified, account_type and payer_id.
"""
import os
import secrets
import subprocess
import sys
from pathlib import Path

import httpx

from common import BASE, mask, save_evidence

who = sys.argv[1] if len(sys.argv) > 1 else "seller"
RELAY = "https://shipsafe-webhook-probe.patilmrutyunjay2.workers.dev"
state = secrets.token_hex(8)
here = Path(__file__).resolve().parent
out = subprocess.run(["node", str(here / "login_paypal.js"), who, state], capture_output=True, text=True, timeout=180)
print(out.stdout.strip()[-600:], out.stderr.strip()[-300:])

r = httpx.get(f"{RELAY}/auth/paypal/code", params={"state": state},
              headers={"Authorization": f"Bearer {os.getenv('PROBE_READ_TOKEN')}"}, timeout=30)
if r.status_code != 200:
    raise SystemExit(f"no authorization code stored for state {state}: {r.status_code}")
rec = r.json()
if not rec.get("code"):
    raise SystemExit(f"PayPal returned an error: {rec.get('error')} {rec.get('error_description')}")

tok = httpx.post(f"{BASE}/v1/oauth2/token", auth=(os.getenv("PAYPAL_CLIENT_ID"), os.getenv("PAYPAL_CLIENT_SECRET")),
                 data={"grant_type": "authorization_code", "code": rec["code"]}, timeout=30)
tj = tok.json()
print("code exchange:", tok.status_code, "scope:", tj.get("scope"))
if tok.status_code != 200:
    save_evidence("badge", {"exchange_status": tok.status_code, "response": tj}, name=f"badge-{who}.json")
    raise SystemExit(1)

ui = httpx.get(f"{BASE}/v1/identity/openidconnect/userinfo", params={"schema": "openid"},
               headers={"Authorization": f"Bearer {tj['access_token']}"}, timeout=30)
u = ui.json()
fields = {k: u.get(k) for k in ("verified_account", "email_verified", "account_type", "payer_id")}
fields["user_id"] = mask(u.get("user_id"))
fields["address_country"] = (u.get("address") or {}).get("country")
fields["returned_keys"] = sorted(u.keys())
print("userinfo:", ui.status_code, fields)
save_evidence("badge", {"who": who, "exchange_status": tok.status_code, "granted_scope": tj.get("scope"),
                        "userinfo_status": ui.status_code, "fields": fields}, name=f"badge-{who}.json")
