import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth.middleware";
import {
  getConversationMessages,
  getMyConversations,
  markConversationAsRead,
  reactToMessage,
  removeReactionFromMessage,
  sendMessage,
  startConversation
} from "../controllers/chat.controller";

const router = Router();

router.use(authMiddleware);

router.post("/conversations", startConversation);
router.get("/conversations", getMyConversations);
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.patch("/conversations/:conversationId/read", markConversationAsRead);
router.post("/messages/:messageId/reactions", reactToMessage);
router.delete("/messages/:messageId/reactions", removeReactionFromMessage);

export default router;
