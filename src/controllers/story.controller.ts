import { Response } from "express";
import mongoose from "mongoose";
import StoryModel from "../models/story.model";
import { AuthenticatedRequest } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { successResponse } from "../utils/success-response";

const handleStoryError = (error: unknown, res: Response) => {
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

  return res.status(500).json({
    success: false,
    message: "Server error",
    error
  });
};

const activeStoriesFilter = {
  expiresAt: { $gt: new Date() }
};

export const createStory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : undefined;
    const backgroundColor =
      typeof req.body.backgroundColor === "string"
        ? req.body.backgroundColor.trim()
        : undefined;
    const file = req.file;

    if (!text && !file) {
      throw new ApiError("Story must include text or media", 400);
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const media = file ? `${baseUrl}/uploads/stories/${file.filename}` : undefined;

    const story = await StoryModel.create({
      author: req.user._id,
      text,
      media,
      backgroundColor,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const populatedStory = await StoryModel.findById(story._id).populate(
      "author",
      "name email profileImage coverImage"
    );

    return successResponse(
      res,
      "Story created successfully and will vanish after 24 hours",
      { story: populatedStory },
      201
    );
  } catch (error) {
    return handleStoryError(error, res);
  }
};

export const getActiveStories = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const stories = await StoryModel.find(activeStoriesFilter)
      .populate("author", "name email profileImage coverImage")
      .sort({ createdAt: -1 });

    return successResponse(res, "Active stories fetched successfully", {
      stories
    });
  } catch (error) {
    return handleStoryError(error, res);
  }
};

export const getMyActiveStories = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const stories = await StoryModel.find({
      ...activeStoriesFilter,
      author: req.user._id
    })
      .populate("author", "name email profileImage coverImage")
      .sort({ createdAt: -1 });

    return successResponse(res, "My active stories fetched successfully", {
      stories
    });
  } catch (error) {
    return handleStoryError(error, res);
  }
};

export const deleteStory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const story = await StoryModel.findById(req.params.storyId);

    if (!story) {
      throw new ApiError("Story not found", 404);
    }

    const isOwner = story.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new ApiError("Access denied", 403);
    }

    await story.deleteOne();

    return successResponse(res, "Story deleted successfully");
  } catch (error) {
    return handleStoryError(error, res);
  }
};
