import mongoose, { Document, Schema, Types } from "mongoose";

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  conversationKey: string;
  lastMessage?: Types.ObjectId;
  lastMessageText?: string;
  lastMessageAt?: Date;
  unreadCounts: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    conversationKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message"
    },
    lastMessageText: {
      type: String,
      trim: true
    },
    lastMessageAt: {
      type: Date
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      flattenMaps: true
    },
    toObject: {
      virtuals: true,
      flattenMaps: true
    }
  }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const ConversationModel = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema
);

export default ConversationModel;
