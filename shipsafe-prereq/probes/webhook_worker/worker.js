// Throwaway PayPal webhook relay for the ShipSafe sandbox probes (C4/C5/C6).
// POST /webhooks/paypal stores headers + raw body in KV. GET /webhooks/recent
// returns them, gated by the READ_TOKEN secret.
const KEEP = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id",
  "paypal-transmission-sig", "paypal-transmission-time", "content-type", "user-agent"];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/webhooks/paypal") {
      const raw = await req.text();
      const headers = {};
      for (const k of KEEP) { const v = req.headers.get(k); if (v) headers[k] = v; }
      const ts = new Date().toISOString();
      const key = `${ts}-${crypto.randomUUID().slice(0, 8)}`;
      await env.HOOKS.put(key, JSON.stringify({ received_at: ts, headers, raw_body: raw }),
        { expirationTtl: 60 * 60 * 24 * 7 });
      return Response.json({ ok: true });
    }
    if (req.method === "GET" && url.pathname === "/webhooks/recent") {
      if (req.headers.get("authorization") !== `Bearer ${env.READ_TOKEN}`) return new Response("no", { status: 401 });
      const list = await env.HOOKS.list({ limit: 1000 });
      const out = [];
      for (const k of list.keys) { const v = await env.HOOKS.get(k.name); if (v) out.push(JSON.parse(v)); }
      out.sort((a, b) => a.received_at.localeCompare(b.received_at));
      return Response.json(out);
    }
    return Response.json({ ok: true, service: "shipsafe-webhook-probe" });
  },
};
