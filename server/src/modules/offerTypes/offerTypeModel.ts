import { Schema, model, Types } from "mongoose";

export type OfferTypeStatus = "active" | "archived" | "pending";

export interface OfferTypeDoc {
  _id: Types.ObjectId;
  name: string; // "Последняя штучка"
  slug: string; // "last_piece"
  status: OfferTypeStatus; // active | archived | pending
  sortOrder: number; // порядок в фильтрах
  boostMultiplier: number; // 1.0 обычно; >1 — буст в ранжировании
  badgeText?: string; // короткий бейдж: "B2B"
  badgeColor?: string; // для UI (на будущее)
  description?: string; // подсказка продавцу
  mergedToId?: Types.ObjectId; // если слит с другим типом

  createdAt: Date;
  updatedAt: Date;
}

const OfferTypeSchema = new Schema<OfferTypeDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "archived", "pending"],
      default: "active",
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    boostMultiplier: { type: Number, default: 1.0, min: 0.1, max: 5.0 },
    badgeText: { type: String },
    badgeColor: { type: String },
    description: { type: String },
    mergedToId: { type: Schema.Types.ObjectId, ref: "OfferType" },
  },
  { timestamps: true }
);

OfferTypeSchema.index({ status: 1, sortOrder: 1 });
OfferTypeSchema.index({ name: 1 });

export default model<OfferTypeDoc>("OfferType", OfferTypeSchema);
