import { Schema, model, Types } from "mongoose";

export type SubcategoryStatus = "active" | "pending" | "archived";

export interface SubcategoryDoc {
  _id: Types.ObjectId;
  parentCategoryId: Types.ObjectId; // ref Category
  name: string;
  slug: string;
  status: SubcategoryStatus;
  createdBy: "admin" | "seller";
  proposedBySellerId?: Types.ObjectId; // ref Seller
  description?: string;
  mergedToId?: Types.ObjectId; // ref Subcategory
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubcategorySchema = new Schema<SubcategoryDoc>(
  {
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "pending", "archived"],
      default: "pending",
      index: true,
    },
    createdBy: { type: String, enum: ["admin", "seller"], required: true },
    proposedBySellerId: { type: Schema.Types.ObjectId, ref: "Seller" },
    description: { type: String },
    mergedToId: { type: Schema.Types.ObjectId, ref: "Subcategory" },
    reason: { type: String },
  },
  { timestamps: true }
);

// уникальность slug в пределах категории
SubcategorySchema.index(
  { parentCategoryId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);
SubcategorySchema.index({ name: 1 });

export default model<SubcategoryDoc>("Subcategory", SubcategorySchema);
