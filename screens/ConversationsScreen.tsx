import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
// @ts-expect-error
import { Entypo } from "react-native-vector-icons";
import { useProfile } from "../utilities/ProfileProvider";
import { sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import { useEffect, useState } from "react";
import { format, isToday, isYesterday, isThisWeek, isBefore } from "date-fns";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
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

  useEffect(() => {
    getSortedConversations();

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    });
  }, [conversations]);

  const playFromUri = async (uri: string) => {
    const downloadResumable = FileSystem.createDownloadResumable(
      uri,
      FileSystem.documentDirectory + "small.mp4",
      {}
    );

    const newFile = await downloadResumable.downloadAsync();
    const { sound } = await Audio.Sound.createAsync({
      uri: newFile!.uri,
    });

    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded) {
        if (status.didJustFinish) {
          await sound.unloadAsync();
        }
      }
    });

    await sound.playAsync();
  };

  useEffect(() => {
    const onForeground = (event: NotificationWillDisplayEvent) => {
      const data = event.notification.additionalData as any;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);

        playFromUri(data.messageUrl);
        updateLastRead(data.conversationId, profile!.uid);
      }
    };

    const onClick = (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as any;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);

        playFromUri(data.messageUrl);

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

  const renderConversation = (conversation: Conversation) => {
    const uid: string = conversation.uids.filter(
      (id) => id !== profile?.uid
    )[0];
    const otherProfile = profiles.find((p) => p.uid === uid);

    const isSelected = selectedConversation === conversation.conversationId;

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
            const lastRead = conversation.lastRead.filter(
              (l) => l.uid === profile?.uid
            )[0];
            const lastMessage = lastMessageFromOtherUser(conversation);

            if (
              lastMessage &&
              lastRead &&
              isBefore(lastRead.timestamp, lastMessage.timestamp)
            ) {
              playFromUri(lastMessage.audioUrl);
              updateLastRead(conversation.conversationId, profile!.uid);
            }
          }}
          onLongPress={() =>
            (navigation as any).navigate("Conversation", {
              conversationId: conversation.conversationId,
            })
          }
        >
          <Image
            style={styles.profilePicture}
            source={{ uri: otherProfile.profilePicture }}
          />
          <View style={styles.textContainer}>
            <Text style={styles.profileName}>
              {otherProfile.firstName} {otherProfile.lastName}
            </Text>
            <Text style={styles.lastMessage}>
              Last Message: {formatDate(lastMessageTimestamp(conversation))}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              (navigation as any).navigate("Conversation", {
                conversationId: conversation.conversationId,
              })
            }
          >
            <Entypo name="chevron-right" style={styles.icon} />
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
    return "Today " + format(timestamp, "h:mm a");
  } else if (isYesterday(timestamp)) {
    return "Yesterday " + format(timestamp, "h:mm a");
  } else if (isThisWeek(timestamp)) {
    return format(timestamp, "EEEE");
  } else {
    return format(timestamp, "MM/dd/yyyy");
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
  },
  selectedConversationContainer: {
    width: "100%",
    height: 90,
    flexDirection: "row",
    backgroundColor: "#B4D3B2" + "80",
    paddingHorizontal: 15,
    paddingVertical: 15,
    alignItems: "center",
  },
  profilePicture: {
    width: 65,
    height: 65,
    borderRadius: 75,
    marginRight: 10,
  },
  textContainer: {
    height: 75,
    marginLeft: 5,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  lastMessage: {
    fontSize: 14,
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
  icon: {
    fontSize: 30,
    position: "absolute",
    right: 20,
  },
});
