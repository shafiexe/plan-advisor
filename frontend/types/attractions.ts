export type Attraction = {
  name: string;
  rating: number;
  reviews: number;
  type: string;
  address: string;
  hours: string;
  price: string;
  thumbnail: string;
  phone: string;
  gps_coordinates?: { latitude: number; longitude: number };
};

export type NearbyAttractions = {
  location: string;
  category: string;
  attractions_found: number;
  attractions: Attraction[];
};
