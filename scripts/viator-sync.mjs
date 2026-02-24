import fs from "node:fs";
import path from "node:path";

/**
 * Viator sync for Vercel build
 * - Uses /partner/products/search
 * - Required: filtering.destinationIds
 * - Uses start/count pagination
 * - No sorting field (default server sort)
 * - Writes data/items.json
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

// Env (set these in Vercel)
const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID = Number(process.env.VIATOR_DESTINATION_ID || "511");
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";
const CURRENCY = process.env.VIATOR_CURRENCY || "USD";
const LANGUAGE = process.env.VIATOR_LANGUAGE || "en-US";

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
      "Accept-Language": LANGUAGE,
      Accept: "application/json;version=2.0",
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

async function main() {
  console.log("Viator sync starting");
  console.log("destinationId:", DESTINATION_ID, "| currency:", CURRENCY, "| language:", LANGUAGE);

  const url = "https://api.viator.com/partner/products/search";

  // Keep <= 50 to avoid API constraints
  const count = 50;

  let start = 1;
  const all = [];

  while (true) {
    const body = {
      filtering: {
        destinationIds: [DESTINATION_ID],
      },
      currency: CURRENCY,
      language: LANGUAGE,
      start,
      count,
    };

    const data = await postJson(url, body);

    const products = data?.products || data?.data?.products || data?.items || [];
    if (!Array.isArray(products) || products.length === 0) break;

    for (const p of products) all.push(normalizeProduct(p));

    if (products.length < count) break;

    start += count;

    // safety cap so builds never hang
    if (start > 2000) break;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", all.length);
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});