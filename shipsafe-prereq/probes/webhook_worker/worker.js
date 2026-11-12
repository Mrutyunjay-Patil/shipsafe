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
      list.keys = list.keys.filter(k => !k.name.startsWith("auth-"));
      const out = [];
      for (const k of list.keys) { const v = await env.HOOKS.get(k.name); if (v) out.push(JSON.parse(v)); }
      out.sort((a, b) => a.received_at.localeCompare(b.received_at));
      return Response.json(out);
    }
    // Log in with PayPal return URL. Stores the one-time authorization code for the probe to exchange.
    // ShipSafe app sign-in hop: states starting with "app." belong to the app, so forward
    // PayPal's redirect (code and state unchanged) to the app's own callback.
    const appState = url.searchParams.get("state") || "";
    if (req.method === "GET" && url.pathname === "/auth/paypal/callback" && appState.startsWith("mpd.")) {
      return Response.redirect("https://mrutyunjaypatil.dev/shipsafe/auth/paypal/callback" + url.search, 302);
    }
    if (req.method === "GET" && url.pathname === "/auth/paypal/callback" && appState.startsWith("app.")) {
      return Response.redirect("https://shipsafe.patilmrutyunjay2.workers.dev/auth/paypal/callback" + url.search, 302);
    }
    if (req.method === "GET" && url.pathname === "/auth/paypal/callback") {
      const rec = { received_at: new Date().toISOString(), code: url.searchParams.get("code"),
        state: url.searchParams.get("state"), error: url.searchParams.get("error"),
        error_description: url.searchParams.get("error_description") };
      await env.HOOKS.put(`auth-${rec.state || "none"}`, JSON.stringify(rec), { expirationTtl: 600 });
      return new Response(rec.code ? "Signed in. You can close this tab." : "Sign-in failed.", { status: rec.code ? 200 : 400 });
    }
    if (req.method === "GET" && url.pathname === "/auth/paypal/code") {
      if (req.headers.get("authorization") !== `Bearer ${env.READ_TOKEN}`) return new Response("no", { status: 401 });
      const v = await env.HOOKS.get(`auth-${url.searchParams.get("state")}`);
      return v ? new Response(v, { headers: { "content-type": "application/json" } }) : new Response("{}", { status: 404 });
    }
    return Response.json({ ok: true, service: "shipsafe-webhook-probe" });
  },
};
