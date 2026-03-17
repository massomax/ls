import { Schema, model, Types } from "mongoose";

export type SellerStatus = "pending" | "active" | "rejected" | "suspended";
export type SellerTier = "free" | "plus" | "pro";

export interface SellerDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  companyName: string;
  inn: string;
  ogrn?: string;
  legalAddress?: string;
  website?: string;

  contactName?: string;
  contactEmail?: string;

  status: SellerStatus;
  isVerified: boolean;
  tier: SellerTier;

  // модерация/аудит (новые поля)
  moderationNote?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  suspendedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const SellerSchema = new Schema<SellerDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    companyName: { type: String, required: true },
    inn: { type: String, required: true },
    ogrn: { type: String },
    legalAddress: { type: String },
    website: { type: String },

    contactName: { type: String },
    contactEmail: { type: String },

    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    isVerified: { type: Boolean, default: false },
    tier: { type: String, enum: ["free", "plus", "pro"], default: "free" },

    moderationNote: { type: String },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    suspendedAt: { type: Date },
  },
  { timestamps: true }
);

SellerSchema.index({ userId: 1 }, { unique: true });

export default model<SellerDoc>("Seller", SellerSchema);
