import { ApiError } from "../../../utils/api-error";
import { IMessageAttachment } from "../models/message.model";
import { ChatRepository } from "../repositories/chat.repository";

const allowedReactions = ["like", "love", "haha", "wow", "sad", "angry"];
const allowedAttachmentTypes = ["image", "video", "audio", "file"];

const parseMessageText = (text: unknown) =>
  typeof text === "string" ? text.trim() : undefined;

const parseMedia = (media: unknown) =>
  typeof media === "string" ? media.trim() : undefined;

const parseTags = (tags: unknown) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalizedTags = tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);

  return [...new Set(normalizedTags)].slice(0, 10);
};

const parseAttachments = (attachments: unknown, attachment: unknown) => {
  const rawAttachments = Array.isArray(attachments)
    ? attachments
    : attachment
      ? [attachment]
      : [];

  return rawAttachments.slice(0, 5).map((rawAttachment) => {
    if (!rawAttachment || typeof rawAttachment !== "object") {
      throw new ApiError("Invalid attachment", 400);
    }

    const attachmentRecord = rawAttachment as Record<string, unknown>;
    const url =
      typeof attachmentRecord.url === "string"
        ? attachmentRecord.url.trim()
        : "";
    const type =
      typeof attachmentRecord.type === "string"
        ? attachmentRecord.type.trim()
        : "";

    if (!url) {
      throw new ApiError("Attachment url is required", 400);
    }

    if (!allowedAttachmentTypes.includes(type)) {
      throw new ApiError(
        "Attachment type must be image, video, audio, or file",
        400
      );
    }

    return {
      url,
      type,
      name:
        typeof attachmentRecord.name === "string"
          ? attachmentRecord.name.trim()
          : undefined,
      size:
        typeof attachmentRecord.size === "number"
          ? attachmentRecord.size
          : undefined,
      mimeType:
        typeof attachmentRecord.mimeType === "string"
          ? attachmentRecord.mimeType.trim()
          : undefined
    } as IMessageAttachment;
  });
};

export class ChatService {
  constructor(private readonly chatRepository: ChatRepository) {}

  async startConversation(currentUserId: string, recipientId: unknown) {
    if (typeof recipientId !== "string" || !recipientId.trim()) {
      throw new ApiError("Recipient id is required", 400);
    }

    const normalizedRecipientId = recipientId.trim();

    if (currentUserId === normalizedRecipientId) {
      throw new ApiError("You cannot start a chat with yourself", 400);
    }

    const recipient = await this.chatRepository.findUserById(
      normalizedRecipientId
    );

    if (!recipient) {
      throw new ApiError("Recipient user not found", 404);
    }

    return this.chatRepository.findOrCreateDirectConversation(
      currentUserId,
      normalizedRecipientId
    );
  }

  getMyConversations(currentUserId: string) {
    return this.chatRepository.getUserConversations(currentUserId);
  }

  async sendMessage(params: {
    currentUserId: string;
    conversationId: string;
    text: unknown;
    media: unknown;
    tags: unknown;
    attachments: unknown;
    attachment: unknown;
  }) {
    const text = parseMessageText(params.text);
    const media = parseMedia(params.media);
    const tags = parseTags(params.tags);
    const attachments = parseAttachments(
      params.attachments,
      params.attachment
    );

    if (!text && !media && attachments.length === 0) {
      throw new ApiError("Message text, media, or attachment is required", 400);
    }

    const conversation = await this.chatRepository.getConversationForUser(
      params.conversationId,
      params.currentUserId
    );

    if (!conversation) {
      throw new ApiError("Conversation not found", 404);
    }

    return this.chatRepository.createMessage({
      conversation,
      senderId: params.currentUserId,
      text,
      media,
      tags,
      attachments
    });
  }

  async getConversationMessages(params: {
    currentUserId: string;
    conversationId: string;
    page: number;
    limit: number;
    skip: number;
  }) {
    const conversation = await this.chatRepository.getConversationForUser(
      params.conversationId,
      params.currentUserId
    );

    if (!conversation) {
      throw new ApiError("Conversation not found", 404);
    }

    return this.chatRepository.getMessages({
      conversationId: params.conversationId,
      page: params.page,
      limit: params.limit,
      skip: params.skip
    });
  }

  async markConversationAsRead(currentUserId: string, conversationId: string) {
    const conversation = await this.chatRepository.getConversationForUser(
      conversationId,
      currentUserId
    );

    if (!conversation) {
      throw new ApiError("Conversation not found", 404);
    }

    return this.chatRepository.markConversationAsRead(
      conversation,
      currentUserId
    );
  }

  async reactToMessage(params: {
    currentUserId: string;
    messageId: string;
    emoji: unknown;
  }) {
    if (typeof params.emoji !== "string" || !params.emoji.trim()) {
      throw new ApiError("Reaction emoji is required", 400);
    }

    const emoji = params.emoji.trim();

    if (!allowedReactions.includes(emoji)) {
      throw new ApiError("Invalid reaction emoji", 400);
    }

    await this.assertMessageParticipant(params.messageId, params.currentUserId);

    return this.chatRepository.reactToMessage(
      params.messageId,
      params.currentUserId,
      emoji
    );
  }

  async removeReactionFromMessage(currentUserId: string, messageId: string) {
    await this.assertMessageParticipant(messageId, currentUserId);

    return this.chatRepository.removeReactionFromMessage(
      messageId,
      currentUserId
    );
  }

  private async assertMessageParticipant(messageId: string, currentUserId: string) {
    const message = await this.chatRepository.getMessageById(messageId);

    if (!message) {
      throw new ApiError("Message not found", 404);
    }

    const conversation = await this.chatRepository.getConversationForUser(
      message.conversation.toString(),
      currentUserId
    );

    if (!conversation) {
      throw new ApiError("Message not found", 404);
    }

    return message;
  }
}
