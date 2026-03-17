import { Schema, model, Types } from "mongoose";

export interface UserDoc {
  _id: Types.ObjectId;
  phone: string;
  isPhoneVerified: boolean;
  name?: string;
  gender?: "male" | "female" | "other";
  birthDate?: Date;
  roles: string[]; // ['user'], ['user','seller'], ['admin']
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    phone: { type: String, required: true, unique: true },
    isPhoneVerified: { type: Boolean, default: false },
    name: { type: String },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: undefined,
    },
    birthDate: { type: Date },
    roles: { type: [String], default: ["user"] },
  },
  { timestamps: true }
);


export default model<UserDoc>("User", UserSchema);
