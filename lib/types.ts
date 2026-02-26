export type Item = {
  id: string | number;
  title: string;
  affiliateUrl: string;

  // optional fields (some sources may not have them)
  category?: string;
  location?: string;
  imageUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};