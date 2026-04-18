import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Response } from "express";
import { getRedisClient } from "../config/redis";
import UserModel from "../models/user.model";
import { AuthenticatedRequest } from "../types/auth";
import { ApiError } from "../utils/api-error";
import { sendOtpEmail } from "../utils/email";
import { verifyGoogleIdToken } from "../utils/google";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/jwt";
import { successResponse } from "../utils/success-response";

const getAppBaseUrl = () =>
  process.env.APP_BASE_URL ||
  `http://localhost:${process.env.PORT || 5000}`;

const createEmailConfirmationData = () => {
  const emailConfirmationToken = crypto.randomBytes(32).toString("hex");
  const emailConfirmationExpires = new Date(Date.now() + 60 * 60 * 1000);

  return {
    emailConfirmationToken,
    emailConfirmationExpires
  };
};

const createPasswordResetData = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

  return {
    rawToken,
    hashedToken,
    passwordResetExpires
  };
};

const createOtpData = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  return { otp, hashedOtp };
};

const issueAuthTokens = async (user: InstanceType<typeof UserModel>) => {
  const payload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshToken = await bcrypt.hash(refreshToken, 10);
  user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();

  return { accessToken, refreshToken };
};

const createUserAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, phone, age } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new ApiError("Email already exists", 400);
    }

    const { emailConfirmationToken, emailConfirmationExpires } =
      createEmailConfirmationData();

    const user = new UserModel({
      name,
      email,
      password,
      phone,
      age,
      role: "user",
      isEmailConfirmed: false,
      emailConfirmationToken,
      emailConfirmationExpires
    });

    await user.save();

    const { accessToken, refreshToken } = await issueAuthTokens(user);
    const confirmationLink = `${getAppBaseUrl()}/api/auth/confirm-email?token=${emailConfirmationToken}`;

    return successResponse(
      res,
      "User signed up successfully. Please confirm your email.",
      {
        accessToken,
        refreshToken,
        confirmationLink,
        user
      },
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

export const signUp = createUserAccount;
export const register = createUserAccount;

export const confirmEmail = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { token } = req.query;

    if (typeof token !== "string" || !token.trim()) {
      throw new ApiError("Confirmation token is required", 400);
    }

    const user = await UserModel.findOne({
      emailConfirmationToken: token,
      emailConfirmationExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new ApiError("Invalid or expired token", 400);
    }

    user.isEmailConfirmed = true;
    user.emailConfirmationToken = undefined;
    user.emailConfirmationExpires = undefined;

    await user.save();

    return successResponse(res, "Email confirmed successfully");
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

export const login = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new ApiError("Invalid credentials", 400);
    }

    if (user.authProvider === "google") {
      throw new ApiError("This account uses Google login", 400);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError("Invalid credentials", 400);
    }

    if (!user.isEmailConfirmed) {
      throw new ApiError("Please confirm your email before logging in", 403);
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user);

    return successResponse(res, "Login successful", {
      accessToken,
      refreshToken,
      user
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

export const loginWithGoogle = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError("Google ID token is required", 400);
    }

    const payload = await verifyGoogleIdToken(idToken);

    if (!payload.sub || !payload.email) {
      throw new ApiError("Invalid Google account data", 400);
    }

    if (!payload.email_verified) {
      throw new ApiError("Google email is not verified", 403);
    }

    let user = await UserModel.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email }]
    });

    if (user && user.authProvider === "local" && !user.googleId) {
      user.googleId = payload.sub;
      user.authProvider = "google";
      user.picture = payload.picture;
      user.isEmailConfirmed = true;
      await user.save();
    }

    if (!user) {
      user = await UserModel.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        role: "user",
        authProvider: "google",
        googleId: payload.sub,
        picture: payload.picture,
        isEmailConfirmed: true
      });
    }

    const { accessToken, refreshToken } = await issueAuthTokens(user);

    return successResponse(res, "Google login successful", {
      accessToken,
      refreshToken,
      user
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    const message = error instanceof Error ? error.message : "Google login failed";

    return res.status(401).json({
      success: false,
      message
    });
  }
};

export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.json({
        message:
          "If an account with that email exists, a password reset link has been generated."
      });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account uses Google login"
      });
    }

    const { rawToken, hashedToken, passwordResetExpires } =
      createPasswordResetData();

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();

    const resetLink = `${getAppBaseUrl()}/api/auth/reset-password?token=${rawToken}`;

    return res.json({
      message: "Password reset link generated successfully",
      resetLink
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const sendEmailOtp = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const redis = await getRedisClient();
    const { otp, hashedOtp } = createOtpData();
    const otpKey = `email-otp:${email.toLowerCase()}`;

    await redis.set(
      otpKey,
      JSON.stringify({
        hashedOtp,
        userId: user._id.toString()
      }),
      {
        EX: 600
      }
    );

    const emailResult = await sendOtpEmail(email, otp);

    return res.json({
      message: "OTP sent successfully",
      preview: emailResult.preview
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const verifyEmailOtp = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const redis = await getRedisClient();
    const otpKey = `email-otp:${email.toLowerCase()}`;
    const storedValue = await redis.get(otpKey);

    if (!storedValue) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const parsedValue = JSON.parse(storedValue) as {
      hashedOtp: string;
      userId: string;
    };
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if (hashedOtp !== parsedValue.hashedOtp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const user = await UserModel.findById(parsedValue.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isEmailConfirmed = true;
    user.emailConfirmationToken = undefined;
    user.emailConfirmationExpires = undefined;
    await user.save();

    await redis.del(otpKey);

    return res.json({
      message: "Email verified successfully with OTP",
      user
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const token =
      typeof req.body.token === "string" && req.body.token.trim()
        ? req.body.token.trim()
        : typeof req.query.token === "string"
          ? req.query.token.trim()
          : "";

    const { newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Token, new password, and confirm password are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await UserModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = newPassword;
    user.isEmailConfirmed = true;
    user.emailConfirmationToken = undefined;
    user.emailConfirmationExpires = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;

    await user.save();

    return res.json({
      message: "Password reset successfully. Please log in again."
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const refreshAccessToken = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(refreshToken) as {
      id: string;
      role: "user" | "admin";
    };

    const user = await UserModel.findById(decoded.id);
    if (!user || !user.refreshToken || !user.refreshTokenExpiresAt) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (user.refreshTokenExpiresAt < new Date()) {
      user.refreshToken = undefined;
      user.refreshTokenExpiresAt = undefined;
      await user.save();
      return res.status(401).json({ message: "Refresh token expired" });
    }

    const isStoredTokenMatch = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    );

    if (!isStoredTokenMatch) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokens = await issueAuthTokens(user);

    return res.json({
      message: "Access token refreshed successfully",
      ...tokens
    });
  } catch (_error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    req.user.refreshToken = undefined;
    req.user.refreshTokenExpiresAt = undefined;
    await req.user.save();

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getGoogleConfig = async (
  _req: AuthenticatedRequest,
  res: Response
) => {
  return res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || ""
  });
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  return res.json({
    message: "Profile fetched successfully",
    user: req.user
  });
};

export const uploadProfileImages = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const profileImageFile =
      files?.profileImage?.[0] || files?.profile?.[0] || files?.avatar?.[0];
    const coverImageFile =
      files?.coverImage?.[0] || files?.cover?.[0] || files?.coverPhoto?.[0];

    if (!profileImageFile && !coverImageFile) {
      return res.status(400).json({
        message: "Please upload profileImage or coverImage"
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (profileImageFile) {
      req.user.profileImage = `${baseUrl}/uploads/users/${profileImageFile.filename}`;
    }

    if (coverImageFile) {
      req.user.coverImage = `${baseUrl}/uploads/users/${coverImageFile.filename}`;
    }

    await req.user.save();

    const uploadedFields: string[] = [];

    if (profileImageFile) {
      uploadedFields.push("profile image");
    }

    if (coverImageFile) {
      uploadedFields.push("cover image");
    }

    return res.json({
      message: `${uploadedFields.join(" and ")} uploaded successfully`,
      user: req.user
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const adminOnly = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  return res.json({
    message: "Welcome admin",
    user: req.user
  });
};

export const bootstrapAdmin = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email, adminSecret } = req.body;

    if (!email || !adminSecret) {
      return res
        .status(400)
        .json({ message: "Email and admin secret are required" });
    }

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Invalid admin secret" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "admin";
    await user.save();

    return res.json({
      message: "User promoted to admin successfully",
      user
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const promoteToAdmin = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "admin";
    await user.save();

    return res.json({
      message: "User promoted to admin successfully",
      user
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
