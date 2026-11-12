---
name: ShipSafe
description: International airmail for social sellers. Every sale is a letter going abroad, and protection is the airmail label PayPal lets you stick on.
colors:
  airmail-ink: "oklch(0.36 0.17 266)"
  airmail-red: "oklch(0.58 0.2 25)"
  airmail-blue: "oklch(0.45 0.19 264)"
  onion-skin-paper: "oklch(0.975 0.012 250)"
  paper-deep: "oklch(0.94 0.024 252)"
  postmark: "oklch(0.42 0.06 265 / 0.55)"
  etiquette: "oklch(0.42 0.18 265)"
  etiquette-foreground: "oklch(0.985 0.005 250)"
  brand: "oklch(0.5 0.21 265)"
  brand-foreground: "oklch(0.99 0 0)"
  brand-soft: "oklch(0.93 0.035 260)"
  status-paid: "oklch(0.64 0.15 76)"
  status-shipped: "oklch(0.52 0.15 250)"
  status-protected: "oklch(0.55 0.14 155)"
  status-refund: "oklch(0.56 0.2 25)"
  status-closed: "oklch(0.55 0.02 260)"
  foreground: "oklch(0.24 0.05 266)"
  muted-foreground: "oklch(0.47 0.04 262)"
  card: "oklch(0.995 0.004 250)"
  envelope: "oklch(0.995 0.006 250)"
  stamp-paper: "oklch(0.985 0.008 85)"
  sheet: "oklch(1 0 0 / 0.72)"
  border: "oklch(0.89 0.022 258)"
  ring: "oklch(0.55 0.2 265)"
typography:
  display:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(34px, 11vw, 44px)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 72"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
  body-small:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  money:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  tracking:
    fontFamily: "Geist Mono Variable, ui-monospace, SFMono-Regular, monospace"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "0.04em"
    fontFeature: "'tnum' 1"
rounded:
  etiquette: "5px"
  input: "12px"
  card: "14px"
  envelope: "16px"
  sheet: "25.2px"
  pill: "9999px"
spacing:
  gutter: "20px"
  row-x: "16px"
  row-y: "14px"
  envelope-pad: "20px"
  stack: "12px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-foreground}"
    rounded: "{rounded.card}"
    height: "52px"
    typography: "{typography.body}"
  button-outline:
    backgroundColor: "{colors.onion-skin-paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    height: "52px"
  button-pill-outline:
    backgroundColor: "{colors.onion-skin-paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
  envelope:
    backgroundColor: "{colors.envelope}"
    rounded: "{rounded.envelope}"
    padding: "16px 20px 20px"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
  par-avion:
    backgroundColor: "{colors.etiquette}"
    textColor: "{colors.etiquette-foreground}"
    rounded: "{rounded.etiquette}"
    padding: "6px 12px"
  status-badge:
    rounded: "{rounded.pill}"
    padding: "3px 8px"
    typography: "{typography.label}"
  input-tracking:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.input}"
    height: "56px"
    typography: "{typography.tracking}"
---

# Design System: ShipSafe

## Overview

**Creative North Star: "The Airmail Letter"**

Every order is a letter going abroad. The ground is onion-skin airmail paper with a faint blue wash from the top of the page; lists sit on translucent sheets; the order that matters now is an envelope with a red and blue chevron edge, a perforated stamp holding the product photo, the destination city set as a postal label, and a circular postmark for the date. Protection is the blue SHIPPED SAFE label (airmail etiquette style), and it appears only once PayPal actually has the tracking.

The system is quiet and paper-like: one next step per screen, one strong action colour, no hero numbers. Depth comes from paper sheets and envelope shadows, never from neon or glow. All values live in one swappable file, `src/theme.css`; components read only its variables, and a second look (`data-theme="lime"`, deep green and lime) is kept ready. Light mode leads; dark mode is the same letter read under a desk lamp.

**Key Characteristics:**
- Onion-skin paper ground, airmail ultramarine ink, translucent sheets.
- Envelope, stamp, postmark and SHIPPED SAFE drawn as geometry from tokens, never as pictures.
- Destination leads every order, in condensed Archivo capitals.
- Saturated brand blue only on what can be pressed.
- One authored motion moment: the postmark strike.

## Colors

An ultramarine-on-blue-paper airmail palette with one pressable blue and five status hues. `src/theme.css` is the single source of truth: the frontmatter records the default light "blue" theme; dark (`.dark`) and the alternate `[data-theme="lime"]` redefine the same variable names, and the user switches looks by setting `data-theme` on `<html>` in `index.html`.

### Primary
- **Pressable Ultramarine** (brand): fills primary buttons, the raised Sell tab, text links ("All orders") and the caret. It is the only saturated blue on screen. Soft Brand Wash (brand-soft) backs the empty stamp placeholder.

### Secondary
- **Airmail Ink** (airmail-ink): the envelope ink. Destination capitals, the active tab label and its indicator bar, the connected-account chip text.
- **Etiquette Blue** (etiquette, on etiquette-foreground): the ground of the SHIPPED SAFE label only.

### Tertiary
- **Chevron Red and Chevron Blue** (airmail-red, airmail-blue): the two stripes of the in-transit chevron edge, nothing else.
- **Cancellation Ink** (postmark): translucent ink for circular postmarks.
- **Status hues**: Amber Paid (status-paid, "Paid, post it"), Sky Shipped (status-shipped, "In the post"), Green Protected (status-protected), Red Refund (status-refund, "Sold twice, refund"; also destructive), Grey Closed (status-closed, refunded). Badges mix the hue at 14% into transparent for the ground and 78% into foreground for text; refund notices mix it at 8-9% into card with a 30% border.

### Neutral
- **Onion-Skin Paper** (onion-skin-paper): page background, under a top gradient from a deeper blue wash fading out by 340px. Paper Deep sits as a second sheet below.
- **Envelope White** (envelope) and **Card White** (card): envelopes, the board grid, chips and inputs.
- **Onion-Skin Sheet** (sheet, 72% white): translucent list panels with 14px backdrop blur.
- **Gummed Stamp Paper** (stamp-paper): warm off-white perforation ground, light in both themes.
- **Letter Ink** (foreground) and **Faded Ink** (muted-foreground, 5.6:1 on paper): text and secondary text.
- **Sheet Rule** (border) and focus **Ring** (ring).

### Named Rules
**The Pressable Blue Rule.** Saturated brand blue fills only things that can be pressed. Ink blue writes; etiquette blue labels protection; brand blue acts.

**The One Hue Per Status Rule.** Each order status owns one hue, used for its badge, its row and its icon, and it is always paired with an icon and words so state never relies on colour alone.

**The One Theme File Rule.** No component carries a raw colour; every colour, surface, radius and font comes from a `theme.css` variable so a theme swap changes the whole app.

## Typography

**Display Font:** Archivo Variable (with ui-sans-serif, system-ui)
**Body Font:** Archivo Variable
**Label/Mono Font:** Geist Mono Variable, for tracking numbers and PayPal IDs only

**Character:** One family doing two jobs: Archivo at normal width for interface text, and the same face condensed to its width axis (`--label-stretch`, 72%) in bold capitals for cities and postal labels. A mono appears only where the user copies a code.

### Hierarchy
- **Display** (700, clamp(34px, 11vw, 44px), 0.92, condensed capitals): the destination city on the next-parcel and order envelopes; empty-state words ("All posted") at 32px.
- **Headline** (600, 26px, tight): page greetings and page titles, balanced, -0.025em.
- **Title** (600, 17px): section headings ("In the post", "Check before PayPal sees it").
- **Body** (400, 15px, snug): addresses, button labels, check lines. Empty-state copy is held to 30ch.
- **Body small** (400, 13px, Faded Ink): hints, metadata, the quiet earnings line.
- **Label** (600, 11px): status badges and tab labels. Row destinations use the condensed capitals at 18-19px.
- **Money** (600, tabular figures, -0.02em): every amount, 15px in rows, 28px on the order envelope.
- **Tracking** (Geist Mono, tabular, +0.04em): tracking numbers and order IDs, 12-20px.

### Named Rules
**The Postal Capitals Rule.** Condensed bold capitals are for destinations and postal marks (cities, SHIPPED SAFE, postmark rings). Interface text stays at normal width and sentence case.

**The Mono Means Code Rule.** Geist Mono appears only on strings the seller reads off a slip or copies: tracking numbers, PayPal IDs, payment links.

## Layout

Mobile-first single column, max-width 28rem (`max-w-md`) with a 20px gutter and safe-area insets top and bottom. The fixed bottom tab bar floats 12px in from the edges, and the page reserves 112px beneath for it. Home stacks: greeting row, the next-parcel envelope, an optional refund notice, the "In the post" ledger (up to four rows), then one quiet earnings line. Rows are 16px by 14px with a 48px stamp. Spacing steps on a 4px base (12px stacks, 20px envelope padding, 32px between sections). The desktop order board widens to `max-w-7xl` and sets orders in a grid of 64px rows inside one envelope.

## Elevation & Depth

Layered paper, not floating cards. The page is a sheet of onion-skin paper; lists are translucent sheets you can just see through, with backdrop blur; envelopes and the tab bar sit higher with longer, ink-tinted shadows. Dark mode keeps the layering but uses black shadows.

### Shadow Vocabulary
- **Sheet** (`0 1px 2px oklch(0.3 0.08 265 / 0.06), 0 12px 28px -18px oklch(0.3 0.1 265 / 0.35)`): list panels and the slip-check panel.
- **Envelope** (`0 2px 4px oklch(0.3 0.1 265 / 0.06), 0 22px 40px -24px oklch(0.32 0.14 265 / 0.45)`): the letter in focus and the board.
- **Stamp** (two drop-shadows on the perforated outline): lifts stamps off the envelope.
- **Brand lift** (`0 10px 20px -8px var(--brand)`): the raised Sell action only.

### Named Rules
**The Paper Stack Rule.** Depth says which paper is on top: page, then sheet, then envelope. Shadows are tinted with ink blue, never neutral grey glow.

## Shapes

Soft rectangles with a 14px base radius (`--radius`). Action buttons and notices use 14px; inputs 12px; envelopes 16px with clipped contents so the chevron edge runs flush; list sheets 25.2px (base x 1.8); the tab bar 22px and the Sell tab 18px. Pills are reserved for small controls: status badges, the account chip, Copy and Fix number. The postal marks keep their own forms: perforated stamp edges (5px holes on a 10px grid), circular double-ring postmarks with text on the ring, a 5px-radius etiquette with an inset hairline outline, and a 45 degree red-white-blue-white chevron with 14px stripes.

## Components

### Buttons
Tall, calm, thumb-sized.
- **Shape:** gently rounded (14px), 52px tall for primary actions, full width inside envelopes.
- **Primary:** Pressable Ultramarine with white text, 15px medium, a leading icon ("Scan the courier slip").
- **Hover / Focus / Active:** hover lightens to 80%; focus shows a 3px ring at 50% ring colour; press scales to 0.97 over 150ms.
- **Outline:** paper background with a border; becomes the scan button once an order is posted.
- **Pill outline:** small secondary actions (Copy, Fix number).
- **Destructive:** status-refund wash at 10% with red text, used for refunds.

### Status badges
- **Style:** pill, 11px semibold, 3px by 8px, icon at 14px plus words; hue at 14% ground, 78% mixed text.
- **Protected** is never a badge: a protected order shows the SHIPPED SAFE label (airmail etiquette style) instead.

### Envelope (signature)
The order in focus. Envelope white, 16px, envelope shadow, a 10px chevron edge on top while in transit (absent once refunded). Destination capitals top left, a stamp tilted 3 degrees top right (72 by 86px), address block below a dashed rule, postmark tilted -10 to -12 degrees.

### Sheet / order rows
Translucent sheet, 25.2px corners, rows divided by 70% border. Each row: stamp, destination capitals, item in Faded Ink, amount and status on the right. Rows tint with accent on hover and press.

### Stamp, Postmark, SHIPPED SAFE
- **Stamp:** product photo inside 7px of perforated gummed paper; a parcel icon on brand-soft when there is no photo.
- **Postmark:** SVG double ring in translucent cancellation ink, city around the ring, date in mono across the centre.
- **SHIPPED SAFE:** etiquette blue label, "Shipped safe" in condensed capitals over "Protected by PayPal", tilted -2 degrees.

### Inputs
Tracking input: 56px tall, 12px radius, card background, 20px semibold mono, auto-uppercased.

### Navigation
Floating bottom bar, card at 95% with backdrop blur, 22px radius, ink-tinted shadow. Four tabs (icon 22px, 11px label): active is Airmail Ink with a 3px ink bar on top, inactive Faded Ink. The Sell action is raised 28px in the centre: a 58px brand square with 18px corners, a 4px paper ring and the brand lift.

### Motion
**The One Strike Rule.** There is one authored moment: when PayPal accepts tracking, the postmark strikes the envelope (620ms, scale 1.6 to 1, settling at -10 degrees) and SHIPPED SAFE settles beside it 380ms later (520ms). Supporting motion starts from a visible state (opacity 0.6) and only eases in: page-in 320ms, letter-arrive 900ms for an order that lands while the app is open, envelope-in 560ms. All use `cubic-bezier(0.16, 1, 0.3, 1)` and are switched off under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:
- **Do** read every colour, surface, radius and font from `src/theme.css` variables, so `data-theme="blue"` or `"lime"` restyles the app.
- **Do** lead every order with its destination in condensed capitals (`--label-stretch`, 72%).
- **Do** pair every status hue with its icon and words.
- **Do** put the chevron edge only on envelopes in transit, and keep airmail red to the chevron and stamps.
- **Do** set every amount in tabular figures and every tracking number in Geist Mono.
- **Do** keep primary actions 52px tall, full width, 14px radius.
- **Do** start supporting motion from a visible state and honour `prefers-reduced-motion`.

### Don't:
- **Don't** fill anything that cannot be pressed with brand blue.
- **Don't** show SHIPPED SAFE unless PayPal has the tracking and protection applies.
- **Don't** lead a screen with a balance hero over icon tiles; earnings stay one quiet line.
- **Don't** add another authored animation beside the postmark strike.
- **Don't** use purple gradients, sparkles or glowing orbs, or a crypto or banking look.
- **Don't** use mono for interface text or condensed capitals for sentences.
