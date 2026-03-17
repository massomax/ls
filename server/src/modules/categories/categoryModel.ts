import { Schema, model, Types } from "mongoose";

export type CategoryStatus = "active" | "archived";

export interface CategoryDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  svgUrl: string;
  status: CategoryStatus;
  sortOrder: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    svgUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
    description: { type: String },
  },
  { timestamps: true }
);

CategorySchema.index({ status: 1, sortOrder: 1 });
CategorySchema.index({ name: 1 });

export default model<CategoryDoc>("Category", CategorySchema);
