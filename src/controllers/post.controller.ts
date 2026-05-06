import { Response } from "express";
import mongoose from "mongoose";
import CommentModel from "../models/comment.model";
import NotificationModel from "../models/notification.model";
import PostModel from "../models/post.model";
import UserModel from "../models/user.model";
import { AuthenticatedRequest } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { successResponse } from "../utils/success-response";

const allowedReactions = ["like", "love", "haha", "wow", "sad", "angry"] as const;
type ReactionEmoji = (typeof allowedReactions)[number];

const handlePostControllerError = (error: unknown, res: Response) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(error.errors)[0];

    return res.status(400).json({
      success: false,
      message: firstError?.message || "Validation failed"
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${error.path}`
    });
  }

  return res.status(500).json({
      success: false,
      message: "Server error",
      debug:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message
            }
          : error,
      error
  });
};

const parsePagination = (req: AuthenticatedRequest) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const mapPostWithReactions = (
  post: any,
  currentUserId?: string
) => {
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
      (reaction: { user: mongoose.Types.ObjectId | string; emoji: string }) =>
        reaction.user?.toString() === currentUserId
    )?.emoji || null;

  return {
    ...rawPost,
    reactionsCount: reactions.length,
    reactionCounts,
    myReaction
  };
};

export const createPost = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const { content, image } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      throw new ApiError("Post content is required", 400);
    }

    const post = await PostModel.create({
      content,
      image,
      author: req.user._id
    });

    const populatedPost = await PostModel.findById(post._id).populate(
      "author",
      "name email profileImage coverImage"
    );

    return successResponse(
      res,
      "Post created successfully",
      { post: mapPostWithReactions(populatedPost, req.user._id.toString()) },
      201
    );
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const getAllPosts = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const posts = await PostModel.find()
      .populate("author", "name email profileImage coverImage")
      .sort({ createdAt: -1 });

    return successResponse(res, "Posts fetched successfully", {
      posts: posts.map((post) => mapPostWithReactions(post))
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const getNewsFeed = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { page, limit, skip } = parsePagination(req);

    const [posts, total] = await Promise.all([
      PostModel.find()
        .populate("author", "name email profileImage coverImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PostModel.countDocuments()
    ]);

    return successResponse(res, "News feed fetched successfully", {
      posts: posts.map((post) =>
        mapPostWithReactions(post, req.user?._id?.toString())
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const getProfilePosts = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const profileUserId =
      typeof req.params.userId === "string" && req.params.userId.trim()
        ? req.params.userId.trim()
        : req.user?._id?.toString();

    if (!profileUserId) {
      throw new ApiError("User id is required", 400);
    }

    const { page, limit, skip } = parsePagination(req);

    const [user, posts, total] = await Promise.all([
      UserModel.findById(profileUserId).select(
        "name email profileImage coverImage picture createdAt"
      ),
      PostModel.find({ author: profileUserId })
        .populate("author", "name email profileImage coverImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PostModel.countDocuments({ author: profileUserId })
    ]);

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    return successResponse(res, "Profile posts fetched successfully", {
      user,
      posts: posts.map((post) =>
        mapPostWithReactions(post, req.user?._id?.toString())
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const currentUser = req.user;

    const [myPostsCount, myCommentsCount, unreadNotificationsCount, recentPosts] =
      await Promise.all([
        PostModel.countDocuments({ author: currentUser._id }),
        CommentModel.countDocuments({ author: currentUser._id }),
        NotificationModel.countDocuments({
          recipient: currentUser._id,
          isRead: false
        }),
        PostModel.find()
          .populate("author", "name email profileImage coverImage")
          .sort({ createdAt: -1 })
          .limit(5)
      ]);

    return successResponse(res, "Dashboard fetched successfully", {
      user: {
        _id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email,
        profileImage: currentUser.profileImage,
        coverImage: currentUser.coverImage
      },
      stats: {
        myPostsCount,
        myCommentsCount,
        unreadNotificationsCount
      },
      recentPosts: recentPosts.map((post) =>
        mapPostWithReactions(post, currentUser._id.toString())
      )
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const getPostById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const post = await PostModel.findById(req.params.postId).populate(
      "author",
      "name email profileImage coverImage"
    );

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    const comments = await CommentModel.find({ post: post._id })
      .populate("author", "name email profileImage")
      .sort({ createdAt: -1 });

    return successResponse(res, "Post fetched successfully", {
      post: mapPostWithReactions(post, req.user?._id?.toString()),
      comments
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const addComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const { content } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      throw new ApiError("Comment content is required", 400);
    }

    const post = await PostModel.findById(req.params.postId);

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    const comment = await CommentModel.create({
      content,
      author: req.user._id,
      post: post._id
    });

    if (post.author.toString() !== req.user._id.toString()) {
      await NotificationModel.create({
        recipient: post.author,
        sender: req.user._id,
        post: post._id,
        comment: comment._id,
        type: "comment",
        message: `${req.user.name} commented on your post`
      });
    }

    post.commentsCount += 1;
    await post.save();

    const populatedComment = await CommentModel.findById(comment._id).populate(
      "author",
      "name email profileImage"
    );

    return successResponse(
      res,
      "Comment added successfully",
      { comment: populatedComment },
      201
    );
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const updatePost = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const post = await PostModel.findById(req.params.postId);

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    const isOwner = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiError("Access denied", 403);
    }

    const updatedPost = await PostModel.findOneAndUpdate(
      { _id: req.params.postId },
      {
        $set: {
          content: req.body.content ?? post.content,
          image: req.body.image ?? post.image
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).populate("author", "name email profileImage coverImage");

    return successResponse(res, "Post updated successfully", {
      post: mapPostWithReactions(updatedPost, req.user._id.toString())
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const reactToPost = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const currentUser = req.user;

    const emoji = req.body.emoji as ReactionEmoji;

    if (!allowedReactions.includes(emoji)) {
      throw new ApiError("Invalid reaction emoji", 400);
    }

    const post = await PostModel.findById(req.params.postId).populate(
      "author",
      "name email profileImage coverImage"
    );

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    const existingReaction = post.reactions.find(
      (reaction) => reaction.user.toString() === currentUser._id.toString()
    );

    if (existingReaction) {
      existingReaction.emoji = emoji;
    } else {
      post.reactions.push({
        user: currentUser._id,
        emoji
      });
    }

    await post.save();

    return successResponse(res, "Reaction updated successfully", {
      post: mapPostWithReactions(post, currentUser._id.toString())
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const removeReactionFromPost = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const currentUser = req.user;

    const post = await PostModel.findById(req.params.postId).populate(
      "author",
      "name email profileImage coverImage"
    );

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    post.reactions = post.reactions.filter(
      (reaction) => reaction.user.toString() !== currentUser._id.toString()
    );

    await post.save();

    return successResponse(res, "Reaction removed successfully", {
      post: mapPostWithReactions(post, currentUser._id.toString())
    });
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const deletePost = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const post = await PostModel.findById(req.params.postId);

    if (!post) {
      throw new ApiError("Post not found", 404);
    }

    const isOwner = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiError("Access denied", 403);
    }

    await PostModel.deleteOne({ _id: post._id });

    return successResponse(res, "Post soft deleted successfully");
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};

export const deleteComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const comment = await CommentModel.findById(req.params.commentId);

    if (!comment) {
      throw new ApiError("Comment not found", 404);
    }

    const isOwner = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiError("Access denied", 403);
    }

    await comment.deleteOne();
    await PostModel.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 }
    });

    return successResponse(res, "Comment deleted successfully");
  } catch (error) {
    return handlePostControllerError(error, res);
  }
};
