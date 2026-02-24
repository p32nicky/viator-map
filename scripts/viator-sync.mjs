import fs from "node:fs";
import path from "node:path";

/**
 * Viator sync for Next.js / Vercel
 * - Calls /partner/products/search
 * - Includes currency + language
 * - Uses new "filtering" payload shape, with fallback to legacy payload shape
 * - Writes data/items.json
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

// Env
const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID = process.env.VIATOR_DESTINATION_ID || "511";
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
    // Keep the raw body for debugging / fallback logic
    const err = new Error(`Viator API ${res.status} @ ${url}: ${text.slice(0, 2000)}`);
    err.status = res.status;
    err.bodyText = text;
    throw err;
  }

  return text ? JSON.parse(text) : {};
}

// Normalize product into your UI item shape
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

/**
 * Some Viator accounts/environments expect:
 *   { filtering: { destinationId }, currency, language, page, count }
 * Others expect older:
 *   { destinationId, currency, language, page, count }
 *
 * We try the NEW one first. If Viator rejects it, we fallback.
 */
async function productsSearch({ page, count }) {
  const url = "https://api.viator.com/partner/products/search";

  const newPayload = {
    filtering: {
      destinationId: Number(DESTINATION_ID),
    },
    currency: CURRENCY,
    language: LANGUAGE,
    page,
    count,
  };

  try {
    return await postJson(url, newPayload);
  } catch (e) {
    const msg = String(e?.bodyText || e?.message || "");

    // Only fallback on schema-ish 400s
    const shouldFallback =
      (e?.status === 400) &&
      (
        msg.includes("Missing filtering") ||
        msg.includes("Unrecognized field") ||
        msg.includes("Unknown") ||
        msg.includes("BAD_REQUEST")
      );

    if (!shouldFallback) throw e;

    const legacyPayload = {
      destinationId: Number(DESTINATION_ID),
      currency: CURRENCY,
      language: LANGUAGE,
      page,
      count,
    };

    return await postJson(url, legacyPayload);
  }
}

async function main() {
  console.log("Viator sync starting");
  console.log("destinationId:", DESTINATION_ID, "| currency:", CURRENCY, "| language:", LANGUAGE);

  const pageSize = 200;
  let page = 1;

  const all = [];

  while (true) {
    const data = await productsSearch({ page, count: pageSize });

    const products = data?.products || data?.data?.products || data?.items || [];
    if (!Array.isArray(products) || products.length === 0) break;

    for (const p of products) all.push(normalizeProduct(p));

    if (products.length < pageSize) break;
    page += 1;

    // Safety cap so Vercel builds never hang
    if (page > 50) break;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", all.length);
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});