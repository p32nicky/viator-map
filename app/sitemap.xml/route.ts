import { readItems, slugifyCategory, uniqueCategories } from "@/lib/data";

export const runtime = "nodejs";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const items = readItems();
  const categories = uniqueCategories(items);

  // Keep sitemap reasonable: cap item URLs (search engines still discover from internal links)
  const itemUrls = items.slice(0, 5000).map((it) => `${origin}/item/${encodeURIComponent(String(it.id))}`);
  const catUrls = categories.map((c) => `${origin}/category/${slugifyCategory(c)}`);

  const urls = [ `${origin}/`, ...catUrls, ...itemUrls ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map((u) => `<url><loc>${esc(u)}</loc></url>`)
      .join("") +
    `</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
