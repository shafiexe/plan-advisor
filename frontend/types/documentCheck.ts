export type DocumentCheck = {
  destination: string;
  travel_date: string;
  return_date: string;
  days_until_travel: number;
  passport_status: "valid" | "expiring_soon" | "expired" | "unknown";
  passport_days_left: number | null;
  warnings: string[];
  checks: string[];
  visa_reminders: string[];
  overall_status: "ok" | "warning";
};
