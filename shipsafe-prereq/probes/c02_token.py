"""C2. OAuth token: record expires_in, app_id, scopes."""
import json

from common import get_token, mask

body = get_token(check="c02")
scopes = body.get("scope", "").split()
keywords = {
    "payment_resources": ["payment-resource", "paymentresource", "checkout/payment"],
    "checkout_orders": ["checkout", "orders"],
    "tracking_shipping": ["shipping", "tracking", "tracker"],
    "disputes": ["disputes", "dispute"],
    "webhooks": ["webhook", "notifications"],
}
found = {k: sorted({s for s in scopes for w in ws if w in s.lower()}) for k, ws in keywords.items()}
print(json.dumps({
    "token_type": body.get("token_type"),
    "expires_in": body.get("expires_in"),
    "app_id": mask(body.get("app_id")),
    "scope_count": len(scopes),
    "scope_matches": found,
}, indent=2))
print("\nfull scope list:")
for s in scopes:
    print(" ", s)
