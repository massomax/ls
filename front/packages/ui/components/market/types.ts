export type OfferType = {
  id: string;
  name: string;
  slug: string;
  badgeText?: string;
  badgeColor?: string;
};

export type Product = {
  id: string;
  title: string;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number; // допускает 0..1 или 0..100
  isHot: boolean;
  offerTypeId: string;
  views7d: number;
  favoritesCount: number;
  createdAt: string;
};
