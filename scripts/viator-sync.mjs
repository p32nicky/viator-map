import fs from "node:fs";
import path from "node:path";

/**
 * Viator products search sync (Vercel-safe)
 * - Endpoint: https://api.viator.com/partner/products/search
 * - Body shape matches Viator /products/search example:
 *   { filtering: { destination: "511" }, pagination: { start, count }, currency }
 * - Writes data/items.json
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

// Env (set in Vercel)
const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID = process.env.VIATOR_DESTINATION_ID || "511"; // must be string in filtering.destination
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";
const CURRENCY = process.env.VIATOR_CURRENCY || "USD";
const LANGUAGE = process.env.VIATOR_LANGUAGE || "en-US"; // optional

if (!API_KEY) {
  console.error("ERROR: VIATOR_API_KEY missing (set in Vercel Environment Variables).");
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json;version=2.0",
      "Accept-Language": LANGUAGE,
      "exp-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Viator API ${res.status} @ ${url}: ${text.slice(0, 2000)}`);
  }
  return text ? JSON.parse(text) : {};
}

function normalizeProduct(p) {
  const id = p?.productCode ?? p?.code ?? p?.id ?? null;

  const imageUrl =
    p?.images?.[0]?.variants?.[0]?.url ||
    p?.images?.[0]?.url ||
    p?.primaryImageUrl ||
    "";

  const lat = p?.location?.lat ?? p?.location?.latitude ?? p?.latitude ?? p?.lat ?? null;
  const lng = p?.location?.lng ?? p?.location?.longitude ?? p?.longitude ?? p?.lng ?? null;

  return {
    id,
    title: p?.title ?? p?.name ?? "",
    category: p?.primaryCategoryName ?? p?.category ?? "Rome",
    imageUrl,
    affiliateUrl: p?.productUrl || p?.bookingUrl || p?.url || "",
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    campaign: CAMPAIGN,
  };
}

function extractProducts(data) {
  return data?.products || data?.data?.products || data?.items || [];
}

async function main() {
  console.log("Viator sync starting");
  console.log("destination:", DESTINATION_ID, "| currency:", CURRENCY);

  const url = "https://api.viator.com/partner/products/search";

  // Viator search endpoints commonly cap results per request; 50 is safe.
  const pageSize = 50;

  let start = 1;
  const all = [];

  while (true) {
    // IMPORTANT: matches Viator example shape: filtering.destination + pagination.start/count :contentReference[oaicite:1]{index=1}
    const body = {
      filtering: {
        destination: String(DESTINATION_ID),
      },
      pagination: {
        start,
        count: pageSize,
      },
      currency: CURRENCY,

      // OPTIONAL: if you later want sorting, it must be an object like:
      // sorting: { sort: "DEFAULT" }
      // or sorting: { sort: "PRICE", order: "ASCENDING" }
      // (leave it out for now)
    };

    const data = await postJson(url, body);
    const products = extractProducts(data);

    if (!Array.isArray(products) || products.length === 0) break;

    for (const p of products) all.push(normalizeProduct(p));

    if (products.length < pageSize) break;
    start += pageSize;

    // safety cap so Vercel builds never hang
    if (start > 2000) break;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", all.length);
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});