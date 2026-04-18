import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment extends Document {
  content: string;
  author: Types.ObjectId;
  post: Types.ObjectId;
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [1, "Comment content cannot be empty"],
      maxlength: [500, "Comment content must not exceed 500 characters"]
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Comment = mongoose.model<IComment>("Comment", commentSchema);

export default Comment;
