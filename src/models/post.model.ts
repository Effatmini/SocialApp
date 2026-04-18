import mongoose, {
  CallbackWithoutResultAndOptionalError,
  Document,
  Query,
  Schema,
  Types,
  UpdateQuery
} from "mongoose";

export interface IPost extends Document {
  content: string;
  image?: string;
  author: Types.ObjectId;
  commentsCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
}

type PostQuery = Query<unknown, IPost>;

const normalizePostUpdate = (update: UpdateQuery<IPost> | null | undefined) => {
  if (!update) {
    return;
  }

  const directUpdate = update as UpdateQuery<IPost> & {
    $set?: Partial<IPost>;
  };
  const setUpdate = directUpdate.$set || {};

  const nextContent =
    typeof setUpdate.content === "string"
      ? setUpdate.content
      : typeof directUpdate.content === "string"
        ? directUpdate.content
        : undefined;

  if (typeof nextContent === "string") {
    const normalizedContent = nextContent.trim();

    if (typeof setUpdate.content === "string") {
      setUpdate.content = normalizedContent;
    } else {
      directUpdate.content = normalizedContent;
    }
  }

  if (Object.keys(setUpdate).length > 0) {
    directUpdate.$set = setUpdate;
  }
};

const excludeSoftDeleted = function (this: PostQuery) {
  const options = this.getOptions() as { withDeleted?: boolean };

  if (options.withDeleted) {
    return;
  }

  this.where({ isDeleted: false });
};

const postSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      minlength: [1, "Post content cannot be empty"],
      maxlength: [1000, "Post content must not exceed 1000 characters"]
    },
    image: {
      type: String
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const addPreHook = postSchema.pre.bind(postSchema) as any;
const addPostHook = postSchema.post.bind(postSchema) as any;

addPreHook(
  "validate",
  function (
    this: IPost,
    next: CallbackWithoutResultAndOptionalError
  ) {
    if (typeof this.content === "string") {
      this.content = this.content.trim();
    }

    next();
  }
);

addPostHook("validate", function (this: IPost) {
  if (typeof this.content === "string") {
    this.content = this.content.trim();
  }
});

addPreHook("save", function (
  this: IPost,
  next: CallbackWithoutResultAndOptionalError
) {
  if (this.isModified("content") && typeof this.content === "string") {
    this.content = this.content.trim();
  }

  next();
});

addPostHook("save", function (this: IPost) {
  return this;
});

addPreHook(/^find/, function (
  this: PostQuery,
  next: CallbackWithoutResultAndOptionalError
) {
  excludeSoftDeleted.call(this as PostQuery);
  next();
});

addPreHook(
  "updateOne",
  function (
    this: PostQuery,
    next: CallbackWithoutResultAndOptionalError
  ) {
    excludeSoftDeleted.call(this);
    normalizePostUpdate(this.getUpdate() as UpdateQuery<IPost>);
    next();
  }
);

addPreHook(
  "findOneAndUpdate",
  function (
    this: PostQuery,
    next: CallbackWithoutResultAndOptionalError
  ) {
    excludeSoftDeleted.call(this);
    normalizePostUpdate(this.getUpdate() as UpdateQuery<IPost>);
    next();
  }
);

addPreHook(
  "deleteOne",
  function (
    this: PostQuery & { op?: string },
    next: CallbackWithoutResultAndOptionalError
  ) {
    const query = this;

    excludeSoftDeleted.call(query);
    query.setUpdate({
      $set: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
    query.op = "updateOne";
    next();
  }
);

addPostHook("find", function (this: PostQuery, docs: IPost[]) {
  return docs;
});

addPostHook("findOne", function (this: PostQuery, doc: IPost | null) {
  return doc;
});

addPostHook("updateOne", function (this: PostQuery) {
  return this;
});

addPostHook("findOneAndUpdate", function (this: PostQuery, doc: IPost | null) {
  return doc;
});

addPostHook("deleteOne", function (this: PostQuery) {
  return this;
});

const Post = mongoose.model<IPost>("Post", postSchema);

export default Post;
