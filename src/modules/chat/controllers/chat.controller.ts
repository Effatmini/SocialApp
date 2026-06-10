import { Response } from "express";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../../../types/auth";
import { ApiError } from "../../../utils/api-error";
import { successResponse } from "../../../utils/success-response";
import { ChatRepository } from "../repositories/chat.repository";
import { ChatService } from "../services/chat.service";

const chatService = new ChatService(new ChatRepository());

const handleChatControllerError = (error: unknown, res: Response) => {
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
        : error
  });
};

const getCurrentUserId = (req: AuthenticatedRequest) => {
  const userId = req.user?._id?.toString();

  if (!userId) {
    throw new ApiError("Authentication required", 401);
  }

  return userId;
};

const getParam = (req: AuthenticatedRequest, paramName: string) => {
  const value = req.params[paramName];

  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(`${paramName} is required`, 400);
  }

  return value.trim();
};

const parsePagination = (req: AuthenticatedRequest) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const startConversation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const conversation = await chatService.startConversation(
      getCurrentUserId(req),
      req.body.recipientId
    );

    return successResponse(
      res,
      "Conversation ready successfully",
      { conversation },
      201
    );
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};

export const getMyConversations = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const conversations = await chatService.getMyConversations(
      getCurrentUserId(req)
    );

    return successResponse(res, "Conversations fetched successfully", {
      conversations
    });
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const message = await chatService.sendMessage({
      currentUserId: getCurrentUserId(req),
      conversationId: getParam(req, "conversationId"),
      text: req.body.text,
      media: req.body.media,
      tags: req.body.tags,
      attachments: req.body.attachments,
      attachment: req.body.attachment
    });

    return successResponse(
      res,
      "Message sent successfully",
      { message },
      201
    );
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};

export const reactToMessage = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const message = await chatService.reactToMessage({
      currentUserId: getCurrentUserId(req),
      messageId: getParam(req, "messageId"),
      emoji: req.body.emoji
    });

    return successResponse(res, "Message reaction updated successfully", {
      message
    });
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};

export const removeReactionFromMessage = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const message = await chatService.removeReactionFromMessage(
      getCurrentUserId(req),
      getParam(req, "messageId")
    );

    return successResponse(res, "Message reaction removed successfully", {
      message
    });
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};

export const getConversationMessages = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const result = await chatService.getConversationMessages({
      currentUserId: getCurrentUserId(req),
      conversationId: getParam(req, "conversationId"),
      page,
      limit,
      skip
    });

    return successResponse(res, "Messages fetched successfully", {
      messages: result.messages,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};

export const markConversationAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const conversation = await chatService.markConversationAsRead(
      getCurrentUserId(req),
      getParam(req, "conversationId")
    );

    return successResponse(res, "Conversation marked as read", {
      conversation
    });
  } catch (error) {
    return handleChatControllerError(error, res);
  }
};
