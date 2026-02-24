import fs from "node:fs";
import path from "node:path";

/**
 * Viator sync for Vercel build
 * - Endpoint: /partner/products/search
 * - Handles schema differences by trying multiple payload shapes automatically
 * - Writes data/items.json
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(DATA_DIR, "items.json");

// Vercel env vars
const API_KEY = process.env.VIATOR_API_KEY;
const DESTINATION_ID_RAW = process.env.VIATOR_DESTINATION_ID || "511";
const DESTINATION_ID = Number(DESTINATION_ID_RAW);
const CAMPAIGN = process.env.VIATOR_CAMPAIGN || "rome_map";
const CURRENCY = process.env.VIATOR_CURRENCY || "USD";
const LANGUAGE = process.env.VIATOR_LANGUAGE || "en-US";

if (!API_KEY) {
  console.error("ERROR: VIATOR_API_KEY missing (set in Vercel Environment Variables).");
  process.exit(1);
}
if (!Number.isFinite(DESTINATION_ID)) {
  console.error(`ERROR: VIATOR_DESTINATION_ID must be a number. Got: "${DESTINATION_ID_RAW}"`);
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
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }
    const msg = parsed?.message || parsed?.error?.message || text || `HTTP ${res.status}`;
    const err = new Error(`Viator API ${res.status} @ ${url}: ${msg}`);
    err.status = res.status;
    err.raw = text;
    err.parsed = parsed;
    throw err;
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

/**
 * Different accounts expect different "destination" formats.
 * We'll try these in order until one works:
 *  A) filtering.destinationIds (you hit "Missing filtering" before, so include it)
 *  B) destinationId at root (you hit "Missing destination", so include it)
 *  C) destination object
 *  D) BOTH filtering + destinationId (belt & suspenders)
 */
function destinationShapes() {
  return [
    {
      name: "A_filtering_destinationIds",
      build: () => ({
        filtering: { destinationIds: [DESTINATION_ID] },
      }),
    },
    {
      name: "B_root_destinationId",
      build: () => ({
        destinationId: DESTINATION_ID,
      }),
    },
    {
      name: "C_destination_object",
      build: () => ({
        destination: { destinationId: DESTINATION_ID },
      }),
    },
    {
      name: "D_filtering_plus_root_destinationId",
      build: () => ({
        filtering: { destinationIds: [DESTINATION_ID] },
        destinationId: DESTINATION_ID,
      }),
    },
  ];
}

/**
 * Some schemas use start/count, others page/count.
 * We support both and choose the one that succeeds first.
 */
function buildBase({ count }) {
  return {
    currency: CURRENCY,
    language: LANGUAGE,
    count,
  };
}

function extractProducts(data) {
  return data?.products || data?.data?.products || data?.items || [];
}

async function tryOneRequest({ shapeName, body }) {
  const url = "https://api.viator.com/partner/products/search";
  const data = await postJson(url, body);
  const products = extractProducts(data);
  if (!Array.isArray(products)) return { ok: false, data, products: [] };
  return { ok: true, data, products };
}

async function detectWorkingSchema() {
  const count = 50;

  for (const shape of destinationShapes()) {
    // Try start/count first
    const bodyStart = {
      ...buildBase({ count }),
      ...shape.build(),
      start: 1,
    };

    try {
      const r = await tryOneRequest({ shapeName: shape.name, body: bodyStart });
      if (r.ok) return { shapeName: shape.name, mode: "start", count };
    } catch (e) {
      // continue
    }

    // Then try page/count
    const bodyPage = {
      ...buildBase({ count }),
      ...shape.build(),
      page: 1,
    };

    try {
      const r = await tryOneRequest({ shapeName: shape.name, body: bodyPage });
      if (r.ok) return { shapeName: shape.name, mode: "page", count };
    } catch (e) {
      // continue
    }
  }

  throw new Error(
    "Could not find a working request schema for /partner/products/search with this account. (Tried filtering, destinationId, destination object, and both; with start/page pagination.)"
  );
}

async function main() {
  console.log("Viator sync starting");
  console.log("destinationId:", DESTINATION_ID, "| currency:", CURRENCY, "| language:", LANGUAGE);

  const { shapeName, mode, count } = await detectWorkingSchema();
  console.log("Using schema:", shapeName, "| pagination:", mode, "| count:", count);

  const shape = destinationShapes().find((s) => s.name === shapeName);
  const url = "https://api.viator.com/partner/products/search";

  const all = [];

  if (mode === "start") {
    let start = 1;

    while (true) {
      const body = {
        ...buildBase({ count }),
        ...shape.build(),
        start,
      };

      const data = await postJson(url, body);
      const products = extractProducts(data);
      if (!Array.isArray(products) || products.length === 0) break;

      for (const p of products) all.push(normalizeProduct(p));

      if (products.length < count) break;
      start += count;

      if (start > 2000) break; // safety cap
    }
  } else {
    let page = 1;

    while (true) {
      const body = {
        ...buildBase({ count }),
        ...shape.build(),
        page,
      };

      const data = await postJson(url, body);
      const products = extractProducts(data);
      if (!Array.isArray(products) || products.length === 0) break;

      for (const p of products) all.push(normalizeProduct(p));

      if (products.length < count) break;
      page += 1;

      if (page > 50) break; // safety cap
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log("DONE. Wrote", OUT_FILE, "| items:", all.length);
}

main().catch((err) => {
  console.error("FAIL:", err?.message || err);
  process.exit(1);
});