export type TripRecapStats = {
  days: number;
  cities_visited: string[];
  places_count: number;
  total_spent: string | null;
  avg_daily_spend: string | null;
  hotel_nights: number;
};

export type TripRecap = {
  destination: string;
  dates: string;
  duration_days: number;
  headline: string;
  narrative: string;
  stats: TripRecapStats;
  highlights: string[];
  hidden_gems: string[];
  next_time: string[];
  travel_style_label: string;
  mood_emoji: string;
  rating: number;
  error?: string;
};
