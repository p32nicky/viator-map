ROME MAP — Enrichment + Clustering + SEO Pages Pack

This pack adds:
1) Enrichment step (geocode missing lat/lng)
2) Marker clustering (handles thousands of points)
3) SEO pages:
   - /category/[slug]  (category landing pages)
   - /item/[id]        (per-item landing pages)
   - /sitemap.xml      (basic sitemap)

SECURITY
- Keep API keys ONLY in .env.local (project root). Do not commit .env.local to git.

DEPENDENCIES (run in CMD from project root):
  npm install leaflet.markercluster dotenv

OPTIONAL (for enrichment geocoding):
  npm install
  (no extra packages; uses fetch)

SETUP
1) Copy these folders/files into your project root (merge/overwrite):
   - scripts/
   - app/ui/MapView.tsx
   - app/category/[slug]/page.tsx
   - app/item/[id]/page.tsx
   - app/sitemap.xml/route.ts
   - lib/data.ts

2) Add keys to .env.local (project root):
   VIATOR_API_KEY=...                 (you already have)
   VIATOR_DESTINATION_ID=511          (Rome)
   VIATOR_CAMPAIGN=rome_map

   # For enrichment:
   OPENCAGE_API_KEY=your_opencage_key
   GEOCODE_DELAY_MS=1100             (optional; default 1100ms)
   GEOCODE_MAX_PER_RUN=0             (optional; 0 = no limit)

RUNNING THE FULL PIPELINE (Option B)
- Sync from Viator, then enrich coordinates, then write data/items.geo.json
  node scripts\sync-and-enrich.mjs

OR run separately:
  node scripts\viator-sync.mjs
  node scripts\enrich-coordinates.mjs

OUTPUTS
- data/items.json            (Viator sync output)
- data/items.geo.json        (enriched output with lat/lng for (almost) everything)
- data/geocode-cache.json    (cache so reruns are fast)

HOW THE MAP USES DATA
- Home page already prefers data/items.geo.json if present.
- Clustering is applied automatically once MapView.tsx is updated.

NOTES
- Geocoding 1000s of items can take time (rate limits). This is why we cache.
- For best accuracy, you can later enrich using Viator product details meeting point (if your access allows).
