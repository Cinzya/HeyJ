import { create } from "zustand";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
import Conversation from "../objects/Conversation";
import { updateLastRead } from "../utilities/UpdateConversation";
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
  audioPlayer: any | null;
  playerStatus: any | null;
  setAudioPlayer: (player: any) => void;
  setPlayerStatus: (status: any) => void;
  setCurrentlyPlaying: (conversationId: string | null) => void;
  clearCurrentlyPlaying: () => void;
  updateMessageCount: (conversationId: string, count: number) => void;
  playFromUri: (uri: string, conversationId?: string, audioPlayer?: any) => Promise<void>;
  handleAutoPlay: (
    conversations: Conversation[],
    autoplay: boolean,
    profileId: string | undefined,
    audioPlayer: any
  ) => void;
  initializeNotificationHandlers: (
    setSelectedConversation: (id: string) => void,
    profileId: string,
    audioPlayer: any
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
    try {
      const docDir = documentDirectory;
      if (!docDir) {
        console.error("Error playing audio: Document directory is undefined");
        return;
      }

      const player = audioPlayer || get().audioPlayer;
      if (!player) {
        console.error("Error playing audio: Audio player not available");
        return;
      }

      const downloadResumable = createDownloadResumable(
        uri,
        docDir + "notification.mp4",
        {}
      );

      const newFile = await downloadResumable.downloadAsync();
      if (newFile) {
        player.replace(newFile.uri);
        player.play();
        if (conversationId) {
          set({ currentlyPlayingConversationId: conversationId });
        }
      }
    } catch (error) {
      console.error("Error playing audio from URI:", error);
    }
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
        const unheardMessages = conversation.messages
          .filter(
            (m) =>
              m.uid === otherUserUid && // From other user
              !m.isRead // Not read yet
          )
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp, newest first

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

