export type BaggageAllowance = {
  allowance: string;
  dimensions?: string;
  pieces: number;
  note: string;
  extra_piece_fee?: string;
};

export type SpecialItems = {
  laptop: string;
  medicines: string;
  sports_equipment: string;
};

export type BaggagePolicy = {
  airline: string;
  travel_class: string;
  route_type: string;
  cabin_baggage: BaggageAllowance;
  checked_baggage: BaggageAllowance;
  prohibited_items: string[];
  liquid_rule: string;
  oversize_fee: string;
  tips: string[];
  special_items: SpecialItems;
  error?: string;
};
