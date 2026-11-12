-- ShipSafe schema. One row per seller, listing, order, tracker and webhook event.

CREATE TABLE sellers (
  id TEXT PRIMARY KEY,                 -- PayPal user_id (sub) when available, else a generated id
  display_name TEXT,
  paypal_verified INTEGER,             -- 1, 0, or NULL when PayPal did not say
  connected_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                 -- random token, stored hashed in the cookie value
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE listings (
  id TEXT PRIMARY KEY,                 -- lst_...
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  colours TEXT NOT NULL DEFAULT '[]',  -- JSON array, becomes the Colour variant
  category TEXT,
  price TEXT NOT NULL,                 -- decimal string, e.g. "24.00"
  currency TEXT NOT NULL DEFAULT 'USD',
  quantity INTEGER NOT NULL DEFAULT 1,
  photo_key TEXT,                      -- R2 key
  plb_id TEXT UNIQUE,                  -- PayPal payment link id, PLB-...
  plb_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',-- DRAFT, ACTIVE, SOLD_OUT, ARCHIVED
  ai_confidence REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,                 -- PayPal Orders v2 id
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  listing_id TEXT REFERENCES listings(id),
  capture_id TEXT NOT NULL UNIQUE,
  plb_id TEXT,
  status TEXT NOT NULL,                -- PAID, SHIPPED, PROTECTED, REFUNDED, NEEDS_REFUND
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  variant TEXT,
  buyer_payer_id TEXT,
  buyer_country TEXT,
  buyer_account_status TEXT,           -- VERIFIED / UNVERIFIED from the order
  ship_name TEXT,
  ship_line1 TEXT,
  ship_line2 TEXT,
  ship_city TEXT,
  ship_state TEXT,
  ship_postcode TEXT,
  ship_country TEXT,
  seller_protection TEXT,              -- ELIGIBLE, PARTIALLY_ELIGIBLE, NOT_ELIGIBLE
  paid_at TEXT NOT NULL,
  shipped_at TEXT,
  refund_id TEXT
);
CREATE INDEX orders_seller ON orders(seller_id, paid_at);

CREATE TABLE trackers (
  id TEXT PRIMARY KEY,                 -- PayPal tracker id, {capture_id}-{tracking_number}
  order_id TEXT NOT NULL REFERENCES orders(id),
  tracking_number TEXT NOT NULL,
  carrier TEXT NOT NULL,
  status TEXT NOT NULL,                -- SHIPPED, CANCELLED
  slip_key TEXT,
  checks TEXT NOT NULL DEFAULT '{}',   -- JSON: s10, address, duplicate results
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX trackers_number ON trackers(tracking_number) WHERE status = 'SHIPPED';

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,                 -- PayPal event id, used to drop duplicate deliveries
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  handled INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
