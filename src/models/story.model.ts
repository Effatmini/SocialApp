import mongoose, { Document, Schema, Types } from "mongoose";

export interface IStory extends Document {
  author: Types.ObjectId;
  text?: string;
  media?: string;
  backgroundColor?: string;
  expiresAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      trim: true,
      maxlength: [300, "Story text must not exceed 300 characters"]
    },
    media: {
      type: String
    },
    backgroundColor: {
      type: String,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  {
    timestamps: true
  }
);

const Story = mongoose.model<IStory>("Story", storySchema);

export default Story;
