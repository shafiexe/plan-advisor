export type TimelineItem = {
  time: string;
  activity: string;
  type: "travel" | "prayer" | "food" | "toilet" | "sightseeing" | "activity" | "rest" | "hotel";
  duration_min: number;
  location: string;
  notes: string;
  cost_per_person: number;
  alert?: string;
};

export type PrayerStop = {
  prayer: string;
  time: string;
  location: string;
  duration_min: number;
  notes: string;
};

export type TripPlace = {
  name: string;
  entry_fee_adult: number;
  entry_fee_child: number;
  duration_recommended: string;
  best_time: string;
  notes: string;
  plastic_restricted: boolean;
  opening_hours?: string;
  real_rating?: number;
};

export type ToiletStop = {
  location: string;
  approx_time: string;
  type: "petrol_pump" | "public_toilet" | "hotel" | "restaurant";
  notes: string;
};

export type Meal = {
  meal: string;
  time: string;
  option: string;
  location: string;
  notes: string;
};

export type FoodPlan = {
  plan_type: string;
  meals: Meal[];
  catering_checklist: string[];
  halal_note?: string;
};

export type ActivityBreakdown = {
  name: string;
  fee_adult: number;
  fee_child: number;
  group_total: number;
};

export type CostBreakdown = {
  transport_per_person: number;
  entry_fees_per_person: number;
  food_per_person: number;
  toy_train_per_person: number;
  miscellaneous_per_person: number;
  total_per_person: number;
  total_group: number;
  petrol_estimate: string | null;
  notes: string;
  activities_breakdown?: ActivityBreakdown[];
};

export type PackingList = {
  mandatory_everyone: string[];
  group_coordinator?: string[];
  for_kids?: string[];
  for_elderly?: string[];
  catering_team?: string[];
  bus_travel?: string[];
  muslim_specific?: string[];
  weather_specific?: string[];
};

export type TripAlert = {
  type: "restriction" | "timing" | "health" | "safety" | "booking";
  message: string;
  severity: "high" | "medium" | "low";
};

export type EmergencyInfo = {
  nearest_hospital: string;
  police: string;
  ambulance: string;
  tour_coordinator_tip: string;
};

export type DinnerHotel = {
  name: string;
  location: string;
  approx_cost_per_head: number;
  cuisine: string;
  notes: string;
};

export type TrafficForecast = {
  estimated_hours_str: string;
  traffic_level: "light" | "normal" | "heavy" | "very_heavy";
  reason: string;
  advice: string;
  is_holiday: boolean;
  is_weekend: boolean;
  is_peak_season: boolean;
  multiplier: number;
};

export type GroupTripPlan = {
  origin: string;
  destination: string;
  travel_date: string;
  group_type: string;
  group_size: number;
  duration: string;
  timeline: TimelineItem[];
  prayer_schedule: PrayerStop[];
  places: TripPlace[];
  toilet_stops: ToiletStop[];
  food_plan: FoodPlan;
  cost_breakdown: CostBreakdown;
  packing_list: PackingList;
  alerts: TripAlert[];
  emergency_info: EmergencyInfo;
  dinner_hotel_suggestion?: DinnerHotel;
  traffic_forecast?: TrafficForecast;
  summary: string;
  group_tips: string[];
  error?: string;
};
