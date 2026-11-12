-- Seller-entered product details, e.g. [{"name":"Material","value":"Cotton"}]
ALTER TABLE listings ADD COLUMN attributes TEXT NOT NULL DEFAULT '[]';
