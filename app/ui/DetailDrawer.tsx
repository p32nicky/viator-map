"use client";

import type { Item } from "@/lib/types";

export default function DetailDrawer({
  item,
  onClose,
}: {
  item: Item | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        top: 12,
        bottom: 12,
        width: 380,
        maxWidth: "calc(100vw - 24px)",
        background: "rgba(255,255,255,0.98)",
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        overflow: "hidden",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, flex: 1 }}>
          {item.title}
        </div>
        <button
          onClick={onClose}
          style={{
            border: "1px solid rgba(0,0,0,0.14)",
            background: "#fff",
            borderRadius: 10,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Close
        </button>
      </div>

      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{
            width: "100%",
            height: 190,
            objectFit: "cover",
            borderTop: "1px solid rgba(0,0,0,0.08)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        />
      ) : null}

      <div style={{ padding: 12, overflowY: "auto" }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
          {(item.category || item.location || "Tour") +
            (item.lat != null && item.lng != null ? " • Has map pin" : " • Opens link")}
        </div>

        <a
          href={item.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            width: "100%",
            textAlign: "center",
            background: "black",
            color: "white",
            padding: "10px 12px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          View on Viator
        </a>

        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
          Affiliate disclosure: if you click and book, you may support this site at no extra cost to you.
        </div>
      </div>
    </div>
  );
}