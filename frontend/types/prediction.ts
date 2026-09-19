export type PricePrediction = {
  origin: string;
  destination: string;
  departure_date: string;
  price: number;
  currency: string;
  verdict: "great" | "good" | "fair" | "expensive" | "overpriced";
  verdict_label: string;
  verdict_color: string;
  verdict_emoji: string;
  min_price: number | null;
  avg_price: number | null;
  max_price: number | null;
  percentile: number | null;
  sample_size: number;
  tip: string;
  has_data: boolean;
};
