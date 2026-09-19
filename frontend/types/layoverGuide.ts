export type LayoverOption = {
  name: string;
  emoji: string;
  duration: string;
  description: string;
  tip: string;
};

export type CityOption = {
  name: string;
  emoji: string;
  distance: string;
  duration: string;
  description: string;
  recommended: boolean;
};

export type Lounge = {
  name: string;
  terminal: string;
  access: string;
  highlight: string;
};

export type TimePlanItem = {
  time: string;
  activity: string;
};

export type LayoverGuide = {
  airport: string;
  city: string;
  layover_hours: number;
  verdict: "Worth leaving the airport" | "Stay airside" | "Short city hop possible";
  verdict_reason: string;
  visa_note: string;
  airside_options: LayoverOption[];
  city_options: CityOption[];
  lounges: Lounge[];
  time_plan: TimePlanItem[];
  warning: string | null;
  tips: string[];
  error?: string;
};
