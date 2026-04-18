import { Response } from "express";
import CommentModel from "../models/comment.model";
import NotificationModel from "../models/notification.model";
import PostModel from "../models/post.model";
import { AuthenticatedRequest } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { successResponse } from "../utils/success-response";

export const createPost = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const { content, image } = req.body;

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
      { post: populatedPost },
      201
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
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

    return successResponse(res, "Posts fetched successfully", { posts });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
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
      post,
      comments
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
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
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
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
      post: updatedPost
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
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
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
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
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error
    });
  }
};
