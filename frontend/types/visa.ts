export type VisaResult = {
  passport_country: string;
  destination_country: string;
  visa_type: "VF" | "VOA" | "E" | "VR" | "-1" | "unknown";
  label: string;
  color: "green" | "blue" | "amber" | "red" | "gray";
  emoji: string;
  days_allowed: number | null;
  notes: string[];
  error: string | null;
};
