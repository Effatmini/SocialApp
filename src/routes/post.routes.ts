import { Router } from "express";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  getAllPosts,
  getPostById,
  updatePost
} from "../controllers/post.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getAllPosts);
router.get("/:postId", getPostById);
router.post("/", authMiddleware, createPost);
router.patch("/:postId", authMiddleware, updatePost);
router.post("/:postId/comments", authMiddleware, addComment);
router.delete("/:postId", authMiddleware, deletePost);
router.delete("/:postId/comments/:commentId", authMiddleware, deleteComment);

export default router;
