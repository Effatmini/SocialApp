import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationType = "comment" | "system";

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender?: Types.ObjectId;
  post?: Types.ObjectId;
  comment?: Types.ObjectId;
  type: NotificationType;
  message: string;
  isRead: boolean;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post"
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment"
    },
    type: {
      type: String,
      enum: ["comment", "system"],
      default: "system"
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);

export default Notification;
