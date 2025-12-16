import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import { styles } from "../styles/ConversationsScreen.styles";
// @ts-expect-error
import { Entypo, FontAwesome } from "react-native-vector-icons";
import { useProfile } from "../utilities/ProfileProvider";
import Conversation from "../objects/Conversation";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
import { useEffect } from "react";
import { isBefore } from "date-fns";
import { formatDate } from "../utilities/dateUtils";
import { lastMessageTimestamp, lastMessageFromOtherUser, getStatusIndicator, getOtherUserUid } from "../utilities/conversationUtils";
import { useNavigation } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { useIncomingRequesterProfiles } from "../hooks/useProfileData";
import { useConversationListStore, ConversationListItem } from "../stores/useConversationListStore";
import { useAudioPlaybackStore } from "../stores/useAudioPlaybackStore";
import { useFriendRequestActionsStore } from "../stores/useFriendRequestActionsStore";
import { updateLastRead } from "../utilities/UpdateConversation";

const ConversationsScreen = () => {
  const navigation = useNavigation();
  const {
    profile,
    conversations,
    profiles,
    friendRequests,
    getFriendRequests,
    getFriends,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useProfile();
  const { autoplay } = useAudioSettings();

  // Zustand stores
  const {
    selectedConversation,
    sortedListItems,
    setSelectedConversation,
    computeSortedListItems,
    selectFirstConversation,
  } = useConversationListStore();

  const {
    currentlyPlayingConversationId,
    setAudioPlayer,
    setPlayerStatus,
    playFromUri,
    handleAutoPlay,
    initializeNotificationHandlers,
  } = useAudioPlaybackStore();

  const { handleAccept, handleDecline } = useFriendRequestActionsStore();

  const requesterProfilesMap = useIncomingRequesterProfiles(profile, friendRequests);

  // Audio player setup
  const audioPlayer = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  useEffect(() => {
    setAudioPlayer(audioPlayer);
  }, [audioPlayer, setAudioPlayer]);

  useEffect(() => {
    setPlayerStatus(playerStatus);
  }, [playerStatus, setPlayerStatus]);

  useEffect(() => {
    if (profile) {
      getFriendRequests();
    }
  }, [profile, getFriendRequests]);

  // Compute sorted list items when dependencies change
  useEffect(() => {
    computeSortedListItems(
      conversations,
      friendRequests,
      requesterProfilesMap,
      profile
    );
  }, [conversations, friendRequests, requesterProfilesMap, profile, computeSortedListItems]);

  // Auto-select first conversation
  useEffect(() => {
    selectFirstConversation();
  }, [sortedListItems, selectFirstConversation]);

  // Auto-play new messages
  useEffect(() => {
    handleAutoPlay(conversations, autoplay, profile?.uid, audioPlayer);
  }, [
    conversations.map((c) => `${c.conversationId}:${c.messages.length}`).join(","),
    autoplay,
    profile?.uid,
    audioPlayer,
    handleAutoPlay,
  ]);

  // Initialize notification handlers
  useEffect(() => {
    if (!profile) return;
    const cleanup = initializeNotificationHandlers(
      setSelectedConversation,
      profile.uid,
      audioPlayer
    );
    return cleanup;
  }, [profile, setSelectedConversation, initializeNotificationHandlers, audioPlayer]);

  const renderFriendRequest = (
    request: FriendRequest,
    requesterProfile: Profile
  ) => {
    return (
      <View style={styles.friendRequestContainer}>
        <Image
          style={styles.friendRequestProfilePicture}
          source={{ uri: requesterProfile.profilePicture }}
        />
        <View style={styles.friendRequestTextContainer}>
          <Text style={styles.friendRequestName}>{requesterProfile.name}</Text>
          <Text style={styles.friendRequestLabel}>Friend Request</Text>
        </View>
        <View style={styles.friendRequestButtons}>
          <TouchableOpacity
            style={[styles.friendRequestButton, styles.acceptButton]}
            onPress={() =>
              handleAccept(
                request,
                requesterProfile,
                acceptFriendRequest,
                getFriendRequests,
                getFriends
              )
            }
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.friendRequestButton, styles.declineButton]}
            onPress={() =>
              handleDecline(request.id, rejectFriendRequest, getFriendRequests)
            }
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConversation = (conversation: Conversation) => {
    if (!profile) return <View />;

    const otherUserUid = getOtherUserUid(conversation, profile.uid);
    if (!otherUserUid) return <View />;

    const otherProfile = profiles.find((p) => p.uid === otherUserUid);
    if (!otherProfile) return <View />;

    const isSelected = selectedConversation === conversation.conversationId;
    const status = getStatusIndicator(conversation, profile.uid);

    return (
      <TouchableOpacity
        style={
          isSelected
            ? styles.selectedConversationContainer
            : styles.conversationContainer
        }
        onPress={() => {
          setSelectedConversation(conversation.conversationId);
          const lastMessage = lastMessageFromOtherUser(conversation, profile.uid);

          // Play the last message from the other user when tapping the conversation
          if (lastMessage) {
            playFromUri(lastMessage.audioUrl, conversation.conversationId, audioPlayer);
            const lastRead = conversation.lastRead.find((l) => l.uid === profile.uid);
            // Update last read if this message hasn't been read yet
            if (!lastRead || isBefore(lastRead.timestamp, lastMessage.timestamp)) {
              updateLastRead(conversation.conversationId, profile.uid);
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
            <FontAwesome name={status.icon} style={styles.statusIcon} />
          </View>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.profileName}>{otherProfile.name}</Text>
          <View style={styles.timestampContainer}>
            <Text style={styles.lastMessage}>
              {conversation.messages.length === 0
                ? "New conversation"
                : formatDate(lastMessageTimestamp(conversation))}
            </Text>
            {conversation.messages.length > 0 && (
              <FontAwesome name="paper-plane" style={styles.paperPlaneIcon} />
            )}
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
  };

  const renderItem = ({ item }: { item: ConversationListItem }) => {
    if (item.type === "friendRequest") {
      return renderFriendRequest(item.data, item.requesterProfile);
    } else {
      return renderConversation(item.data);
    }
  };

  return (
    <FlatList
      data={sortedListItems}
      renderItem={renderItem}
      style={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyExtractor={(item, index) => {
        if (item.type === "friendRequest") {
          return `friendRequest-${item.data.id}`;
        } else {
          return `conversation-${item.data.conversationId}`;
        }
      }}
    />
  );
};

export default ConversationsScreen;

