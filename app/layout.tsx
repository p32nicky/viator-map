import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Rome Things To Do Map",
  description: "Map + searchable list of things to do in Rome",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
  
  <a
  href="/disclosure"
  style={{
    position: "fixed",
    right: 14,
    bottom: 14,
    zIndex: 9999,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    textDecoration: "none",
    color: "black",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
  }}
  rel="nofollow"
>
  Affiliate Disclosure
</a>
}
