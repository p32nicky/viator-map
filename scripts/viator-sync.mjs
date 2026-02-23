import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

// --- ENV (Vercel injects these) ---
const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID = process.env.VIATOR_DESTINATION_ID || "511";
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";

// Safety checks
if (!API_KEY) {
  console.error(
    "ERROR: VIATOR_API_KEY missing. Add it in Vercel → Project → Settings → Environment Variables."
  );
  process.exit(1);
}
if (!DESTINATION_ID) {
  console.error(
    "ERROR: VIATOR_DESTINATION_ID missing. Add it in Vercel → Project → Settings → Environment Variables."
  );
  process.exit(1);
}

// Ensure data dir exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Helper: Viator fetch (v2)
async function viatorFetch(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Accept-Language": "en-US",
      "Content-Type": "application/json",
      // IMPORTANT: v2 header format
      Accept: "application/json;version=2.0",
      "exp-api-key": API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Viator API ${res.status} @ ${url}: ${text.slice(0, 2000)}`);
  }
  return text ? JSON.parse(text) : null;
}

// Normalize items to what your UI expects
function normalizeProduct(p) {
  const id = p?.productCode ?? p?.product_code ?? p?.code ?? p?.id;
  const title = p?.title ?? p?.name ?? "";
  const imageUrl =
    p?.images?.[0]?.variants?.[0]?.url ||
    p?.images?.[0]?.url ||
    p?.primaryImageUrl ||
    "";
  const lat =
    p?.location?.lat ??
    p?.location?.latitude ??
    p?.latitude ??
    p?.lat ??
    null;
  const lng =
    p?.location?.lng ??
    p?.location?.longitude ??
    p?.longitude ??
    p?.lng ??
    null;

  // Prefer booking / product url if provided, else fall back to what you already use
  const baseUrl =
    p?.productUrl || p?.bookingUrl || p?.url || "";

  // If your previous pipeline already appended PID/MCID/campaign, keep doing it.
  // If baseUrl is already your affiliate link, we keep it as-is.
  const affiliateUrl = baseUrl;

  return {
    id,
    title,
    category: p?.category ?? p?.primaryCategoryName ?? "Rome",
    imageUrl,
    affiliateUrl,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    campaign: CAMPAIGN,
  };
}

async function main() {
  console.log("Using destinationId:", DESTINATION_ID);

  // NOTE: This endpoint path matches what was working for you earlier.
  // If your working script uses /partner/products/search (v2), keep that.
  const url = "https://api.viator.com/partner/products/search";

  // Minimal request; adjust fields if your earlier working script used different payload
  const payload = {
    destinationId: Number(DESTINATION_ID),
    // Keep it simple for Vercel build stability; you can add filters later.
    // sortOrder / sortField can be omitted to avoid 400 errors.
    page: 1,
    count: 200, // change if you need more per page
  };

  const all = [];
  let page = 1;

  while (true) {
    const data = await viatorFetch(url, { method: "POST", body: { ...payload, page } });

    const products =
      data?.products ||
      data?.data?.products ||
      data?.items ||
      [];

    if (!Array.isArray(products) || products.length === 0) break;

    for (const p of products) all.push(normalizeProduct(p));

    // Stop if fewer than requested (no more pages)
    if (products.length < payload.count) break;

    page += 1;

    // Hard safety cap to avoid infinite loops in build
    if (page > 50) break;
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", all.length);
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});