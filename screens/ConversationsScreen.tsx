import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
// @ts-expect-error
import { Entypo, FontAwesome } from "react-native-vector-icons";
import { useProfile } from "../utilities/ProfileProvider";
import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import { useEffect, useState } from "react";
import { format, isToday, isYesterday, isThisWeek, isBefore } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
// OneSignal is mocked - see mocks/react-native-onesignal.js
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from "react-native-onesignal";
import { updateLastRead } from "../utilities/UpdateConversation";

const ConversationsScreen = ({
  selectedConversation,
  setSelectedConversation,
}: {
  selectedConversation: string | null;
  setSelectedConversation: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const navigation = useNavigation();
  const { profile, conversations, profiles, getProfile } = useProfile();

  const [sortedConversations, setSortedConversations] = useState<
    Conversation[]
  >([]);

  const lastMessageTimestamp = (conversation: Conversation) => {
    const messages = sortBy(conversation.messages, (m) => m.timestamp);
    const lastMessage = messages[messages.length - 1];

    return lastMessage.timestamp;
  };

  const lastMessageFromOtherUser = (conversation: Conversation) => {
    const messages = sortBy(
      conversation.messages.filter((m) => m.uid !== profile?.uid),
      (m) => m.timestamp
    );
    const lastMessage = messages[messages.length - 1];

    return lastMessage;
  };

  const getSortedConversations = () => {
    const filteredConversations = conversations.filter(
      (c) => c.messages.length > 0
    );
    const newConversations = sortBy(filteredConversations, (c) =>
      lastMessageTimestamp(c)
    ).reverse();

    setSortedConversations(newConversations);
  };

  useEffect(() => {
    const lastConversation = sortedConversations[0];

    if (lastConversation) {
      setSelectedConversation(lastConversation.conversationId);
    }
  }, [sortedConversations]);

  const audioPlayer = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  // Track which conversation is currently playing
  const [currentlyPlayingConversationId, setCurrentlyPlayingConversationId] = useState<string | null>(null);

  useEffect(() => {
    getSortedConversations();
  }, [conversations]);


  // Clear currently playing conversation when playback stops
  useEffect(() => {
    if (!playerStatus.playing && currentlyPlayingConversationId) {
      setCurrentlyPlayingConversationId(null);
    }
  }, [playerStatus.playing, currentlyPlayingConversationId]);

  const playFromUri = async (uri: string, conversationId?: string) => {
    try {
      const docDir = documentDirectory;
      if (!docDir) {
        console.error("Error playing audio: Document directory is undefined");
        return;
      }

      const downloadResumable = createDownloadResumable(
        uri,
        docDir + "notification.mp4",
        {}
      );

      const newFile = await downloadResumable.downloadAsync();
      if (newFile) {
        audioPlayer.replace(newFile.uri);
        audioPlayer.play();
        if (conversationId) {
          setCurrentlyPlayingConversationId(conversationId);
        }
      }
    } catch (error) {
      console.error("Error playing audio from URI:", error);
    }
  };

  useEffect(() => {
    const onForeground = (event: NotificationWillDisplayEvent) => {
      const data = event.notification.additionalData as any;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);

        playFromUri(data.messageUrl, data.conversationId);
        updateLastRead(data.conversationId, profile!.uid);
      }
    };

    const onClick = (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as any;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);

        playFromUri(data.messageUrl, data.conversationId);

        updateLastRead(data.conversationId, profile!.uid);
      }
    };

    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      onForeground
    );

    OneSignal.Notifications.addEventListener("click", onClick);

    return () => {
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        onForeground
      );
      OneSignal.Notifications.removeEventListener("click", onClick);
    };
  }, []);

  const getStatusIndicator = (conversation: Conversation) => {
    // Simple status logic: green if recent message, red if old, gray if no messages
    const lastMessage = lastMessageFromOtherUser(conversation);
    if (!lastMessage) {
      return { icon: "question", color: "#808080" };
    }
    const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastMessage < 24) {
      return { icon: "check", color: "#4CAF50" };
    } else {
      return { icon: "close", color: "#F44336" };
    }
  };

  const renderConversation = (conversation: Conversation) => {
    const uid: string = conversation.uids.filter(
      (id) => id !== profile?.uid
    )[0];
    const otherProfile = profiles.find((p) => p.uid === uid);

    const isSelected = selectedConversation === conversation.conversationId;
    const status = getStatusIndicator(conversation);

    if (otherProfile) {
      return (
        <TouchableOpacity
          style={
            isSelected
              ? styles.selectedConversationContainer
              : styles.conversationContainer
          }
          onPress={() => {
            setSelectedConversation(conversation.conversationId);
            const lastMessage = lastMessageFromOtherUser(conversation);

            // Play the last message from the other user when tapping the conversation
            if (lastMessage) {
              playFromUri(lastMessage.audioUrl, conversation.conversationId);
              const lastRead = conversation.lastRead.filter(
                (l) => l.uid === profile?.uid
              )[0];
              // Update last read if this message hasn't been read yet
              if (!lastRead || isBefore(lastRead.timestamp, lastMessage.timestamp)) {
                updateLastRead(conversation.conversationId, profile!.uid);
              }
            }
          }}
          onLongPress={() =>
            (navigation as any).navigate("Conversation", {
              conversationId: conversation.conversationId,
            })
          }
        >
          <View style={styles.statusIndicator}>
            <View style={[styles.statusCircle, { backgroundColor: status.color }]}>
              <FontAwesome
                name={status.icon}
                style={styles.statusIcon}
              />
            </View>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.profileName}>
              {otherProfile.name}
            </Text>
            <View style={styles.timestampContainer}>
              <Text style={styles.lastMessage}>
                {formatDate(lastMessageTimestamp(conversation))}
              </Text>
              <FontAwesome name="paper-plane" style={styles.paperPlaneIcon} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              (navigation as any).navigate("Conversation", {
                conversationId: conversation.conversationId,
              })
            }
          >
            <Entypo name="chat" style={styles.targetIcon} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    } else {
      return <View />;
    }
  };

  return (
    <FlatList
      data={sortedConversations}
      renderItem={({ item: conversation }) => renderConversation(conversation)}
      style={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

export default ConversationsScreen;

const formatDate = (timestamp: Date) => {
  if (isToday(timestamp)) {
    return format(timestamp, "h:mm a");
  } else if (isYesterday(timestamp)) {
    return format(timestamp, "h:mm a");
  } else if (isThisWeek(timestamp)) {
    return format(timestamp, "h:mm a");
  } else {
    return format(timestamp, "h:mm a");
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  separator: {
    width: "98%",
    borderBottomWidth: 0.5,
    borderBottomColor: "darkgrey",
    alignSelf: "center",
  },
  conversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  selectedConversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    backgroundColor: "#FFF9C4",
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: "center",
  },
  statusIndicator: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIcon: {
    fontSize: 12,
    color: "#FFF",
  },
  textContainer: {
    flex: 1,
    marginLeft: 5,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: "gray",
    marginRight: 6,
  },
  paperPlaneIcon: {
    fontSize: 12,
    color: "gray",
  },
  button: {
    width: 75,
    height: 75,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    right: 0,
  },
  targetIcon: {
    fontSize: 24,
    color: "#666",
  },
});
