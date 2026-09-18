export type Hotel = {
  name: string;
  rating: number;
  reviews: number;
  hotel_class: string;
  price: string;
  price_before_taxes: string;
  currency: string;
  amenities: string[];
  thumbnail: string;
  link: string;
  description: string;
};

export type HotelSearchResult = {
  location: string;
  check_in: string;
  check_out: string;
  hotels_found: number;
  results: Hotel[];
};

export type Restaurant = {
  name: string;
  rating: number;
  reviews: number;
  type: string;
  address: string;
  hours: string;
  price: string;
  thumbnail: string;
  phone: string;
};

export type RestaurantSearchResult = {
  location: string;
  cuisine_filter: string;
  restaurants_found: number;
  results: Restaurant[];
};
