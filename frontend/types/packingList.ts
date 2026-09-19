export type PackingItem = {
  item: string;
  essential: boolean;
  note?: string | null;
};

export type PackingCategory = {
  name: string;
  emoji: string;
  items: PackingItem[];
};

export type PackingList = {
  destination: string;
  duration_days: number;
  trip_type: string;
  categories: PackingCategory[];
  tips?: string[];
  error?: string;
};
