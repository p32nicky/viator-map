import { NextResponse } from "next/server";

export const runtime = "nodejs"; // keep server-side

type ViatorSearchBody = {
  filtering: {
    destination: string; // e.g. "77" (example from Viator docs)
  };
  sorting?: { sort: string; order: string };
  pagination?: { start: number; count: number };
  currency?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.VIATOR_API_KEY;
  const campaign = process.env.VIATOR_CAMPAIGN || "rome_map";

  if (!apiKey) {
    return NextResponse.json({ error: "Missing VIATOR_API_KEY" }, { status: 500 });
  }

  const body = (await req.json()) as ViatorSearchBody;

  const res = await fetch("https://api.viator.com/partner/products/search", {
    method: "POST",
    headers: {
      "Accept-Language": "en-US",
      "Content-Type": "application/json",
      // Viator example uses this header name:
      "exp-api-key": apiKey, // :contentReference[oaicite:1]{index=1}
      // Viator example uses versioned accept header:
      "Accept": "application/json;version=2.0", // :contentReference[oaicite:2]{index=2}
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Viator API error ${res.status}`, details: text.slice(0, 2000) },
      { status: 500 }
    );
  }

  const data = await res.json();

  // Normalize items for your map/list.
  // Viator returns productUrl already containing mcid/pid/medium=api in their example response. :contentReference[oaicite:3]{index=3}
  const items = (data?.products ?? []).map((p: any) => {
    const cover = (p.images ?? []).find((img: any) => img.isCover)?.variants?.find((v: any) => v.width >= 400)?.url
      ?? (p.images?.[0]?.variants?.[0]?.url ?? "");

    let url: string = p.productUrl || "";
    // Add your campaign tracking if not already present.
    // Viator recommends alphanumeric + dashes for campaign values. :contentReference[oaicite:4]{index=4}
    if (url && !/[?&]campaign=/.test(url)) {
      url += (url.includes("?") ? "&" : "?") + "campaign=" + encodeURIComponent(campaign);
    }

    return {
      id: p.productCode,
      title: p.title,
      imageUrl: cover,
      affiliateUrl: url,
      category: "Tours",
      // NOTE: Viator search doesn’t necessarily give exact meeting-point lat/lng here;
      // you’ll populate lat/lng via another endpoint or later enrichment.
    };
  });

  return NextResponse.json({ items });
}