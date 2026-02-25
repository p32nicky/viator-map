import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const IN_CSV = path.join(DATA_DIR, "rome_all_tours_with_images_lat_lng.csv");
const OUT_JSON = path.join(DATA_DIR, "items.json");

function parseCSVLine(line) {
  // Minimal CSV parser that handles quoted commas
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function toNum(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function main() {
  if (!fs.existsSync(IN_CSV)) {
    console.error(`ERROR: Missing CSV at ${IN_CSV}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(IN_CSV, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    console.error("ERROR: CSV has no data rows.");
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]).map((h) => h.trim());
  const idx = (name) => header.indexOf(name);

  const iLocation = idx("Location");
  const iTitle = idx("Title");
  const iCode = idx("Product Code");
  const iLat = idx("Latitude");
  const iLng = idx("Longitude");
  const iImg = idx("Image URL");
  const iUrl = idx("Affiliate URL");

  const missing = [];
  for (const [n, i] of [
    ["Title", iTitle],
    ["Product Code", iCode],
    ["Latitude", iLat],
    ["Longitude", iLng],
    ["Image URL", iImg],
    ["Affiliate URL", iUrl],
  ]) {
    if (i === -1) missing.push(n);
  }
  if (missing.length) {
    console.error("ERROR: CSV missing columns:", missing.join(", "));
    console.error("Found columns:", header.join(", "));
    process.exit(1);
  }

  const items = [];
  const seen = new Set();

  for (let r = 1; r < lines.length; r++) {
    const cols = parseCSVLine(lines[r]);

    const title = cols[iTitle]?.trim() || "";
    const productCode = cols[iCode]?.trim() || "";
    const affiliateUrl = cols[iUrl]?.trim() || "";
    const imageUrl = cols[iImg]?.trim() || "";
    const lat = toNum(cols[iLat]);
    const lng = toNum(cols[iLng]);
    const location = iLocation !== -1 ? (cols[iLocation]?.trim() || "Rome") : "Rome";

    if (!title || !affiliateUrl) continue;

    const id = productCode || `${slugify(title)}-${r}`;
    if (seen.has(id)) continue;
    seen.add(id);

    items.push({
      id,
      title,
      location,
      productCode: productCode || null,
      imageUrl: imageUrl || null,
      affiliateUrl,
      lat,
      lng,
    });
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(items, null, 2));
  console.log(`DONE. Wrote ${OUT_JSON} | items: ${items.length}`);
}

main();