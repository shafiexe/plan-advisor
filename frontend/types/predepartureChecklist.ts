export type ChecklistTask = {
  id: string;
  task: string;
  category: "documents" | "booking" | "health" | "finance" | "packing" | "communication" | "group";
  priority: "critical" | "high" | "medium" | "low";
  deadline_days_before: number;
  deadline_date: string;
  done: boolean;
  note: string;
  emoji: string;
};

export type PredepartureChecklist = {
  destination: string;
  travel_date: string;
  days_until_travel: number;
  tasks: ChecklistTask[];
  summary: string;
  error?: string;
};
