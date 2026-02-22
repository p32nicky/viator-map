"use client";

type Item = {
  id: number | string;
  title: string;
  imageUrl: string;
  affiliateUrl: string;
  category: string;
  lat?: number | null;
  lng?: number | null;
  landmark?: string | null;
};

export default function DetailDrawer({ item, onClose }: { item: Item | null; onClose: () => void }) {
  if (!item) return null;

  return (
    <div className="drawer">
      <div className="drawerHeader">
        <div>
          <div className="drawerTitle">{item.title}</div>
          <div className="drawerMeta">
            {item.category}
            {item.landmark ? ` • ${item.landmark}` : ""}
          </div>
        </div>
        <button onClick={onClose} className="btn">Close</button>
      </div>

      <div className="drawerBody">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="drawerImg" src={item.imageUrl} alt={item.title} loading="lazy" />
        ) : null}

        <a
          className="cta"
          href={item.affiliateUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
        >
          View on Viator
        </a>

        <div className="note">Tip: always double-check details on the provider page before booking.</div>
      </div>
    </div>
  );
}
