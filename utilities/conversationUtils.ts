import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import Message from "../objects/Message";

/**
 * Get the timestamp of the last message in a conversation
 * @param conversation - The conversation to get the last message timestamp from
 * @returns The timestamp of the last message, or epoch date if no messages
 */
export const lastMessageTimestamp = (conversation: Conversation): Date => {
  if (conversation.messages.length === 0) {
    return new Date(0); // Return epoch for empty conversations
  }
  const messages = sortBy(conversation.messages, (m) => m.timestamp);
  const lastMessage = messages[messages.length - 1];
  return lastMessage.timestamp;
};

/**
 * Get the last message from the other user in a conversation
 * @param conversation - The conversation to search
 * @param currentUserId - The current user's ID to filter out
 * @returns The last message from the other user, or undefined if none
 */
export const lastMessageFromOtherUser = (
  conversation: Conversation,
  currentUserId: string
): Message | undefined => {
  const messages = sortBy(
    conversation.messages.filter((m) => m.uid !== currentUserId),
    (m) => m.timestamp
  );
  return messages[messages.length - 1];
};

/**
 * Get the other user's UID from a conversation
 * @param conversation - The conversation
 * @param currentUserId - The current user's ID
 * @returns The other user's UID, or undefined if not found
 */
export const getOtherUserUid = (
  conversation: Conversation,
  currentUserId: string
): string | undefined => {
  return conversation.uids.find((id) => id !== currentUserId);
};

/**
 * Get unread messages from the other user in a conversation
 * @param conversation - The conversation to search
 * @param otherUserUid - The other user's UID
 * @returns Array of unread messages from the other user, sorted by timestamp (newest first)
 */
export const getUnreadMessagesFromOtherUser = (
  conversation: Conversation,
  otherUserUid: string
): Message[] => {
  return conversation.messages
    .filter((m) => m.uid === otherUserUid && !m.isRead)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

/**
 * Calculate status indicator for a conversation based on message recency
 * @param conversation - The conversation to analyze
 * @param currentUserId - The current user's ID
 * @returns Object with icon and color for the status indicator
 */
export const getStatusIndicator = (
  conversation: Conversation,
  currentUserId: string
): { icon: string; color: string } => {
  const lastMessage = lastMessageFromOtherUser(conversation, currentUserId);
  if (!lastMessage) {
    return { icon: "question", color: "#808080" };
  }
  const hoursSinceLastMessage =
    (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastMessage < 24) {
    return { icon: "check", color: "#4CAF50" };
  } else {
    return { icon: "close", color: "#F44336" };
  }
};

