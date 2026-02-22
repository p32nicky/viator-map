/**
 * Viator-based coordinate enrichment (Option C).
 *
 * Uses Viator endpoints instead of external geocoding:
 *  - GET /products/{product-code} (Basic access allowed)
 *  - POST /locations/bulk (Basic access allowed)
 *
 * Writes: data/items.geo.json
 *
 * ENV (.env.local):
 *   VIATOR_API_KEY=...
 * Optional:
 *   VIATOR_ENRICH_MAX_PER_RUN=200
 *   VIATOR_ENRICH_DELAY_MS=250
 *   VIATOR_LOCATION_BATCH=50
 *
 * NOTE:
 * Viator advises /products/{product-code} is for real-time fetch when needed and can be cached up to 1 hour.
 * This script throttles and caches so you can run it in chunks.
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const ROOT = process.cwd();
const ITEMS_IN = path.join(ROOT, "data", "items.json");
const OUT_FILE = path.join(ROOT, "data", "items.geo.json");

const PRODUCT_CACHE_FILE = path.join(ROOT, "data", "viator-product-cache.json");
const LOCATION_CACHE_FILE = path.join(ROOT, "data", "viator-location-cache.json");

const API_KEY = process.env.VIATOR_API_KEY;
const MAX_PER_RUN = Number(process.env.VIATOR_ENRICH_MAX_PER_RUN || 200);
const DELAY_MS = Number(process.env.VIATOR_ENRICH_DELAY_MS || 250);
const LOC_BATCH = Number(process.env.VIATOR_LOCATION_BATCH || 50);

if (!API_KEY) {
  console.error("ERROR: VIATOR_API_KEY missing in .env.local");
  process.exit(1);
}

if (!fs.existsSync(ITEMS_IN)) {
  console.error("ERROR: data/items.json not found. Run node scripts/viator-sync.mjs first.");
  process.exit(1);
}

const items = JSON.parse(fs.readFileSync(ITEMS_IN, "utf8"));

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

let productCache = loadJson(PRODUCT_CACHE_FILE, {});   // productCode -> { fetchedAt, data }
let locationCache = loadJson(LOCATION_CACHE_FILE, {}); // locationRef -> { lat,lng,name,address,fetchedAt }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function nowIso() { return new Date().toISOString(); }
function ageMinutes(iso) {
  try { return (Date.now() - new Date(iso).getTime()) / (1000 * 60); } catch { return 1e9; }
}

// Viator fetch helper (v2 Accept header)
async function viatorFetch(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Accept-Language": "en-US",
      "Content-Type": "application/json",
      "Accept": "application/json;version=2.0",
      "exp-api-key": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Viator ${res.status} @ ${url}: ${text.slice(0, 2000)}`);
  }
  return res.json();
}

/**
 * Extract location reference IDs from an arbitrary product content response.
 * We don't assume a single schema; we scan recursively for keys that contain "locationRef"
 * and also capture primitive string values under those keys.
 */
function extractLocationRefs(obj) {
  const refs = new Set();

  const visit = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        const key = String(k).toLowerCase();
        if (key.includes("locationref") || key.includes("location_ref") || key.includes("locationreference")) {
          if (typeof val === "string") refs.add(val.trim());
        }
        visit(val);
      }
    }
  };

  visit(obj);
  return Array.from(refs);
}

/**
 * Get product content, cached for 60 minutes.
 */
async function getProduct(productCode) {
  const cached = productCache[productCode];
  if (cached?.fetchedAt && cached?.data && ageMinutes(cached.fetchedAt) < 60) {
    return cached.data;
  }
  const url = `https://api.viator.com/partner/products/${encodeURIComponent(productCode)}`;
  const data = await viatorFetch(url, { method: "GET" });
  productCache[productCode] = { fetchedAt: nowIso(), data };
  fs.writeFileSync(PRODUCT_CACHE_FILE, JSON.stringify(productCache, null, 2));
  return data;
}

/**
 * Resolve location refs via /locations/bulk, caching results "long-term".
 */
async function resolveLocationsBulk(locationRefs) {
  const need = [];
  for (const ref of locationRefs) {
    if (locationCache[ref]?.lat != null && locationCache[ref]?.lng != null) continue;
    need.push(ref);
  }
  if (!need.length) return;

  for (let i = 0; i < need.length; i += LOC_BATCH) {
    const batch = need.slice(i, i + LOC_BATCH);
    const url = "https://api.viator.com/partner/locations/bulk";
    const data = await viatorFetch(url, { method: "POST", body: { locations: batch } });

    const locations = data?.locations ?? data?.data?.locations ?? data?.data ?? data;
    if (Array.isArray(locations)) {
      for (const loc of locations) {
        const ref = String(loc?.locationRef ?? loc?.locationReference ?? loc?.id ?? "");
        const lat = loc?.latitude ?? loc?.lat ?? loc?.coordinates?.latitude ?? loc?.coordinates?.lat;
        const lng = loc?.longitude ?? loc?.lng ?? loc?.coordinates?.longitude ?? loc?.coordinates?.lng;
        if (ref) {
          locationCache[ref] = {
            fetchedAt: nowIso(),
            lat: typeof lat === "number" ? lat : null,
            lng: typeof lng === "number" ? lng : null,
            name: loc?.name ?? null,
            address: loc?.address ?? loc?.streetAddress ?? null,
          };
        }
      }
      fs.writeFileSync(LOCATION_CACHE_FILE, JSON.stringify(locationCache, null, 2));
    } else {
      fs.writeFileSync(path.join(ROOT, "data", "viator-locations-last-response.json"), JSON.stringify(data, null, 2));
    }

    await sleep(150);
  }
}

function chooseFirstValidCoords(refs) {
  for (const ref of refs) {
    const loc = locationCache[ref];
    if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
      return { lat: loc.lat, lng: loc.lng, source: `locations:${ref}` };
    }
  }
  return null;
}

async function main() {
  let attempted = 0;
  let updated = 0;
  let unresolved = 0;

  for (const it of items) {
    const code = String(it.id ?? "").trim();
    if (!code) continue;

    if (typeof it.lat === "number" && typeof it.lng === "number") continue;

    if (attempted >= MAX_PER_RUN) break;
    attempted++;

    try {
      const product = await getProduct(code);
      const refs = extractLocationRefs(product).filter((r) => r && r.length <= 80);

      if (refs.length) {
        await resolveLocationsBulk(refs);
        const picked = chooseFirstValidCoords(refs);
        if (picked) {
          it.lat = picked.lat;
          it.lng = picked.lng;
          it.viatorLocation = { source: picked.source };
          updated++;
        } else {
          unresolved++;
        }
      } else {
        unresolved++;
      }
    } catch (e) {
      unresolved++;
      console.error("Viator enrich error:", it.title ?? code, e?.message ?? e);
    }

    if (attempted % 25 === 0) {
      console.log(`Progress: attempted ${attempted} | updated ${updated} | unresolved ${unresolved}`);
      fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2));
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| attempted", attempted, "| updated", updated, "| unresolved", unresolved);
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});
