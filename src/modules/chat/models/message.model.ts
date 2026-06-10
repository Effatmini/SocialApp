import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessageReadReceipt {
  user: Types.ObjectId;
  readAt: Date;
}

export type MessageAttachmentType = "image" | "video" | "audio" | "file";

export interface IMessageAttachment {
  url: string;
  type: MessageAttachmentType;
  name?: string;
  size?: number;
  mimeType?: string;
}

export interface IMessageReaction {
  user: Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  text?: string;
  media?: string;
  tags: string[];
  attachments: IMessageAttachment[];
  reactions: IMessageReaction[];
  readBy: IMessageReadReceipt[];
  createdAt: Date;
  updatedAt: Date;
}

const messageReadReceiptSchema = new Schema<IMessageReadReceipt>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const messageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    url: {
      type: String,
      required: [true, "Attachment url is required"],
      trim: true
    },
    type: {
      type: String,
      enum: ["image", "video", "audio", "file"],
      required: [true, "Attachment type is required"]
    },
    name: {
      type: String,
      trim: true,
      maxlength: [120, "Attachment name must not exceed 120 characters"]
    },
    size: {
      type: Number,
      min: [0, "Attachment size cannot be negative"]
    },
    mimeType: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const messageReactionSchema = new Schema<IMessageReaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    emoji: {
      type: String,
      required: [true, "Reaction emoji is required"],
      trim: true,
      enum: ["like", "love", "haha", "wow", "sad", "angry"]
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: [1000, "Message must not exceed 1000 characters"]
    },
    media: {
      type: String,
      trim: true
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => tags.length <= 10,
        message: "Message cannot have more than 10 tags"
      }
    },
    attachments: {
      type: [messageAttachmentSchema],
      default: [],
      validate: {
        validator: (attachments: IMessageAttachment[]) =>
          attachments.length <= 5,
        message: "Message cannot have more than 5 attachments"
      }
    },
    reactions: {
      type: [messageReactionSchema],
      default: []
    },
    readBy: {
      type: [messageReadReceiptSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const MessageModel = mongoose.model<IMessage>("Message", messageSchema);

export default MessageModel;
