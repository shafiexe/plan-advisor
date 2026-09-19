export type InsuranceCoverage = {
  type: string;
  emoji: string;
  why: string;
  recommended_minimum: string;
  essential: boolean;
};

export type TravelInsurance = {
  destination: string;
  duration_days: number;
  recommendation: string;
  coverage_types: InsuranceCoverage[];
  cost_estimate: { range: string; per: string; note: string };
  providers: { name: string; note: string }[];
  tips: string[];
  visa_requirement: boolean;
  error?: string;
};
