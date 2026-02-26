"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { Item } from "@/lib/types";

export default function SidebarList({
  items,
  onSelect,
  selectedId,
}: {
  items: Item[];
  onSelect: (item: Item) => void;
  selectedId: Item["id"] | null;
}) {
  const [query, setQuery] = useState("");

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ["title", "category", "location"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return fuse.search(q).map((r) => r.item);
  }, [items, fuse, query]);

  return (
    <aside
      style={{
        width: 360,
        borderRight: "1px solid rgba(0,0,0,0.12)",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
      }}
    >
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Rome tours</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tours..."
          style={{
            marginTop: 10,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            outline: "none",
          }}
        />
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Showing {filtered.length.toLocaleString()} of{" "}
          {items.length.toLocaleString()}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {filtered.map((item) => {
          const isSelected = selectedId != null && String(item.id) === String(selectedId);

          const subtitle =
            item.category || item.location || "Tour";

          return (
            <button
              key={String(item.id)}
              onClick={() => onSelect(item)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                gap: 10,
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.10)",
                background: isSelected ? "rgba(0,0,0,0.06)" : "#fff",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  flex: "0 0 auto",
                  background: "rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  opacity: 0.8,
                }}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  "No image"
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1.25,
                    marginBottom: 4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitle}</div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>
                  {item.lat != null && item.lng != null ? "Has map pin" : "Opens link"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}