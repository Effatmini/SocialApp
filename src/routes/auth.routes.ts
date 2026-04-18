import { Router } from "express";
import {
  adminOnly,
  bootstrapAdmin,
  confirmEmail,
  forgotPassword,
  getProfile,
  getGoogleConfig,
  login,
  loginWithGoogle,
  logout,
  promoteToAdmin,
  refreshAccessToken,
  resetPassword,
  register,
  sendEmailOtp,
  signUp,
  uploadProfileImages,
  verifyEmailOtp
} from "../controllers/auth.controller";
import { authMiddleware, authorize } from "../middleware/auth.middleware";
import { uploadUserImages } from "../middleware/upload.middleware";

const router = Router();

router.post("/sign-up", signUp);
router.post("/signup", signUp);
router.post("/register", register);
router.get("/confirm-email", confirmEmail);
router.get("/google-config", getGoogleConfig);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/send-email-otp", sendEmailOtp);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/login", login);
router.post("/google", loginWithGoogle);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", authMiddleware, logout);
router.post("/bootstrap-admin", bootstrapAdmin);
router.get("/profile", authMiddleware, getProfile);
router.patch("/profile/images", authMiddleware, uploadUserImages, uploadProfileImages);
router.get("/admin", authMiddleware, authorize("admin"), adminOnly);
router.patch(
  "/make-admin",
  authMiddleware,
  authorize("admin"),
  promoteToAdmin
);

export default router;
