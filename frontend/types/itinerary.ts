export type ItinerarySlot = {
  time: string;
  period: "Morning" | "Afternoon" | "Evening";
  activity: string;
  description: string;
  duration: string;
  location: string;
  tip: string;
  type: "sightseeing" | "food" | "transport" | "leisure" | "shopping" | "adventure";
};

export type ItineraryDay = {
  day: number;
  date: string;
  theme: string;
  slots: ItinerarySlot[];
};

export type Itinerary = {
  destination: string;
  start_date: string;
  end_date: string;
  days: ItineraryDay[];
  error?: string;
};
