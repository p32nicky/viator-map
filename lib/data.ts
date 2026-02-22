import fs from "node:fs";
import path from "node:path";

export type Item = {
  id: string | number;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
  landmark?: string | null;
};

function readJsonIfExists(p: string): any[] | null {
  try {
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function readItems(): Item[] {
  const root = process.cwd();
  const geo = path.join(root, "data", "items.geo.json");
  const raw = path.join(root, "data", "items.json");

  const geoItems = readJsonIfExists(geo);
  if (geoItems && geoItems.length) return geoItems as Item[];

  const rawItems = readJsonIfExists(raw);
  return (rawItems ?? []) as Item[];
}

export function slugifyCategory(cat: string): string {
  return cat
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function unslugifyCategory(slug: string, items: Item[]): string {
  // Find best category match from items by slug
  const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
  const map = new Map(cats.map(c => [slugifyCategory(c), c]));
  return map.get(slug) ?? slug;
}

export function uniqueCategories(items: Item[]): string[] {
  return Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort();
}
