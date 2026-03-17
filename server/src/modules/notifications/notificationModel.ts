import { Schema, model, Types } from "mongoose";

export type NotificationType = "info" | "success" | "warning" | "error";
export type NotificationCategory = "system" | "auth" | "seller" | "product";

export interface NotificationDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;

  title: string;
  message?: string;
  data?: Record<string, any>;

  isRead: boolean;
  readAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    category: {
      type: String,
      enum: ["system", "auth", "seller", "product"],
      default: "system",
      index: true,
    },

    title: { type: String, required: true },
    message: { type: String },
    data: { type: Schema.Types.Mixed },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default model<NotificationDoc>("Notification", NotificationSchema);
