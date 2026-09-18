export type TrainResult = {
  title: string;
  snippet: string;
  link: string;
};

export type TrainSearchResult = {
  origin: string;
  destination: string;
  date: string;
  results: TrainResult[];
  book_at: { name: string; url: string }[];
};
