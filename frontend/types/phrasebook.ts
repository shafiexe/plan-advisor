export type Phrase = {
  english: string;
  local: string;
  pronunciation: string;
  category: string;
};

export type PhraseCategory = {
  name: string;
  emoji: string;
  phrases: Phrase[];
};

export type Phrasebook = {
  destination: string;
  language: string;
  script: string;
  categories: PhraseCategory[];
  tip?: string;
  error?: string;
};
