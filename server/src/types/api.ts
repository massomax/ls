// Shared API types for frontend consumption
// Notes:
// - Dates are represented as ISO strings
// - IDs are stringified ObjectIds

export type ID = string;

export type PaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

/* ===================== AUTH ===================== */
export type AuthLoginSmsRequest = { phone: string };
export type AuthLoginSmsVerifyRequest = { phone: string; code: string };
export type AuthLoginSmsVerifyResponse = {
  accessToken: string;
  roles: string[];
};
export type AuthRefreshResponse = { accessToken: string };

/* ===================== USER ===================== */
export type Gender = "male" | "female" | "other";
export type UserProfile = {
  id: ID;
  phone: string;
  isPhoneVerified: boolean;
  name: string | null;
  gender: Gender | null;
  birthDate: string | null; // ISO
  roles: string[];
  createdAt: string; // ISO
};
export type UserPatchMeRequest = {
  name?: string;
  gender?: Gender;
  birthDate?: string; // ISO (YYYY-MM-DD or full ISO)
};

/* ===================== FAVORITES ===================== */
export type FavoriteItem = {
  id: ID;
  productId: ID;
  createdAt: string; // ISO
};
export type FavoritesListResponse = PaginatedResponse<FavoriteItem>;
export type FavoritesAddRequest = { productId: ID };
export type FavoritesAddResponse = FavoriteItem;

/* ===================== PRODUCTS (PUBLIC) ===================== */
export type ProductCard = {
  id: ID;
  title: string;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number;
  isHot: boolean;
};
export type ProductsListResponse = PaginatedResponse<ProductCard>;

export type ProductDetail = {
  id: ID;
  title: string;
  description: string | null;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number;
  isHot: boolean;
  offerTypeId: ID;
  mainCategoryId: ID;
  subcategoryId: ID | null;
  externalUrl: string | null;
  views7d: number;
  views30d: number;
  favoritesCount: number;
  clicksToExternal7d: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ProductSimilarItem = {
  id: ID;
  title: string;
  photos: string[];
  price: number;
  oldPrice: number;
  discountPercent: number;
};
export type ProductSimilarResponse = { items: ProductSimilarItem[] };

export type ProductClickResponse = { externalUrl: string | null };

/* ===================== OFFER TYPES (PUBLIC) ===================== */
export type OfferTypeItem = {
  id: ID;
  name: string;
  slug: string;
  sortOrder: number;
  boostMultiplier: number;
  badgeText: string | null;
  badgeColor: string | null;
  description: string | null;
};
export type OfferTypeListResponse = PaginatedResponse<OfferTypeItem>;

/* ===================== CATEGORIES (PUBLIC) ===================== */
export type CategoryItem = {
  id: ID;
  name: string;
  slug: string;
  svgUrl: string;
  sortOrder: number;
  description: string | null;
};
export type CategoryListResponse = { items: CategoryItem[] };
export type CategoryBySlugResponse = CategoryItem;

export type SubcategoryItem = {
  id: ID;
  name: string;
  slug: string;
  description: string | null;
};
export type SubcategoryListResponse = { items: SubcategoryItem[] };

/* ===================== NOTIFICATIONS ===================== */
export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationCategory = "system" | "auth" | "seller" | "product";
export type NotificationItem = {
  id: ID;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string; // ISO
  readAt: string | null; // ISO
};
export type NotificationsListResponse = PaginatedResponse<NotificationItem>;
export type NotificationsReadRequest = { ids: ID[] };
export type NotificationsUpdatedResponse = { updated: number };

/* ===================== UPLOADS ===================== */
export type UploadedImageItem = {
  url: string;
  deleteHash: string | null;
  id: string | null;
  originalName: string;
  size: number;
  mime: string;
};
export type UploadImagesResponse = { items: UploadedImageItem[] };

/* ===================== SELLER (OPTIONAL UI) ===================== */
export type SellerStatus = "pending" | "active" | "rejected" | "suspended";
export type SellerTier = "free" | "plus" | "pro";

export type SellerProfile = {
  id: ID;
  status: SellerStatus;
  isVerified: boolean;
  tier: SellerTier;
  companyName: string;
  inn: string;
  ogrn: string | null;
  legalAddress: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type SellerApplyRequest = {
  companyName: string;
  inn: string; // 10-12 digits
  ogrn?: string; // 13-15 digits
  legalAddress?: string;
  website?: string;
  contactName?: string;
  contactEmail?: string;
};

export type SellerStatsResponse = {
  period: "live";
  products: { total: number; active: number; archived: number };
  views7d: number;
  views30d: number;
  favorites: number;
  clicks7d: number;
};

export type SellerProductItem = {
  id: ID;
  title: string;
  price: number;
  oldPrice: number;
  status: "draft" | "active" | "archived";
  createdAt: string; // ISO
  discountPercent: number;
};
export type SellerProductsListResponse = PaginatedResponse<SellerProductItem>;

