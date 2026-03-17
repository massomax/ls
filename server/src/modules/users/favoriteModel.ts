import { Schema, model, Types } from "mongoose";

export interface FavoriteDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<FavoriteDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Product",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// уникальная пара user + product
FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default model<FavoriteDoc>("Favorite", FavoriteSchema);
