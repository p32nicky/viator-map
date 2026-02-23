import fs from "node:fs";
import path from "node:path";

/**
 * VERCEL-SAFE VIATOR SYNC
 * - NO taxonomy calls
 * - v2 products search only
 * - requires currency + language
 * - writes data/items.json at build time
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

// ---- ENV (provided by Vercel) ----
const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID = process.env.VIATOR_DESTINATION_ID || "511";
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";
const CURRENCY = process.env.VIATOR_CURRENCY || "USD";
const LANGUAGE = process.env.VIATOR_LANGUAGE || "en-US";

// ---- SAFETY CHECKS ----
if (!API_KEY) {
  console.error("ERROR: VIATOR_API_KEY missing (set in Vercel Environment Variables)");
  process.exit(1);
}

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- VIATOR FETCH (v2 ONLY) ----
async function viatorFetch(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": LANGUAGE,
      "Accept": "application/json;version=2.0",
      "exp-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `Viator API ${res.status} @ ${url}: ${text.slice(0, 2000)}`
    );
  }

  return JSON.parse(text);
}

// ---- NORMALIZE PRODUCT FOR MAP/UI ----
function normalizeProduct(p) {
  const id = p.productCode || p.code || p.id;

  const imageUrl =
    p.images?.[0]?.variants?.[0]?.url ||
    p.images?.[0]?.url ||
    p.primaryImageUrl ||
    "";

  const lat =
    p.location?.lat ??
    p.location?.latitude ??
    p.latitude ??
    null;

  const lng =
    p.location?.lng ??
    p.location?.longitude ??
    p.longitude ??
    null;

  return {
    id,
    title: p.title || p.name || "",
    category: p.primaryCategoryName || "Rome",
    imageUrl,
    affiliateUrl: p.productUrl || p.bookingUrl || p.url || "",
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    campaign: CAMPAIGN,
  };
}

// ---- MAIN SYNC ----
async function main() {
  console.log("Viator sync starting");
  console.log("Destination:", DESTINATION_ID);
  console.log("Currency:", CURRENCY);

  const url = "https://api.viator.com/partner/products/search";
  const pageSize = 200;

  let page = 1;
  const allItems = [];

  while (true) {
    const payload = {
      destinationId: Number(DESTINATION_ID),
      page,
      count: pageSize,
      currency: CURRENCY,
      language: LANGUAGE,
    };

    const data = await viatorFetch(url, payload);

    const products =
      data.products ||
      data.data?.products ||
      data.items ||
      [];

    if (!Array.isArray(products) || products.length === 0) break;

    for (const p of products) {
      allItems.push(normalizeProduct(p));
    }

    if (products.length < pageSize) break;
    page++;

    // Safety cap so builds never hang
    if (page > 50) break;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allItems, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", allItems.length);
}

// ---- RUN ----
main().catch((err) => {
  console.error("FAIL:", err.message || err);
  process.exit(1);
});