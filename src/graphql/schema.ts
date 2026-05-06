import mongoose from "mongoose";
import { buildSchema } from "graphql";
import CommentModel from "../models/comment.model";
import NotificationModel from "../models/notification.model";
import PostModel from "../models/post.model";
import StoryModel from "../models/story.model";
import UserModel from "../models/user.model";
import { JwtPayload } from "../types/auth";
import { verifyToken } from "../utils/jwt";

type ReactionEmoji = "like" | "love" | "haha" | "wow" | "sad" | "angry";

type GraphQLContext = {
  userId?: string;
};

const allowedReactions: ReactionEmoji[] = [
  "like",
  "love",
  "haha",
  "wow",
  "sad",
  "angry"
];

const parsePagination = (page?: number, limit?: number) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip
  };
};

const mapPostWithReactions = (post: any, currentUserId?: string) => {
  const rawPost =
    typeof post?.toObject === "function" ? post.toObject() : post;

  const reactions = Array.isArray(rawPost.reactions) ? rawPost.reactions : [];
  const reactionCounts = reactions.reduce(
    (acc: Record<string, number>, reaction: { emoji: string }) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    },
    {}
  );

  const myReaction =
    reactions.find(
      (reaction: { user: { toString(): string }; emoji: string }) =>
        reaction.user?.toString() === currentUserId
    )?.emoji || null;

  return {
    ...rawPost,
    id: rawPost._id?.toString?.() || rawPost.id,
    author: rawPost.author
      ? {
          ...rawPost.author,
          id:
            rawPost.author._id?.toString?.() ||
            rawPost.author.id?.toString?.() ||
            rawPost.author.id
        }
      : null,
    reactionsCount: reactions.length,
    reactionCounts,
    myReaction
  };
};

const mapComment = (comment: any) => {
  const rawComment =
    typeof comment?.toObject === "function" ? comment.toObject() : comment;

  return {
    ...rawComment,
    id: rawComment._id?.toString?.() || rawComment.id,
    author: rawComment.author
      ? {
          ...rawComment.author,
          id:
            rawComment.author._id?.toString?.() ||
            rawComment.author.id?.toString?.() ||
            rawComment.author.id
        }
      : null
  };
};

const mapStory = (story: any) => {
  const rawStory =
    typeof story?.toObject === "function" ? story.toObject() : story;

  return {
    ...rawStory,
    id: rawStory._id?.toString?.() || rawStory.id,
    author: rawStory.author
      ? {
          ...rawStory.author,
          id:
            rawStory.author._id?.toString?.() ||
            rawStory.author.id?.toString?.() ||
            rawStory.author.id
        }
      : null
  };
};

const mapNotification = (notification: any) => {
  const raw =
    typeof notification?.toObject === "function"
      ? notification.toObject()
      : notification;

  return {
    ...raw,
    id: raw._id?.toString?.() || raw.id,
    sender: raw.sender
      ? {
          ...raw.sender,
          id:
            raw.sender._id?.toString?.() ||
            raw.sender.id?.toString?.() ||
            raw.sender.id
        }
      : null,
    post: raw.post ? mapPostWithReactions(raw.post) : null
  };
};

const getCurrentUserIdFromAuthHeader = async (
  authorization?: string
): Promise<string | undefined> => {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return undefined;
  }

  try {
    const token = authorization.split(" ")[1];
    const decoded = verifyToken(token) as JwtPayload;
    const user = await UserModel.findById(decoded.id);

    return user?._id?.toString();
  } catch {
    return undefined;
  }
};

export const graphQLSchema = buildSchema(`
  type User {
    id: ID
    _id: ID
    name: String
    email: String
    profileImage: String
    coverImage: String
    picture: String
    role: String
    authProvider: String
    isEmailConfirmed: Boolean
    createdAt: String
    updatedAt: String
  }

  type ReactionCountMap {
    like: Int
    love: Int
    haha: Int
    wow: Int
    sad: Int
    angry: Int
  }

  type Post {
    id: ID
    _id: ID
    content: String
    image: String
    author: User
    commentsCount: Int
    reactionsCount: Int
    reactionCounts: ReactionCountMap
    myReaction: String
    createdAt: String
    updatedAt: String
  }

  type Comment {
    id: ID
    _id: ID
    content: String
    author: User
    post: ID
    createdAt: String
    updatedAt: String
  }

  type Story {
    id: ID
    _id: ID
    author: User
    text: String
    media: String
    backgroundColor: String
    expiresAt: String
    createdAt: String
    updatedAt: String
  }

  type Notification {
    id: ID
    _id: ID
    recipient: ID
    sender: User
    post: Post
    comment: ID
    type: String
    message: String
    isRead: Boolean
    createdAt: String
  }

  type Pagination {
    page: Int
    limit: Int
    total: Int
    totalPages: Int
  }

  type NewsFeedResult {
    posts: [Post!]!
    pagination: Pagination
  }

  type ProfilePostsResult {
    user: User
    posts: [Post!]!
    pagination: Pagination
  }

  type PostDetailsResult {
    post: Post
    comments: [Comment!]!
  }

  type DashboardStats {
    myPostsCount: Int
    myCommentsCount: Int
    unreadNotificationsCount: Int
  }

  type DashboardResult {
    user: User
    stats: DashboardStats
    recentPosts: [Post!]!
  }

  type Query {
    me: User
    newsFeed(page: Int, limit: Int): NewsFeedResult!
    profilePosts(userId: ID, page: Int, limit: Int): ProfilePostsResult!
    dashboard: DashboardResult!
    post(id: ID!): PostDetailsResult!
    notifications: [Notification!]!
    activeStories: [Story!]!
  }

  type Mutation {
    createPost(content: String!, image: String): Post!
    addComment(postId: ID!, content: String!): Comment!
    reactToPost(postId: ID!, emoji: String!): Post!
    removeReaction(postId: ID!): Post!
    createStory(text: String, media: String, backgroundColor: String): Story!
  }
`);

export const graphQLRoot = {
  me: async (
    _args: unknown,
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      return null;
    }

    return UserModel.findById(context.userId).select(
      "name email profileImage coverImage picture role authProvider isEmailConfirmed createdAt updatedAt"
    );
  },

  newsFeed: async (
    args: { page?: number; limit?: number },
    context: GraphQLContext
  ) => {
    const { page, limit, skip } = parsePagination(args.page, args.limit);

    const [posts, total] = await Promise.all([
      PostModel.find()
        .populate("author", "name email profileImage coverImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PostModel.countDocuments()
    ]);

    return {
      posts: posts.map((post) => mapPostWithReactions(post, context.userId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  profilePosts: async (
    args: { userId?: string; page?: number; limit?: number },
    context: GraphQLContext
  ) => {
    const profileUserId = args.userId || context.userId;

    if (!profileUserId) {
      throw new Error("User id is required");
    }

    const { page, limit, skip } = parsePagination(args.page, args.limit);

    const [user, posts, total] = await Promise.all([
      UserModel.findById(profileUserId).select(
        "name email profileImage coverImage picture createdAt updatedAt"
      ),
      PostModel.find({ author: profileUserId })
        .populate("author", "name email profileImage coverImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PostModel.countDocuments({ author: profileUserId })
    ]);

    return {
      user,
      posts: posts.map((post) => mapPostWithReactions(post, context.userId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  dashboard: async (
    _args: unknown,
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    const user = await UserModel.findById(context.userId).select(
      "name email profileImage coverImage createdAt updatedAt"
    );

    if (!user) {
      throw new Error("User not found");
    }

    const [myPostsCount, myCommentsCount, unreadNotificationsCount, recentPosts] =
      await Promise.all([
        PostModel.countDocuments({ author: context.userId }),
        CommentModel.countDocuments({ author: context.userId }),
        NotificationModel.countDocuments({
          recipient: context.userId,
          isRead: false
        }),
        PostModel.find()
          .populate("author", "name email profileImage coverImage")
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

    return {
      user,
      stats: {
        myPostsCount,
        myCommentsCount,
        unreadNotificationsCount
      },
      recentPosts: recentPosts.map((post) =>
        mapPostWithReactions(post, context.userId)
      )
    };
  },

  post: async (
    args: { id: string },
    context: GraphQLContext
  ) => {
    const post = await PostModel.findById(args.id).populate(
      "author",
      "name email profileImage coverImage"
    );

    if (!post) {
      throw new Error("Post not found");
    }

    const comments = await CommentModel.find({ post: post._id })
      .populate("author", "name email profileImage")
      .sort({ createdAt: -1 });

    return {
      post: mapPostWithReactions(post, context.userId),
      comments: comments.map(mapComment)
    };
  },

  notifications: async (
    _args: unknown,
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    const notifications = await NotificationModel.find({
      recipient: context.userId
    })
      .populate("sender", "name email profileImage")
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "name email profileImage coverImage"
        }
      })
      .sort({ createdAt: -1 });

    return notifications.map(mapNotification);
  },

  activeStories: async () => {
    const stories = await StoryModel.find({
      expiresAt: { $gt: new Date() }
    })
      .populate("author", "name email profileImage coverImage")
      .sort({ createdAt: -1 });

    return stories.map(mapStory);
  },

  createPost: async (
    args: { content: string; image?: string },
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    const post = await PostModel.create({
      content: args.content,
      image: args.image,
      author: context.userId
    });

    const populatedPost = await PostModel.findById(post._id).populate(
      "author",
      "name email profileImage coverImage"
    );

    return mapPostWithReactions(populatedPost, context.userId);
  },

  addComment: async (
    args: { postId: string; content: string },
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    const post = await PostModel.findById(args.postId);

    if (!post) {
      throw new Error("Post not found");
    }

    const currentUser = await UserModel.findById(context.userId).select("name");

    const comment = await CommentModel.create({
      content: args.content,
      author: context.userId,
      post: post._id
    });

    if (post.author.toString() !== context.userId && currentUser) {
      await NotificationModel.create({
        recipient: post.author,
        sender: context.userId,
        post: post._id,
        comment: comment._id,
        type: "comment",
        message: `${currentUser.name} commented on your post`
      });
    }

    post.commentsCount += 1;
    await post.save();

    const populatedComment = await CommentModel.findById(comment._id).populate(
      "author",
      "name email profileImage"
    );

    return mapComment(populatedComment);
  },

  reactToPost: async (
    args: { postId: string; emoji: ReactionEmoji },
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    if (!allowedReactions.includes(args.emoji)) {
      throw new Error("Invalid reaction emoji");
    }

    const post = await PostModel.findById(args.postId).populate(
      "author",
      "name email profileImage coverImage"
    );

    if (!post) {
      throw new Error("Post not found");
    }

    const existingReaction = post.reactions.find(
      (reaction) => reaction.user.toString() === context.userId
    );

    if (existingReaction) {
      existingReaction.emoji = args.emoji;
    } else {
      post.reactions.push({
        user: new mongoose.Types.ObjectId(context.userId),
        emoji: args.emoji
      });
    }

    await post.save();

    return mapPostWithReactions(post, context.userId);
  },

  removeReaction: async (
    args: { postId: string },
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    const post = await PostModel.findById(args.postId).populate(
      "author",
      "name email profileImage coverImage"
    );

    if (!post) {
      throw new Error("Post not found");
    }

    post.reactions = post.reactions.filter(
      (reaction) => reaction.user.toString() !== context.userId
    );
    await post.save();

    return mapPostWithReactions(post, context.userId);
  },

  createStory: async (
    args: { text?: string; media?: string; backgroundColor?: string },
    context: GraphQLContext
  ) => {
    if (!context.userId) {
      throw new Error("Authentication required");
    }

    if (!args.text && !args.media) {
      throw new Error("Story must include text or media");
    }

    const story = await StoryModel.create({
      author: context.userId,
      text: args.text,
      media: args.media,
      backgroundColor: args.backgroundColor,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const populatedStory = await StoryModel.findById(story._id).populate(
      "author",
      "name email profileImage coverImage"
    );

    return mapStory(populatedStory);
  }
};

export const getGraphQLContext = async (authorization?: string) => {
  const userId = await getCurrentUserIdFromAuthHeader(authorization);
  return { userId };
};
