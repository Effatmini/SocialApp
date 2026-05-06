import { Router } from "express";
import {
  createStory,
  deleteStory,
  getActiveStories,
  getMyActiveStories
} from "../controllers/story.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadStoryMedia } from "../middleware/upload.middleware";

const router = Router();

router.get("/", getActiveStories);
router.get("/me", authMiddleware, getMyActiveStories);
router.post("/", authMiddleware, uploadStoryMedia, createStory);
router.delete("/:storyId", authMiddleware, deleteStory);

export default router;
