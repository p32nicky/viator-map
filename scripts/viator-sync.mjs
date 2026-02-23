import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID = process.env.VIATOR_DESTINATION_ID || "511";
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";

if (!API_KEY) {
  console.error("ERROR: VIATOR_API_KEY missing in Vercel env vars.");
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

async function viatorFetch(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      "Accept-Language": "en-US",
      "Content-Type": "application/json",
      // v2 header:
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

function normalizeProduct(p) {
  const id = p?.productCode ?? p?.code ?? p?.id;
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

  const affiliateUrl = p?.productUrl || p?.bookingUrl || p?.url || "";

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
  console.log("Sync starting. destinationId:", DESTINATION_ID);

  const url = "https://api.viator.com/partner/products/search";
  const pageSize = 200;

  let page = 1;
  const all = [];

  while (true) {
    const data = await viatorFetch(url, {
      method: "POST",
      body: {
        destinationId: Number(DESTINATION_ID),
        page,
        count: pageSize,
      },
    });

    const products = data?.products || data?.data?.products || data?.items || [];
    if (!Array.isArray(products) || products.length === 0) break;

    for (const p of products) all.push(normalizeProduct(p));

    if (products.length < pageSize) break;
    page += 1;

    if (page > 50) break; // safety cap
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", all.length);
}

main().catch((e) => {
  console.error("FAIL:", e?.message ?? e);
  process.exit(1);
});