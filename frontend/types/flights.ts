export type FlightSegment = {
  from: string;
  from_name: string;
  to: string;
  to_name: string;
  departs: string;     // "2026-09-25 10:30"
  arrives: string;
  airline: string;
  airline_logo: string;
  flight_number: string;
  duration: string;    // "3h 45m"
  airplane: string;
};

export type FlightOffer = {
  price: string;        // "901 USD"
  price_number: number;
  currency: string;
  total_duration: string;
  stops: number;
  segments: FlightSegment[];
  airline_logo: string;
  airline: string;
  is_best: boolean;
  source?: string;      // "Google Flights" | "Travelpayouts"
  booking_link?: string; // Aviasales direct booking URL (Travelpayouts results)
};

export type FlightSearchResult = {
  flights_found: number;
  origin: string;
  destination: string;
  price_level: string;
  typical_range: number[];
  results: FlightOffer[];
  source?: string;
  sources_checked?: string[];
  sources_succeeded?: string[];
  is_multi_city?: boolean;
  legs?: { origin: string; destination: string; departure_date: string }[];
  route_label?: string;
};

export type CalendarPrice = {
  date: string;       // "2026-10-15"
  price: number;
  currency: string;
  airline: string;
  link?: string;
};

export type PriceCalendarResult = {
  origin: string;
  destination: string;
  year_month: string; // "2026-10"
  currency: string;
  prices: CalendarPrice[];
};

export type RoundTripResult = {
  outbound: FlightSearchResult;
  return_flight: FlightSearchResult;
};
