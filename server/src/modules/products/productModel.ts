import { Schema, model, Types } from "mongoose";

export type ProductStatus =
  | "draft"
  | "pending"
  | "active"
  | "rejected"
  | "archived";

export interface ProductDoc {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;

  title: string;
  description?: string;
  photos: string[]; // URL-ы изображений

  oldPrice: number; // исходная цена
  price: number; // акционная цена

  mainCategoryId: Types.ObjectId; // Category
  subcategoryId?: Types.ObjectId; // Subcategory
  offerTypeId: Types.ObjectId; // OfferType

  externalUrl?: string; // ссылка на карточку продавца

  status: ProductStatus; // 'active' показывается публично
  deletedAt?: Date; // soft-delete

  moderationNote?: string | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  moderatedBy?: Types.ObjectId | null;

  // счётчики / ранжирование
  views7d: number;
  views30d: number;
  favoritesCount: number;
  clicksToExternal7d: number;

  rankScore: number; // для сортировки "rank"
  shuffleKey: number; // для равнозначных позиций

  isFeatured: { type: Boolean; default: false; index: true };
  featuredUntil: { type: Date };
  adminTags: { type: [String]; default: []; enum: ["best", "popular", "new"] };
  rankAdminBoost: { type: Number; default: 0; min: 0; max: 1 };
  promotionUntil: { type: Date };

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDoc>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },

    title: { type: String, required: true, maxlength: 160 },
    description: { type: String },
    photos: {
      type: [String],
      default: [],
      validate: [(arr: string[]) => arr.length <= 10, "Max 10 photos"],
    },

    oldPrice: { type: Number, required: true, min: 0.01 },
    price: { type: Number, required: true, min: 0 },

    mainCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
      index: true,
    },
    offerTypeId: {
      type: Schema.Types.ObjectId,
      ref: "OfferType",
      required: true,
      index: true,
    },

    externalUrl: { type: String },

    status: {
      type: String,
      enum: ["draft", "pending", "active", "rejected", "archived"],
      default: "draft",
      index: true,
    },
    deletedAt: { type: Date, index: true },

    moderationNote: { type: String },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },

    views7d: { type: Number, default: 0 },
    views30d: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
    clicksToExternal7d: { type: Number, default: 0 },

    rankScore: { type: Number, default: 0, index: true },
    shuffleKey: { type: Number, default: () => Math.random() },
    // --- админ/промо флаги ---
    isFeatured: { type: Boolean, default: false, index: true }, // выводить в «избранных подборках»
    featuredUntil: { type: Date }, // срок фичеринга (не обязателен)
    adminTags: {
      type: [String],
      default: [],
      enum: ["best", "popular", "new"],
    },

    // Админский буст ранга (для платного продвижения)
    rankAdminBoost: { type: Number, default: 0, min: 0, max: 1 }, // 0..1 добавка к рангу
    promotionUntil: { type: Date }, // пока действует буст
  },
  { timestamps: true }
);

// индексы для витрины
ProductSchema.index({ status: 1, rankScore: -1, shuffleKey: 1, _id: 1 });
ProductSchema.index({ status: 1, createdAt: -1, _id: -1 });
ProductSchema.index({ status: 1, views7d: -1, _id: 1 });
ProductSchema.index({
  status: 1,
  mainCategoryId: 1,
  subcategoryId: 1,
  offerTypeId: 1,
  price: 1,
});
ProductSchema.index({ status: 1, rankScore: -1, createdAt: -1 });

// Виртуалы для удобства (в запросах фильтруем через $expr, см. роуты)
ProductSchema.virtual("discountPercent").get(function (this: ProductDoc) {
  if (!this.oldPrice || this.oldPrice <= 0) return 0;
  const d = Math.round(((this.oldPrice - this.price) / this.oldPrice) * 100);
  return d < 0 ? 0 : d;
});
ProductSchema.virtual("isHot").get(function (this: ProductDoc) {
  return (this as any).discountPercent >= 50;
});

export default model<ProductDoc>("Product", ProductSchema);
