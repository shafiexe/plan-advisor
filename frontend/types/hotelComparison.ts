export type HotelComparisonItem = {
  name: string;
  pros: string[];
  cons: string[];
  value_score: number;
  best_for: string;
  summary: string;
};

export type HotelComparison = {
  hotels: HotelComparisonItem[];
  winner: string;
  winner_reason: string;
  budget_pick: string;
  luxury_pick: string;
  error?: string;
};
