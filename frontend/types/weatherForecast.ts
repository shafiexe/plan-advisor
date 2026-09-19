export type ForecastDay = {
  date: string;
  day_name: string;
  condition: string;
  emoji: string;
  temp_high: number;
  temp_low: number;
  humidity: number;
  wind_kph: number;
  precip_chance: number;
  uv_index: number;
  sunrise: string;
  sunset: string;
  travel_note: string;
};

export type WeatherForecast = {
  destination: string;
  start_date: string;
  source: "openweathermap" | "estimate";
  days: ForecastDay[];
  overall_summary: string;
  packing_weather_tip: string;
  best_days: string[];
  worst_days: string[];
  error?: string;
};
