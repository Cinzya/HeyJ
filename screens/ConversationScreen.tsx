import {
  View,
  Text,
  FlatList,
  Platform,
} from "react-native";
import { createStyles as createConversationScreenStyles } from "../styles/ConversationScreen.styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../utilities/ProfileProvider";
import { groupBy, sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import { useEffect, useRef, useState, useCallback } from "react";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import { useNavigation } from "@react-navigation/native";
import RecordingPlayer from "../components/chat/RecordingPlayer";
import RecordingPanel from "../components/chat/RecordingPanel";
import { HeaderBackButton } from "@react-navigation/elements";
import { sendMessage } from "../utilities/SendMessage";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { formatDate } from "../utilities/dateUtils";

const ConversationScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation();
  const conversationId = route.params.conversationId;
  const { profile, conversations, profiles } = useProfile();
  const insets = useSafeAreaInsets();
  const { autoplay } = useAudioSettings();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sortedMessages, setSortedMessages] = useState<
    { title: string; data: Message[] }[]
  >([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastPlayedMessageIdRef = useRef<string | null>(null);

  const getSortedMessages = () => {
    const conversation = conversations.find(
      (c) => c.conversationId === conversationId
    );
    const uid = conversation?.uids.filter((id) => id !== profile?.uid)[0];
    const otherProfile = profiles.find((p) => p.uid === uid);

    if (conversation && otherProfile) {
      const newMessages = sortBy(conversation.messages, (m) => m.timestamp);
      const groupedMessages = Object.values(
        groupBy(newMessages, (m) => formatDate(m.timestamp))
      );

      const today = groupedMessages.filter((m) => isToday(m[0].timestamp));

      const sorted = [
        ...groupedMessages.filter((m) => !isToday(m[0].timestamp)),
        ...today,
      ].map((group) => {
        const lastTime = formatDate(group[0].timestamp);

        return { title: lastTime, data: group };
      });

      setConversation(conversation!);
      setSortedMessages(sorted);
      setOtherProfile(otherProfile!);
    }
  };

  useEffect(() => {
    getSortedMessages();
  }, [conversationId, conversations, profile, profiles]);

  useEffect(() => {
    navigation.setOptions({
      title: otherProfile?.name || "Conversation",
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => {
            navigation.goBack();
          }}
          tintColor="black"
        />
      ),
    });
  }, [otherProfile]);

  const {
    width,
    height,
    radius,
    startRecording,
    stopRecording: stopRecordingHook,
  } = useAudioRecording({
    conversationId,
    onStopRecording: async (uri: string) => {
      if (profile && conversationId) {
        await sendMessage(
          navigation,
          { profile, conversations },
          uri,
          conversationId
        );
      }
    },
  });

  const styles = createConversationScreenStyles(width, height, radius, insets);

  const [currentUri, setCurrentUri] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const renderMessage = (message: Message) => {
    if (message.uid === otherProfile?.uid) {
      // Incoming message - align left with avatar on left
      return (
        <View style={styles.messageContainer}>
          <RecordingPlayer
            uri={message.audioUrl}
            currentUri={currentUri}
            setCurrentUri={setCurrentUri}
            messageId={message.messageId}
            senderUid={message.uid}
            currentUserUid={profile!.uid}
            isRead={message.isRead}
            timestamp={message.timestamp}
            profilePicture={otherProfile.profilePicture}
            isIncoming={true}
            autoPlay={autoplay && !message.isRead && isAutoPlaying}
            onPlaybackFinished={isAutoPlaying ? playNextUnreadMessage : undefined}
          />
        </View>
      );
    } else {
      // Outgoing message - align right with avatar on right
      return (
        <View style={styles.messageContainer}>
          <RecordingPlayer
            uri={message.audioUrl}
            currentUri={currentUri}
            setCurrentUri={setCurrentUri}
            messageId={message.messageId}
            senderUid={message.uid}
            currentUserUid={profile!.uid}
            isRead={message.isRead}
            timestamp={message.timestamp}
            profilePicture={profile!.profilePicture}
            isIncoming={false}
          />
        </View>
      );
    }
  };

  const renderRightWaves = () => {
    return (
      <View style={{ flexDirection: "row" }}>
        {Array.from({ length: 20 }, (_, index) => (
          <View key={index} style={{ width: 2, height: 15, backgroundColor: "#a2a2a2", borderRadius: 15, marginHorizontal: 2 }} />
        ))}
      </View>
    );
  };

  const renderLeftWaves = () => {
    return (
      <FlatList
        data={loudness}
        style={{ width: "100%" }}
        horizontal
        contentContainerStyle={[
          {
            flexDirection: "row",
            alignItems: "center",
            maxWidth: useWindowDimensions().width * 0.28,
            height: 60,
            justifyContent: "flex-end",
            paddingLeft: 0,
          },
        ]}
        renderItem={({ item, index }) => {
          return (
            <View
              key={index}
              style={{ width: 2, height: item as DimensionValue, backgroundColor: "#000", borderRadius: 15, marginHorizontal: 2 }}
            />
          );
        }}
      />
    );
  };

  const renderSection = ({
    title,
    data,
  }: {
    title: string;
    data: Message[];
  }) => {
    return (
      <View>
        <FlatList
          data={data}
          renderItem={({ item: message }) => renderMessage(message)}
        />
      </View>
    );
  };

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [sortedMessages]);

  useEffect(() => {
    if (conversation) {
      updateLastRead(conversation?.conversationId, profile!.uid);
    }
  }, [sortedMessages.length]);

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
      const unheardMessages = conversation.messages
        .filter(
          (m) =>
            m.uid === otherProfile.uid && // From other user
            !m.isRead // Not read yet
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp, newest first

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
  }, [conversation?.messages.length, autoplay, profile?.uid, otherProfile?.uid, conversation?.messages]);

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

  // Auto-play oldest unheard message when conversation opens and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      return;
    }

    // Small delay to ensure component is mounted
    setTimeout(() => {
      playNextUnreadMessage();
    }, 500);
  }, [conversation?.conversationId, autoplay, profile?.uid, otherProfile?.uid]);

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

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        scrollEnabled
        data={sortedMessages}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => renderSection(item)}
        contentContainerStyle={styles.listContainer}
        contentInsetAdjustmentBehavior="automatic"
        onContentSizeChange={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={() => <Text>No Messages</Text>}
      />
      <RecordingPanel
        onPressIn={startRecording}
        onPressOut={stopRecordingHook}
        showTopButtons={true}
        showRecipient={true}
        recipientName={otherProfile?.name || "Select a Conversation"}
      />
    </View>
  );
};

export default ConversationScreen;


