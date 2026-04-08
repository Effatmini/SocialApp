import mongoose, { Schema, Document } from "mongoose";

// Interface (TypeScript typing)
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  age: number;
}

// Schema
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    phone: {
      type: String,
      required: false
    },
    age: {
      type: Number,
      required: false,
      min: 18,
      max: 60
    }
  },
  {
    timestamps: true
  }
);

// Model
const User = mongoose.model<IUser>("User", userSchema);

export default User;