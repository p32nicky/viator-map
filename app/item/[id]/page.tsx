import Link from "next/link";
import { readItems } from "@/lib/data";

export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const items = readItems();
  const it = items.find((x) => String(x.id) === params.id);
  return {
    title: it ? `${it.title} | Rome Things To Do` : "Experience | Rome Things To Do",
    description: it
      ? `View details and open the booking page for: ${it.title}`
      : "View experience details and open the booking page.",
  };
}

export default function ItemPage({ params }: { params: { id: string } }) {
  const items = readItems();
  const it = items.find((x) => String(x.id) === params.id);

  if (!it) {
    return (
      <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, margin: 0, fontWeight: 800 }}>Not found</h1>
        <p style={{ opacity: 0.75 }}>
          This item wasn’t found. <Link href="/" style={{ textDecoration: "underline" }}>Back to map</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 18, maxWidth: 980, margin: "0 auto" }}>
      <p style={{ margin: 0, opacity: 0.75 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>Back to map</Link>
      </p>
      <h1 style={{ fontSize: 28, margin: "10px 0 12px", fontWeight: 850 }}>{it.title}</h1>

      {it.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={it.imageUrl}
          alt={it.title}
          style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 20, border: "1px solid rgba(0,0,0,0.12)" }}
          loading="lazy"
        />
      ) : null}

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href={it.affiliateUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 14px",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.16)",
            textDecoration: "none",
            color: "black",
            fontWeight: 750,
          }}
        >
          Open booking page
        </a>

        <span style={{ alignSelf: "center", fontSize: 12, opacity: 0.7 }}>
          Category: <strong>{it.category}</strong>
        </span>
      </div>

      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>
        Tip: verify meeting point, inclusions, and cancellation policy on the provider page before booking.
      </p>
    </main>
  );
}
