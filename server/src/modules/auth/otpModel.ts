import { Schema, model } from "mongoose";

export type OtpPurpose = "login";

export interface OtpDoc {
  phone: string; // E.164 +7...
  purpose: OtpPurpose; // 'login'
  codeHash: string;
  attempts: number;
  consumed: boolean;
  expiresAt: Date;
  lastSentAt?: Date;
  sentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new Schema<OtpDoc>(
  {
    phone: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["login"], required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true },
    lastSentAt: { type: Date },
    sentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OtpSchema.index({ phone: 1, purpose: 1, createdAt: -1 });

export default model<OtpDoc>("OtpCode", OtpSchema);
