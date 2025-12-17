import { create } from "zustand";
import Conversation from "../objects/Conversation";
import Message from "../objects/Message";
import { updateLastRead } from "../utilities/UpdateConversation";
import { getUnreadMessagesFromOtherUser } from "../utilities/conversationUtils";
import { playAudioFromUri } from "../services/audioService";
import { markMessageAsRead } from "../utilities/MarkMessageAsRead";
import { AudioPlayer, AudioPlayerStatus } from "../types/audio";
import { sortBy } from "lodash";
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from "react-native-onesignal";

interface NotificationData {
  conversationId?: string;
  messageUrl?: string;
}

interface AudioPlaybackState {
  currentlyPlayingConversationId: string | null;
  currentlyPlayingMessageId: string | null;
  currentlyPlayingUri: string | null;
  lastMessageCounts: Record<string, number>;
  audioPlayer: AudioPlayer | null;
  playerStatus: AudioPlayerStatus | null;
  autoplayEnabled: boolean;
  conversations: Conversation[];
  profileId: string | undefined;
  updateMessageReadStatus: ((messageId: string) => void) | undefined;
  speakerMode: boolean;
  setAudioPlayer: (player: AudioPlayer) => void;
  setPlayerStatus: (status: AudioPlayerStatus) => void;
  setCurrentlyPlaying: (conversationId: string | null) => void;
  clearCurrentlyPlaying: () => void;
  updateMessageCount: (conversationId: string, count: number) => void;
  playFromUri: (uri: string, conversationId?: string, audioPlayer?: AudioPlayer, messageId?: string) => Promise<void>;
  handleAutoPlay: (
    conversations: Conversation[],
    autoplay: boolean,
    profileId: string | undefined,
    audioPlayer: AudioPlayer,
    updateMessageReadStatus?: (messageId: string) => void,
    speakerMode?: boolean
  ) => void;
  playNextUnreadMessage: () => void;
  initializeNotificationHandlers: (
    setSelectedConversation: (id: string) => void,
    profileId: string,
    audioPlayer: AudioPlayer
  ) => () => void;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  currentlyPlayingConversationId: null,
  currentlyPlayingMessageId: null,
  currentlyPlayingUri: null,
  lastMessageCounts: {},
  audioPlayer: null,
  playerStatus: null,
  autoplayEnabled: false,
  conversations: [],
  profileId: undefined,
  updateMessageReadStatus: undefined,
  speakerMode: false,

  setAudioPlayer: (player) => {
    set({ audioPlayer: player });
  },

  setPlayerStatus: (status) => {
    const prevStatus = get().playerStatus;
    const messageId = get().currentlyPlayingMessageId;
    let playbackFinished = false;
    
    // Add debug logging for playback status changes
    if (messageId && prevStatus?.playing !== status?.playing) {
      console.log("🔊 Playback status changed:", {
        messageId,
        wasPlaying: prevStatus?.playing,
        nowPlaying: status?.playing,
        prevTime: prevStatus?.currentTime,
        prevDuration: prevStatus?.duration,
        currentTime: status?.currentTime,
        currentDuration: status?.duration,
      });
    }
    
    set({ playerStatus: status });
    
    // Mark message as read when playback finishes (reaches the end)
    // Check multiple conditions to catch different completion scenarios
    const reachedEndPrev = prevStatus?.duration && 
                           prevStatus?.currentTime !== undefined && 
                           prevStatus.duration > 0 && 
                           prevStatus.currentTime >= prevStatus.duration - 0.1;
    
    const reachedEndCurrent = status?.duration && 
                              status?.currentTime !== undefined && 
                              status.duration > 0 && 
                              status.currentTime >= status.duration - 0.1;
    
    if (
      messageId &&
      !playbackFinished &&
      prevStatus?.playing && // Was playing
      !status?.playing && // Now stopped/paused
      (reachedEndPrev || reachedEndCurrent) // Reached the end
    ) {
      console.log("✅ Audio playback finished completely - marking message as read:", messageId, {
        prevTime: prevStatus?.currentTime,
        prevDuration: prevStatus?.duration,
        currentTime: status?.currentTime,
        currentDuration: status?.duration,
        reachedEndPrev,
        reachedEndCurrent
      });
      markMessageAsRead(messageId).then((success) => {
        if (success) {
          console.log("✅ Message marked as read, updating conversation state");
          // Update ConversationsProvider state (source of truth for UI)
          const { updateMessageReadStatus: updateReadStatus, conversations, currentlyPlayingConversationId } = get();
          if (updateReadStatus) {
            updateReadStatus(messageId);
            console.log("✅ ConversationsProvider state updated");
            // Also update store's conversations to keep in sync
            if (currentlyPlayingConversationId) {
              const updatedConversations = conversations.map((conv) => {
                if (conv.conversationId === currentlyPlayingConversationId) {
                  const messageIndex = conv.messages.findIndex((m) => m.messageId === messageId);
                  if (messageIndex !== -1) {
                    const updatedMessages = [...conv.messages];
                    const originalMessage = updatedMessages[messageIndex];
                    // Create a new Message instance with updated isRead property
                    updatedMessages[messageIndex] = new Message(
                      originalMessage.messageId,
                      originalMessage.timestamp,
                      originalMessage.uid,
                      originalMessage.audioUrl,
                      true // isRead = true
                    );
                    // Create a new Conversation instance with updated messages
                    return new Conversation(
                      conv.conversationId,
                      conv.uids,
                      updatedMessages,
                      conv.lastRead
                    );
                  }
                }
                return conv;
              });
              set({ conversations: updatedConversations });
            }
          } else {
            console.log("⚠️ updateMessageReadStatus not available, updating store only");
            // Fallback: Update the store's conversation object
            if (currentlyPlayingConversationId) {
              const updatedConversations = conversations.map((conv) => {
                if (conv.conversationId === currentlyPlayingConversationId) {
                  const messageIndex = conv.messages.findIndex((m) => m.messageId === messageId);
                  if (messageIndex !== -1) {
                    const updatedMessages = [...conv.messages];
                    const originalMessage = updatedMessages[messageIndex];
                    // Create a new Message instance with updated isRead property
                    updatedMessages[messageIndex] = new Message(
                      originalMessage.messageId,
                      originalMessage.timestamp,
                      originalMessage.uid,
                      originalMessage.audioUrl,
                      true // isRead = true
                    );
                    // Create a new Conversation instance with updated messages
                    return new Conversation(
                      conv.conversationId,
                      conv.uids,
                      updatedMessages,
                      conv.lastRead
                    );
                  }
                }
                return conv;
              });
              set({ conversations: updatedConversations });
            }
          }
          console.log("✅ Continuing autoplay sequence");
        } else {
          console.log("⚠️ Failed to mark message as read, but continuing autoplay sequence");
        }
      });
      // Clear the messageId after marking as read
      set({ currentlyPlayingMessageId: null });
      playbackFinished = true;
    }
    
    // Also check current status in case we missed the transition
    // (e.g., if status updates come in a different order)
    // Only process if we haven't already handled playback finish above
    if (
      !playbackFinished &&
      messageId &&
      !status?.playing && // Not playing now
      reachedEndCurrent // At or past the end
    ) {
      console.log("✅ Audio playback finished (current status check) - marking message as read:", messageId, {
        currentTime: status.currentTime,
        duration: status.duration
      });
      markMessageAsRead(messageId).then((success) => {
        if (success) {
          console.log("✅ Message marked as read, updating conversation state");
          // Update ConversationsProvider state (source of truth for UI)
          const { updateMessageReadStatus: updateReadStatus, conversations, currentlyPlayingConversationId } = get();
          if (updateReadStatus) {
            updateReadStatus(messageId);
            console.log("✅ ConversationsProvider state updated");
            // Also update store's conversations to keep in sync
            if (currentlyPlayingConversationId) {
              const updatedConversations = conversations.map((conv) => {
                if (conv.conversationId === currentlyPlayingConversationId) {
                  const messageIndex = conv.messages.findIndex((m) => m.messageId === messageId);
                  if (messageIndex !== -1) {
                    const updatedMessages = [...conv.messages];
                    const originalMessage = updatedMessages[messageIndex];
                    // Create a new Message instance with updated isRead property
                    updatedMessages[messageIndex] = new Message(
                      originalMessage.messageId,
                      originalMessage.timestamp,
                      originalMessage.uid,
                      originalMessage.audioUrl,
                      true // isRead = true
                    );
                    // Create a new Conversation instance with updated messages
                    return new Conversation(
                      conv.conversationId,
                      conv.uids,
                      updatedMessages,
                      conv.lastRead
                    );
                  }
                }
                return conv;
              });
              set({ conversations: updatedConversations });
            }
          } else {
            console.log("⚠️ updateMessageReadStatus not available, updating store only");
            // Fallback: Update the store's conversation object
            if (currentlyPlayingConversationId) {
              const updatedConversations = conversations.map((conv) => {
                if (conv.conversationId === currentlyPlayingConversationId) {
                  const messageIndex = conv.messages.findIndex((m) => m.messageId === messageId);
                  if (messageIndex !== -1) {
                    const updatedMessages = [...conv.messages];
                    const originalMessage = updatedMessages[messageIndex];
                    // Create a new Message instance with updated isRead property
                    updatedMessages[messageIndex] = new Message(
                      originalMessage.messageId,
                      originalMessage.timestamp,
                      originalMessage.uid,
                      originalMessage.audioUrl,
                      true // isRead = true
                    );
                    // Create a new Conversation instance with updated messages
                    return new Conversation(
                      conv.conversationId,
                      conv.uids,
                      updatedMessages,
                      conv.lastRead
                    );
                  }
                }
                return conv;
              });
              set({ conversations: updatedConversations });
            }
          }
          console.log("✅ Continuing autoplay sequence");
        } else {
          console.log("⚠️ Failed to mark message as read, but continuing autoplay sequence");
        }
      });
      set({ currentlyPlayingMessageId: null });
      playbackFinished = true;
    }
    
    // Continue autoplay sequence if playback finished and autoplay is enabled
    if (playbackFinished && get().autoplayEnabled) {
      console.log("🔄 Continuing autoplay sequence...");
      setTimeout(() => {
        get().playNextUnreadMessage();
      }, 500);
    }
    
    // Clear currently playing conversation when playback stops
    // (but keep messageId if playback was interrupted, in case user resumes)
    if (!status?.playing && get().currentlyPlayingConversationId) {
      const reachedEnd = status?.currentTime !== undefined && 
                         status?.duration && 
                         status.duration > 0 &&
                         status.currentTime >= status.duration - 0.1;
      
      if (reachedEnd || !messageId) {
        // Playback finished or no message to track - clear everything
        set({ currentlyPlayingConversationId: null, currentlyPlayingMessageId: null });
      } else {
        // Playback was interrupted - clear conversation but keep messageId
        set({ currentlyPlayingConversationId: null });
      }
    }
  },

  setCurrentlyPlaying: (conversationId) => {
    set({ currentlyPlayingConversationId: conversationId });
  },

  clearCurrentlyPlaying: () => {
    set({ currentlyPlayingConversationId: null });
  },

  updateMessageCount: (conversationId, count) => {
    set((state) => ({
      lastMessageCounts: {
        ...state.lastMessageCounts,
        [conversationId]: count,
      },
    }));
  },

  playFromUri: async (uri: string, conversationId?: string, audioPlayer?: any, messageId?: string) => {
    const player = audioPlayer || get().audioPlayer;
    if (!player) {
      console.error("❌ Error playing audio: Audio player not available");
      return;
    }

    console.log("🎵 playFromUri called:", { uri, conversationId, messageId, hasPlayer: !!player });
    
    if (conversationId) {
      set({ currentlyPlayingConversationId: conversationId });
    }
    
    // Store messageId and URI to mark as read when playback actually starts and to find next message
    if (messageId) {
      set({ currentlyPlayingMessageId: messageId });
    }
    set({ currentlyPlayingUri: uri });

    const { speakerMode } = get();
    await playAudioFromUri(
      uri,
      player,
      conversationId,
      conversationId ? (id: string) => set({ currentlyPlayingConversationId: id }) : undefined,
      speakerMode
    );
  },

  playNextUnreadMessage: () => {
    const { currentlyPlayingConversationId, currentlyPlayingUri, autoplayEnabled, conversations, profileId, audioPlayer } = get();
    
    if (!autoplayEnabled || !currentlyPlayingConversationId || !currentlyPlayingUri || !profileId || !audioPlayer) {
      return;
    }

    const conversation = conversations.find(c => c.conversationId === currentlyPlayingConversationId);
    if (!conversation) {
      return;
    }

    const otherUserUid = conversation.uids.find((id) => id !== profileId);
    if (!otherUserUid) {
      return;
    }

    // Get all messages sorted chronologically
    const sortedMessages = sortBy(conversation.messages, (m) => m.timestamp.getTime());
    
    // Find the current message by matching audioUrl
    const currentMessageIndex = sortedMessages.findIndex(
      (m) => m.audioUrl === currentlyPlayingUri
    );

    if (currentMessageIndex === -1) {
      console.log("❌ Current message not found for next playback");
      return;
    }

    // Look for the next unread message in chronological order
    for (let i = currentMessageIndex + 1; i < sortedMessages.length; i++) {
      const nextMessage = sortedMessages[i];

      // Check if it's an incoming message (from other user)
      if (nextMessage.uid !== otherUserUid) {
        continue; // Skip outgoing messages
      }

      // If we encounter a read message, stop auto-play
      if (nextMessage.isRead) {
        console.log("✅ Next message is read, stopping auto-play");
        return;
      }

      // Found an unread incoming message - play it
      console.log("▶️ Playing next unread message:", nextMessage.messageId, "URI:", nextMessage.audioUrl);
      const { speakerMode } = get();
      get().playFromUri(nextMessage.audioUrl, currentlyPlayingConversationId, audioPlayer, nextMessage.messageId);
      // Note: speakerMode is already passed through playFromUri -> playAudioFromUri
      return;
    }

    // No more messages found
    console.log("✅ No more unread messages");
  },

  handleAutoPlay: (conversations, autoplay, profileId, audioPlayer, updateMessageReadStatus, speakerMode) => {
    // Store conversations, autoplay state, profileId, updateMessageReadStatus, and speakerMode for use in playNextUnreadMessage
    set({ conversations, autoplayEnabled: autoplay, profileId, updateMessageReadStatus, speakerMode });
    
    if (!autoplay || !profileId || conversations.length === 0) {
      // Update message counts
      conversations.forEach((c) => {
        get().updateMessageCount(c.conversationId, c.messages.length);
      });
      return;
    }

    const { currentlyPlayingConversationId, lastMessageCounts } = get();
    
    // Track if this is the first time we're seeing any conversations (initial app load)
    const isInitialLoad = Object.keys(lastMessageCounts).length === 0;

    // Check each conversation for unread messages
    conversations.forEach((conversation) => {
      const currentCount = conversation.messages.length;
      const lastCount = lastMessageCounts[conversation.conversationId];
      const isNewMessage = lastCount !== undefined && currentCount > lastCount;

      const otherUserUid = conversation.uids.find((id) => id !== profileId);
      if (!otherUserUid) {
        get().updateMessageCount(conversation.conversationId, currentCount);
        return;
      }

      // Find unread messages from the other user
      const unheardMessages = getUnreadMessagesFromOtherUser(conversation, otherUserUid);

      if (unheardMessages.length > 0) {
        const newestUnheard = unheardMessages[0];
        // For initial load, get the oldest unread message (last in array since sorted newest first)
        const oldestUnheard = unheardMessages[unheardMessages.length - 1];

        // Only auto-play if:
        // 1. We're not already playing something from this conversation
        // 2. This is a new message (count increased) OR it's the first time we're seeing this conversation with unread messages
        //    OR autoplay was just re-enabled and nothing is currently playing
        if (currentlyPlayingConversationId !== conversation.conversationId) {
          if (isNewMessage) {
            // New message arrived - autoplay it (newest)
            console.log(
              "🔔 New message received on home screen, autoplaying:",
              newestUnheard.messageId
            );
            get().playFromUri(newestUnheard.audioUrl, conversation.conversationId, audioPlayer, newestUnheard.messageId);
            // Message will be marked as read when playback finishes (via setPlayerStatus)
          } else if (lastCount === undefined || isInitialLoad) {
            // First time seeing this conversation OR initial app load - autoplay the OLDEST unread message
            // This handles the case when user opens the app with unread messages
            // We play from oldest to newest so messages play in chronological order
            console.log(
              "🔔 First load with unread message(s), autoplaying oldest:",
              oldestUnheard.messageId,
              `(${unheardMessages.length} unread message(s) total)`,
              isInitialLoad ? "[INITIAL APP LOAD]" : "[NEW CONVERSATION]"
            );
            get().playFromUri(oldestUnheard.audioUrl, conversation.conversationId, audioPlayer, oldestUnheard.messageId);
            // Message will be marked as read when playback finishes (via setPlayerStatus)
          } else if (currentlyPlayingConversationId === null && lastCount !== undefined) {
            // Autoplay was re-enabled and nothing is currently playing - start from oldest unread
            // This handles the case when user toggles autoplay back on
            console.log(
              "🔔 Autoplay re-enabled, starting from oldest unread:",
              oldestUnheard.messageId,
              `(${unheardMessages.length} unread message(s) total)`
            );
            get().playFromUri(oldestUnheard.audioUrl, conversation.conversationId, audioPlayer, oldestUnheard.messageId);
            // Message will be marked as read when playback finishes (via setPlayerStatus)
          }
        }
      }

      // Always update the message count
      get().updateMessageCount(conversation.conversationId, currentCount);
    });
  },

  initializeNotificationHandlers: (setSelectedConversation, profileId, audioPlayer) => {
    const onForeground = (event: NotificationWillDisplayEvent) => {
      const data = event.notification.additionalData as NotificationData;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);
        get().playFromUri(data.messageUrl, data.conversationId, audioPlayer);
        updateLastRead(data.conversationId, profileId);
      }
    };

    const onClick = (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as NotificationData;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);
        get().playFromUri(data.messageUrl, data.conversationId, audioPlayer);
        updateLastRead(data.conversationId, profileId);
      }
    };

    OneSignal.Notifications.addEventListener("foregroundWillDisplay", onForeground);
    OneSignal.Notifications.addEventListener("click", onClick);

    // Return cleanup function
    return () => {
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        onForeground
      );
      OneSignal.Notifications.removeEventListener("click", onClick);
    };
  },
}));

