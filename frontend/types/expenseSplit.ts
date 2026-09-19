export type ExpenseRow = {
  name: string;
  emoji: string;
  amount: number;
  paid_by: string;
  per_person: Record<string, number>;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export type GroupSplit = {
  members: string[];
  currency: string;
  total: number;
  per_person_total: number;
  expenses: ExpenseRow[];
  balances: Record<string, number>;
  settlements: Settlement[];
};
