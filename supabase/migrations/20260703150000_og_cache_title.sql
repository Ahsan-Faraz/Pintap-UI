-- Cache the page's Open Graph title alongside its image so link creation can seed
-- a human-readable name (e.g. "Uvex Pace Stage helmet") instead of a URL slug or
-- SKU like "1235152 1 Style". Fetched in the same request as the image.
alter table public.og_image_cache
  add column if not exists title text;
