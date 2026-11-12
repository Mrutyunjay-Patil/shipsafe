-- Every photo of a listing, cover first. photo_key stays as the cover so order rows keep working.
ALTER TABLE listings ADD COLUMN photos TEXT NOT NULL DEFAULT '[]';
UPDATE listings SET photos = json_array(photo_key) WHERE photo_key IS NOT NULL;
