import { Schema, model, Types } from "mongoose";

export type ProductEventType = "view" | "click";

export interface ProductEventDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  type: ProductEventType;
  ts: Date; // время события
}

const ProductEventSchema = new Schema<ProductEventDoc>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  type: { type: String, enum: ["view", "click"], required: true, index: true },
  // TTL: храним 40 дней, дальше Mongo сам удалит
  ts: {
    type: Date,
    default: () => new Date(),
    index: { expires: 40 * 24 * 3600 },
  },
});

ProductEventSchema.index({ productId: 1, ts: -1 });

export default model<ProductEventDoc>("ProductEvent", ProductEventSchema);
