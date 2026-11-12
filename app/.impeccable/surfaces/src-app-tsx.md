---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Home.tsx","src/pages/OrderDetail.tsx","src/pages/Sell.tsx"]
---

# ShipSafe seller app

Scope: the whole seller PWA (Home, Sell, Orders, Order detail, Ask, Board, Sign in, buyer Thanks). Mode: Operate.
Audience: small social sellers on a phone, often outdoors at a courier counter in daylight; judges watching a 30-second demo.
Task: photo to PayPal link to slip scan to protected sale, one next step per screen.
Constraints: blue glass palette and Outfit are brand-pinned; every value lives in src/theme.css; light first, dark supported; fast on a cheap phone.

## Direction contract

THESIS: ShipSafe is international airmail for social sellers. Every sale is a letter going abroad, and protection is the airmail label PayPal lets you stick on. It refuses the fintech wallet arrangement of a balance hero over icon tiles.

OWN-WORLD: Onion-skin blue paper ground, airmail ultramarine ink, the red and blue chevron border used only as the in-transit edge, perforated stamp frames around product photos, circular postmarks for dates and destinations, the blue PAR AVION etiquette as the Protected mark. Outfit for UI, a mono only for tracking numbers. Brand blue fills only what can be pressed.

STORY: The seller sees what to post next, posts it, and watches each parcel earn its airmail label. Judges see a chat sale become a PayPal order with tracking and protection.

FIRST VIEWPORT: Home leads with the next parcel as an addressed envelope: stamp photo top right, destination city large, buyer address lines, a full-width Scan courier slip button inside it. Below, a short ledger of letters in transit. Earnings sit as one quiet line, not a hero number.

FORM: airmail envelope and etiquette, position 1 of 7 on my list, chosen by the user as Impeccable's pick over the assigned hang tag (position 6). seed:65c6dc296029e581
Raises kept from the hand: status owns one hue everywhere (acetate tabs); strict 4px grid and tabular figures (Crouwel); stock shown as fixed capacity, units left (j-card); destination leads every order row (split-flap); saturated blue only on actions (warm consumer).
Signature interaction: when tracking is accepted by PayPal, a postmark strikes the envelope and the PAR AVION label settles beside it. One authored moment; everything else is quiet.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish reviewer's verdict and a token-bearing DESIGN.md.
