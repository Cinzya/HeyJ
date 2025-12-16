import { useEffect, useState, useRef, useCallback } from "react";
import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import Profile from "../objects/Profile";
import { getUnreadMessagesFromOtherUser } from "../utilities/conversationUtils";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";

export const useConversationAutoplay = (
  conversation: Conversation | null,
  otherProfile: Profile | null,
  profile: Profile | null
) => {
  const { autoplay } = useAudioSettings();
  const [currentUri, setCurrentUri] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const lastMessageCountRef = useRef<number>(0);
  const lastPlayedMessageIdRef = useRef<string | null>(null);

  // Function to find and play the next unheard message
  const playNextUnreadMessage = useCallback(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      setIsAutoPlaying(false);
      return;
    }

    // Get all messages sorted chronologically
    const sortedMessages = sortBy(conversation.messages, (m) => m.timestamp.getTime());

    // Find the current message by matching audioUrl
    const currentMessageIndex = sortedMessages.findIndex(
      (m) => m.audioUrl === currentUri
    );

    if (currentMessageIndex === -1) {
      console.log("❌ Current message not found");
      setIsAutoPlaying(false);
      return;
    }

    // Look for the next message in chronological order
    for (let i = currentMessageIndex + 1; i < sortedMessages.length; i++) {
      const nextMessage = sortedMessages[i];

      // Check if it's an incoming message (from other user)
      if (nextMessage.uid !== otherProfile.uid) {
        continue; // Skip outgoing messages
      }

      // If we encounter a read message, stop auto-play
      if (nextMessage.isRead) {
        console.log("✅ Next message is read, stopping auto-play");
        setIsAutoPlaying(false);
        return;
      }

      // Found an unread incoming message - play it
      console.log("▶️ Playing next unread message:", nextMessage.messageId, "URI:", nextMessage.audioUrl);
      // Small delay to ensure previous message has finished
      setTimeout(() => {
        setCurrentUri(nextMessage.audioUrl);
      }, 500);
      return;
    }

    // No more messages found
    console.log("✅ No more unread messages");
    setIsAutoPlaying(false);
  }, [autoplay, conversation, profile, otherProfile, currentUri]);

  // Auto-play new messages when they arrive and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      lastMessageCountRef.current = conversation?.messages.length || 0;
      return;
    }

    const currentMessageCount = conversation.messages.length;

    // Check if a new message was added (count increased)
    if (currentMessageCount > lastMessageCountRef.current) {
      // Find the newest unheard message from the other user
      const unheardMessages = getUnreadMessagesFromOtherUser(conversation, otherProfile.uid);

      if (unheardMessages.length > 0) {
        const newestUnheard = unheardMessages[0];

        // Only auto-play if this is a different message than we last played
        if (lastPlayedMessageIdRef.current !== newestUnheard.messageId) {
          console.log("🔔 New message received, autoplaying:", newestUnheard.messageId);
          lastPlayedMessageIdRef.current = newestUnheard.messageId;
          setIsAutoPlaying(true);
          setCurrentUri(newestUnheard.audioUrl);
        }
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [conversation?.messages.length, autoplay, profile?.uid, otherProfile?.uid, conversation?.messages, conversation, otherProfile, profile]);

  // Auto-play oldest unheard message when conversation opens and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      return;
    }

    // Small delay to ensure component is mounted
    setTimeout(() => {
      playNextUnreadMessage();
    }, 500);
  }, [conversation?.conversationId, autoplay, profile?.uid, otherProfile?.uid, playNextUnreadMessage, conversation, profile, otherProfile]);

  // Monitor when current message finishes playing to auto-play next
  useEffect(() => {
    if (!isAutoPlaying || !autoplay || !conversation || !otherProfile) {
      return;
    }

    // Check if any message is currently playing by checking if currentUri matches any message
    const currentMessage = conversation.messages.find(m => m.audioUrl === currentUri);
    if (!currentMessage) {
      return;
    }

    // We'll detect playback completion in RecordingPlayer and trigger next message
    // This effect will handle the transition
  }, [currentUri, isAutoPlaying, autoplay, conversation, otherProfile]);

  return { currentUri, setCurrentUri, isAutoPlaying, playNextUnreadMessage };
};

