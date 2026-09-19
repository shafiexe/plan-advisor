export type TimelineFlight = {
  flight_number?: string;
  departure_airport: string;
  arrival_airport: string;
  departure_datetime: string;
  arrival_datetime: string;
  airline?: string;
};

export type TimelineHotel = {
  name: string;
  location: string;
  check_in_date: string;
  check_out_date: string;
};

export type TimelineDay = {
  day: number;
  date: string;
  theme: string;
  highlight?: string;
};

export type TripTimeline = {
  destination: string;
  outbound_flight?: TimelineFlight;
  return_flight?: TimelineFlight;
  hotel?: TimelineHotel;
  itinerary_days: TimelineDay[];
};
