import { Response } from "express";
import NotificationModel from "../models/notification.model";
import { AuthenticatedRequest } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { successResponse } from "../utils/success-response";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const notifications = await NotificationModel.find({
      recipient: req.user._id
    })
      .populate("sender", "name email profileImage")
      .populate("post", "content image")
      .sort({ createdAt: -1 });

    return successResponse(res, "Notifications fetched successfully", {
      notifications
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

export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    const notification = await NotificationModel.findOne({
      _id: req.params.notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      throw new ApiError("Notification not found", 404);
    }

    notification.isRead = true;
    await notification.save();

    return successResponse(res, "Notification marked as read", {
      notification
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

export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      throw new ApiError("Authentication required", 401);
    }

    await NotificationModel.updateMany(
      {
        recipient: req.user._id,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    return successResponse(res, "All notifications marked as read");
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
