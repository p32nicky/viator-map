export const runtime = "nodejs";

export const metadata = {
  title: "Affiliate Disclosure | Rome Things To Do Map",
  description: "Affiliate disclosure for Rome Things To Do Map.",
};

export default function DisclosurePage() {
  return (
    <main style={{ padding: 18, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, margin: "0 0 12px", fontWeight: 850 }}>
        Affiliate Disclosure
      </h1>

      <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.6 }}>
        Some links on this website are affiliate links. That means if you click a
        link and make a purchase or booking, we may earn a commission at no extra
        cost to you.
      </p>

      <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
        We only share experiences and services that we believe may be useful.
        Prices, availability, and terms are provided by the merchant and may
        change. Please verify all details directly on the booking page before
        purchasing.
      </p>

      <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
        As an affiliate, we may receive compensation for referring customers via
        these links. This helps support the site.
      </p>

      <p style={{ marginTop: 18, fontSize: 12, opacity: 0.65 }}>
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </main>
  );
}