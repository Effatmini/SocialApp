import { Router } from "express";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getDashboard,
  getAllPosts,
  getNewsFeed,
  getPostById,
  getProfilePosts,
  reactToPost,
  removeReactionFromPost,
  updatePost
} from "../controllers/post.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getAllPosts);
router.get("/feed/news", authMiddleware, getNewsFeed);
router.get("/dashboard/summary", authMiddleware, getDashboard);
router.get("/profile/me", authMiddleware, getProfilePosts);
router.get("/profile/:userId", getProfilePosts);
router.get("/:postId", getPostById);
router.post("/", authMiddleware, createPost);
router.post("/:postId/react", authMiddleware, reactToPost);
router.delete("/:postId/react", authMiddleware, removeReactionFromPost);
router.patch("/:postId", authMiddleware, updatePost);
router.post("/:postId/comments", authMiddleware, addComment);
router.delete("/:postId", authMiddleware, deletePost);
router.delete("/:postId/comments/:commentId", authMiddleware, deleteComment);

export default router;
