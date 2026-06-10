import mongoose, { Types } from "mongoose";
import UserModel from "../../../models/user.model";
import ConversationModel, {
  IConversation
} from "../models/conversation.model";
import MessageModel, { IMessageAttachment } from "../models/message.model";

const createDirectConversationKey = (
  firstUserId: string,
  secondUserId: string
) => [firstUserId, secondUserId].sort().join(":");

export class ChatRepository {
  findUserById(userId: string) {
    return UserModel.findById(userId);
  }

  async findOrCreateDirectConversation(
    currentUserId: string,
    recipientId: string
  ) {
    const conversationKey = createDirectConversationKey(
      currentUserId,
      recipientId
    );

    const existingConversation = await ConversationModel.findOne({
      conversationKey
    })
      .populate("participants", "name email profileImage picture")
      .populate("lastMessage");

    if (existingConversation) {
      return existingConversation;
    }

    const conversation = await ConversationModel.create({
      participants: [
        new Types.ObjectId(currentUserId),
        new Types.ObjectId(recipientId)
      ],
      conversationKey,
      unreadCounts: {
        [currentUserId]: 0,
        [recipientId]: 0
      }
    });

    return ConversationModel.findById(conversation._id)
      .populate("participants", "name email profileImage picture")
      .populate("lastMessage");
  }

  getUserConversations(userId: string) {
    return ConversationModel.find({
      participants: new Types.ObjectId(userId)
    })
      .populate("participants", "name email profileImage picture")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1, updatedAt: -1 });
  }

  getConversationForUser(conversationId: string, userId: string) {
    return ConversationModel.findOne({
      _id: conversationId,
      participants: new Types.ObjectId(userId)
    });
  }

  async createMessage(params: {
    conversation: IConversation;
    senderId: string;
    text?: string;
    media?: string;
    tags: string[];
    attachments: IMessageAttachment[];
  }) {
    const senderObjectId = new Types.ObjectId(params.senderId);

    const message = await MessageModel.create({
      conversation: params.conversation._id,
      sender: senderObjectId,
      text: params.text,
      media: params.media,
      tags: params.tags,
      attachments: params.attachments,
      readBy: [
        {
          user: senderObjectId,
          readAt: new Date()
        }
      ]
    });

    params.conversation.lastMessage = message._id as Types.ObjectId;
    params.conversation.lastMessageText =
      params.text ||
      (params.attachments.length > 0 ? "Attachment message" : "Media message");
    params.conversation.lastMessageAt = message.createdAt;

    params.conversation.participants.forEach((participantId) => {
      const participantKey = participantId.toString();

      if (participantKey === params.senderId) {
        params.conversation.unreadCounts.set(participantKey, 0);
        return;
      }

      const currentCount =
        params.conversation.unreadCounts.get(participantKey) || 0;
      params.conversation.unreadCounts.set(participantKey, currentCount + 1);
    });

    await params.conversation.save();

    return MessageModel.findById(message._id)
      .populate("sender", "name email profileImage picture")
      .populate("conversation");
  }

  async getMessages(params: {
    conversationId: string;
    page: number;
    limit: number;
    skip: number;
  }) {
    const query = { conversation: new Types.ObjectId(params.conversationId) };

    const [messages, total] = await Promise.all([
      MessageModel.find(query)
        .populate("sender", "name email profileImage picture")
        .sort({ createdAt: -1 })
        .skip(params.skip)
        .limit(params.limit),
      MessageModel.countDocuments(query)
    ]);

    return {
      messages: messages.reverse(),
      total
    };
  }

  async markConversationAsRead(conversation: IConversation, userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const readAt = new Date();

    await MessageModel.updateMany(
      {
        conversation: conversation._id,
        sender: { $ne: userObjectId },
        "readBy.user": { $ne: userObjectId }
      },
      {
        $push: {
          readBy: {
            user: userObjectId,
            readAt
          }
        }
      }
    );

    conversation.unreadCounts.set(userId, 0);
    await conversation.save();

    return ConversationModel.findById(conversation._id)
      .populate("participants", "name email profileImage picture")
      .populate("lastMessage");
  }

  getMessageById(messageId: string) {
    return MessageModel.findById(messageId);
  }

  async reactToMessage(messageId: string, userId: string, emoji: string) {
    const userObjectId = new Types.ObjectId(userId);

    await MessageModel.updateOne(
      { _id: new Types.ObjectId(messageId) },
      { $pull: { reactions: { user: userObjectId } } }
    );

    return MessageModel.findByIdAndUpdate(
      messageId,
      {
        $push: {
          reactions: {
            user: userObjectId,
            emoji,
            createdAt: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate("sender", "name email profileImage picture")
      .populate("reactions.user", "name email profileImage picture");
  }

  removeReactionFromMessage(messageId: string, userId: string) {
    return MessageModel.findByIdAndUpdate(
      messageId,
      {
        $pull: {
          reactions: {
            user: new Types.ObjectId(userId)
          }
        }
      },
      { new: true }
    )
      .populate("sender", "name email profileImage picture")
      .populate("reactions.user", "name email profileImage picture");
  }
}
