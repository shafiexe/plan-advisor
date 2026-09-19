export type CurrencyRate = {
  currency: string;
  code: string;
  symbol: string;
  rate: number;
  converted: number;
  flag: string;
};

export type CurrencyResult = {
  base_currency: string;
  amount: number;
  rates: CurrencyRate[];
  error?: string | null;
};
