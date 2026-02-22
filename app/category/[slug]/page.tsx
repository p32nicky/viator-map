import Link from "next/link";
import { readItems, slugifyCategory, unslugifyCategory } from "@/lib/data";

export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const items = readItems();
  const category = unslugifyCategory(params.slug, items);
  return {
    title: `${category} in Rome | Things To Do Map`,
    description: `Browse ${category} experiences in Rome. Search, explore, and open the Viator booking page.`,
  };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const items = readItems();
  const category = unslugifyCategory(params.slug, items);
  const list = items.filter((i) => i.category === category);

  return (
    <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, margin: "0 0 10px", fontWeight: 800 }}>{category} in Rome</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>
        {list.length.toLocaleString()} results • <Link href="/" style={{ textDecoration: "underline" }}>Back to map</Link>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
        {list.slice(0, 200).map((it) => (
          <Link
            key={String(it.id)}
            href={`/item/${encodeURIComponent(String(it.id))}`}
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 18,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
              background: "white",
            }}
          >
            <div style={{ fontWeight: 750, lineHeight: 1.25 }}>{it.title}</div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>View details</div>
          </Link>
        ))}
      </div>

      <p style={{ marginTop: 18, fontSize: 12, opacity: 0.65 }}>
        Showing up to 200 items per category page to keep it fast. Use the map search for full results.
      </p>
    </main>
  );
}
