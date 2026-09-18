export type BusResult = {
  operator: string;
  bus_type: string;      // "AC Sleeper", "Non-AC Semi-Sleeper", etc.
  ac: boolean;
  sleeper: boolean;
  semi_sleeper: boolean;
  seater: boolean;
  departure: string;     // "21:00"
  arrival: string;       // "06:30"
  duration: string;      // "9h 30m"
  fare: number;
  currency: string;
  available_seats: number;
  total_seats: number;
  rating: number;
  amenities: string[];
  boarding_points: string[];
  dropping_points: string[];
  booking_link: string;
  source: string;
};

export type BusSearchResult = {
  origin: string;
  destination: string;
  date: string;
  buses_found: number;
  source: string;
  results: BusResult[];
  error?: string | null;
  book_at: { name: string; url: string }[];
};
