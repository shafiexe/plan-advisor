export type Attraction = {
  name: string;
  description: string;
  duration: string;
  tip: string;
};

export type Neighbourhood = {
  name: string;
  vibe: string;
  best_for: string;
};

export type FoodItem = {
  name: string;
  description: string;
  must_try: boolean;
};

export type DestinationGuide = {
  destination: string;
  tagline?: string;
  best_time?: string;
  top_attractions: Attraction[];
  neighbourhoods: Neighbourhood[];
  food: FoodItem[];
  practical?: {
    local_transport?: string;
    tipping?: string;
    safety?: string;
    language_tip?: string;
    currency_tip?: string;
  };
  tips: string[];
  avoid: string[];
  pack: string[];
  error?: string;
};
