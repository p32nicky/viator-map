"use client";

type Item = {
  id: string | number;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
  landmark?: string | null;
};

function hasCoords(it: Item) {
  return typeof it.lat === "number" && typeof it.lng === "number";
}

export default function SidebarList({
  items,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  counts,
}: {
  items: Item[];
  selectedId: Item["id"] | null;
  query: string;
  onQueryChange: (v: string) => void;
  onSelect: (item: Item) => void;
  counts: { total: number; onMap: number; noPin: number };
}) {
  return (
    <aside
      style={{
        borderRight: "1px solid rgba(0,0,0,0.12)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "white",
      }}
    >
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 850, fontSize: 18 }}>Rome Map</div>

        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search tours, Vatican, Colosseum…"
          style={{
            width: "100%",
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.18)",
            outline: "none",
          }}
        />

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Showing <strong>{counts.total.toLocaleString()}</strong> • On map{" "}
          <strong>{counts.onMap.toLocaleString()}</strong> • No pin{" "}
          <strong>{counts.noPin.toLocaleString()}</strong>
        </div>
      </div>

      <div style={{ overflow: "auto", padding: "0 10px 14px" }}>
        {items.map((it) => {
          const selected = selectedId !== null && String(selectedId) === String(it.id);
          const pinned = hasCoords(it);

          return (
            <button
              key={String(it.id)}
              onClick={() => onSelect(it)}
              style={{
                width: "100%",
                textAlign: "left",
                background: selected ? "rgba(0,0,0,0.06)" : "white",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 16,
                padding: 12,
                marginBottom: 10,
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{it.title}</div>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                {it.category}
                {it.landmark ? ` • ${it.landmark}` : ""}
              </div>

              {!pinned ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "inline-flex",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.18)",
                    background: "rgba(255, 230, 0, 0.20)",
                  }}
                >
                  No map pin (opens link)
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}