export type BudgetItem = {
  label: string;
  icon: string;
  amount: number;
  detail: string;
};

export type TripBudget = {
  destination: string;
  from_city: string;
  currency: string;
  items: BudgetItem[];
  total: number;
  per_person: number;
  num_people: number;
  nights: number;
  days: number;
  error?: string;
};
