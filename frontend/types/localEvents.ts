export type LocalEvent = {
  name: string;
  type: "festival" | "concert" | "sports" | "holiday" | "exhibition" | "market" | "cultural" | "food";
  emoji: string;
  date_range: string;
  description: string;
  highlights: string[];
  tips: string;
  free: boolean;
};

export type LocalEvents = {
  destination: string;
  travel_dates: string;
  events: LocalEvent[];
  season_note: string;
  holidays: string[];
  busy_periods: string | null;
  error?: string;
};
