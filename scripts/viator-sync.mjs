/**
 * Viator nightly sync script (Option B) — Basic Access (Affiliate).
 *
 * IMPORTANT:
 * - This script runs with plain Node, so it loads .env.local via dotenv.
 * - To avoid the taxonomy endpoint 404 issue, you can hardcode Rome's destination ID:
 *     VIATOR_DESTINATION_ID=511
 *   (Rome is d511 on viator.com)
 *
 * ENV (.env.local in project root):
 *   VIATOR_API_KEY=...
 *   VIATOR_DESTINATION_ID=511              (recommended)
 *   VIATOR_CAMPAIGN=rome_map              (optional)
 *
 * Optional (only used if DESTINATION_ID is not provided):
 *   VIATOR_DESTINATION_NAME=Rome
 *   VIATOR_DESTINATION_COUNTRY=Italy
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import path from "node:path";

// Load .env.local locally, but don't require it (Vercel uses real env vars)
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");
const DEST_CACHE = path.join(DATA_DIR, "viator-destinations-cache.json");

const API_KEY = process.env.VIATOR_API_KEY;
const DEST_ID_ENV = process.env.VIATOR_DESTINATION_ID;
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";
const DEST_NAME = process.env.VIATOR_DESTINATION_NAME || "Rome";
const DEST_COUNTRY = process.env.VIATOR_DESTINATION_COUNTRY || "";

if (!API_KEY) {
  console.error("ERROR: VIATOR_API_KEY missing. Put it in .env.local (project root).");
  process.exit(1);
}

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function daysBetween(aMs, bMs) {
  return Math.abs(aMs - bMs) / (1000 * 60 * 60 * 24);
}

/**
 * Viator API fetch helper.
 * For v2 endpoints we use Accept version 2.0 (per Viator Golden Path examples).
 * For legacy v1 taxonomy endpoints we omit the versioned Accept header to avoid 404s on some accounts.
 */
async function viatorFetch(url, { method = "GET", body, acceptVersion2 = true } = {}) {
  const headers = {
    "Accept-Language": "en-US",
    "Content-Type": "application/json",
    "exp-api-key": API_KEY,
  };
  if (acceptVersion2) headers["Accept"] = "application/json;version=2.0";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Viator API ${res.status} @ ${url}: ${text.slice(0, 2000)}`);
  }
  return res.json();
}

function normalizeImage(p) {
  const imgs = Array.isArray(p?.images) ? p.images : [];
  const cover = imgs.find((img) => img?.isCover) || imgs[0];
  const variants = Array.isArray(cover?.variants) ? cover.variants : [];
  const v =
    variants.find((x) => (x?.width ?? 0) >= 400) ||
    variants.find((x) => (x?.width ?? 0) >= 200) ||
    variants[0];

  return v?.url ?? "";
}

function appendCampaign(url) {
  if (!url) return url;
  if (/[?&]campaign=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "campaign=" + encodeURIComponent(CAMPAIGN);
}

async function fetchAllProducts(destinationId) {
  const all = [];
  const count = 50;
  let start = 1;

  while (true) {
    const body = {
  filtering: { destination: String(destinationId) },
  pagination: { start, count },
  currency: "USD",
};

    // v2 endpoint + headers (per Golden Path)
    const data = await viatorFetch("https://api.viator.com/partner/products/search", {
      method: "POST",
      body,
      acceptVersion2: true,
    });

    const products = data?.products ?? data?.data?.products ?? [];

    if (!Array.isArray(products)) {
      throw new Error("Unexpected /products/search response shape. Could not find products array.");
    }

    all.push(...products);

    if (products.length < count) break;
    start += count;
    console.log(`Fetched ${all.length} products so far...`);
  }

  return all;
}

/**
 * Optional: destination lookup (legacy). If it 404s for you, just set VIATOR_DESTINATION_ID=511.
 */
async function getDestinationIdViaTaxonomy() {
  // Cache weekly
  if (fs.existsSync(DEST_CACHE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(DEST_CACHE, "utf8"));
      if (cached?.fetchedAt && Array.isArray(cached?.destinations)) {
        const ageDays = daysBetween(Date.now(), new Date(cached.fetchedAt).getTime());
        if (ageDays < 7) return pickDestinationId(cached.destinations);
      }
    } catch {}
  }

  const candidates = [
    // Some accounts expect the legacy endpoint WITHOUT /partner prefix
    "https://api.viator.com/v1/taxonomy/destinations",
    // Others expect it with /partner
    "https://api.viator.com/partner/v1/taxonomy/destinations",
  ];

  let lastErr = null;

  for (const url of candidates) {
    try {
      // For legacy v1 taxonomy, omit versioned Accept header.
      const data = await viatorFetch(url, { acceptVersion2: false });
      const destinations =
        data?.data?.destinations || data?.destinations || data?.data || data;

      if (!Array.isArray(destinations)) throw new Error("Destinations response not an array");

      fs.writeFileSync(
        DEST_CACHE,
        JSON.stringify({ fetchedAt: new Date().toISOString(), destinations }, null, 2)
      );

      return pickDestinationId(destinations);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Could not retrieve destinations.");
}

function pickDestinationId(destinations) {
  const name = DEST_NAME.toLowerCase();
  const country = DEST_COUNTRY.toLowerCase();

  const scored = destinations
    .map((d) => {
      const dName = String(d?.destinationName ?? d?.name ?? "").toLowerCase();
      const parent = String(d?.parentDestinationName ?? d?.parentName ?? d?.parent ?? "").toLowerCase();
      const destId = String(d?.destinationId ?? d?.destinationID ?? d?.id ?? d?.lookupId ?? "");

      let score = 0;
      if (dName === name) score += 100;
      if (dName.includes(name)) score += 40;
      if (country && (parent.includes(country) || dName.includes(country))) score += 25;

      const dtype = String(d?.destinationType ?? "").toLowerCase();
      if (dtype.includes("city")) score += 15;

      return { score, destId, dName, parent };
    })
    .filter((x) => x.score > 0 && x.destId);

  scored.sort((a, b) => b.score - a.score);

  if (!scored.length) {
    throw new Error(
      `Could not find destinationId for "${DEST_NAME}". Easiest fix: set VIATOR_DESTINATION_ID=511 in .env.local (Rome is d511 on viator.com).`
    );
  }

  return scored[0].destId;
}

async function main() {
  const destinationId = DEST_ID_ENV
    ? String(DEST_ID_ENV).trim()
    : await getDestinationIdViaTaxonomy();

  console.log("Using destinationId:", destinationId);

  const products = await fetchAllProducts(destinationId);

  const items = products.map((p) => ({
    id: p?.productCode ?? p?.id,
    title: p?.title ?? "",
    imageUrl: normalizeImage(p),
    affiliateUrl: appendCampaign(p?.productUrl ?? ""),
    category: "Tours",
    // Preview results often don't include precise coords for every product:
    lat: typeof p?.location?.lat === "number" ? p.location.lat : null,
    lng: typeof p?.location?.lng === "number" ? p.location.lng : null,
  }));

  fs.writeFileSync(OUT_FILE, JSON.stringify(items, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", items.length);
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});
