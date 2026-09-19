export type TransitOption = {
  mode: string;
  emoji: string;
  duration: string;
  cost: string;
  frequency?: string;
  steps: string[];
  tip?: string;
  recommended?: boolean;
};

export type AirportTransit = {
  airport_iata: string;
  airport_name: string;
  destination: string;
  options: TransitOption[];
  tip?: string;
  error?: string;
};
