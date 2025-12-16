import { create } from "zustand";
import Conversation from "../objects/Conversation";
import { updateLastRead } from "../utilities/UpdateConversation";
import { getUnreadMessagesFromOtherUser } from "../utilities/conversationUtils";
import { playAudioFromUri } from "../services/audioService";
import { AudioPlayer, AudioPlayerStatus } from "../types/audio";
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
  lastMessageCounts: Record<string, number>;
  audioPlayer: AudioPlayer | null;
  playerStatus: AudioPlayerStatus | null;
  setAudioPlayer: (player: AudioPlayer) => void;
  setPlayerStatus: (status: AudioPlayerStatus) => void;
  setCurrentlyPlaying: (conversationId: string | null) => void;
  clearCurrentlyPlaying: () => void;
  updateMessageCount: (conversationId: string, count: number) => void;
  playFromUri: (uri: string, conversationId?: string, audioPlayer?: AudioPlayer) => Promise<void>;
  handleAutoPlay: (
    conversations: Conversation[],
    autoplay: boolean,
    profileId: string | undefined,
    audioPlayer: AudioPlayer
  ) => void;
  initializeNotificationHandlers: (
    setSelectedConversation: (id: string) => void,
    profileId: string,
    audioPlayer: AudioPlayer
  ) => () => void;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  currentlyPlayingConversationId: null,
  lastMessageCounts: {},
  audioPlayer: null,
  playerStatus: null,

  setAudioPlayer: (player) => {
    set({ audioPlayer: player });
  },

  setPlayerStatus: (status) => {
    set({ playerStatus: status });
    // Clear currently playing when playback stops
    if (!status?.playing && get().currentlyPlayingConversationId) {
      set({ currentlyPlayingConversationId: null });
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

  playFromUri: async (uri: string, conversationId?: string, audioPlayer?: any) => {
    const player = audioPlayer || get().audioPlayer;
    if (!player) {
      console.error("Error playing audio: Audio player not available");
      return;
    }

    await playAudioFromUri(
      uri,
      player,
      conversationId,
      conversationId ? (id: string) => set({ currentlyPlayingConversationId: id }) : undefined
    );
  },

  handleAutoPlay: (conversations, autoplay, profileId, audioPlayer) => {
    if (!autoplay || !profileId || conversations.length === 0) {
      // Update message counts
      conversations.forEach((c) => {
        get().updateMessageCount(c.conversationId, c.messages.length);
      });
      return;
    }

    const { currentlyPlayingConversationId, lastMessageCounts } = get();

    // Check each conversation for new unheard messages
    conversations.forEach((conversation) => {
      const currentCount = conversation.messages.length;
      const lastCount = lastMessageCounts[conversation.conversationId] || 0;

      // Only proceed if a new message was added
      if (currentCount > lastCount) {
        const otherUserUid = conversation.uids.find((id) => id !== profileId);
        if (!otherUserUid) {
          get().updateMessageCount(conversation.conversationId, currentCount);
          return;
        }

        // Find the newest unheard message from the other user
        const unheardMessages = getUnreadMessagesFromOtherUser(conversation, otherUserUid);

        if (unheardMessages.length > 0) {
          const newestUnheard = unheardMessages[0];

          // Only auto-play if we're not already playing something from this conversation
          if (currentlyPlayingConversationId !== conversation.conversationId) {
            console.log(
              "🔔 New message received on home screen, autoplaying:",
              newestUnheard.messageId
            );
            get().playFromUri(newestUnheard.audioUrl, conversation.conversationId, audioPlayer);
            updateLastRead(conversation.conversationId, profileId);
          }
        }
      }

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

