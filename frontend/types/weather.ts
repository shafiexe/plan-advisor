export type WeatherForecastDay = {
  date: string;
  max_temp_c: number;
  min_temp_c: number;
  description: string;
  rain_mm: number;
  humidity: number;
  wind_kmph: number;
};

export type WeatherResult = {
  location: string;
  temp_c: number;
  feels_like_c: number;
  description: string;
  humidity: number;
  wind_kmph: number;
  visibility_km: number;
  uv_index: number;
  forecast: WeatherForecastDay[];
  error?: string;
};
