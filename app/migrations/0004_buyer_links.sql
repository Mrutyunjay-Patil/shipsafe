-- A one-buyer PayPal link made from a listing. It closes after one payment, when the listing
-- sells out, when the seller closes it, or when it expires.
CREATE TABLE buyer_links (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  seller_id TEXT NOT NULL,
  plb_id TEXT UNIQUE,
  plb_url TEXT,
  label TEXT NOT NULL,
  price TEXT NOT NULL,
  colour TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  order_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX buyer_links_listing ON buyer_links (listing_id, status);
CREATE INDEX buyer_links_open ON buyer_links (status, expires_at);
ALTER TABLE orders ADD COLUMN buyer_link_id TEXT;
