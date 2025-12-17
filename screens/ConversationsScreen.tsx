import { View, FlatList } from "react-native";
import { styles } from "../styles/ConversationsScreen.styles";
import { useProfile } from "../utilities/ProfileProvider";
import { useConversations } from "../utilities/ConversationsProvider";
import { useFriends } from "../utilities/FriendsProvider";
import Conversation from "../objects/Conversation";
import FriendRequest from "../objects/FriendRequest";
import Profile from "../objects/Profile";
import { useEffect } from "react";
import { getOtherUserUid } from "../utilities/conversationUtils";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { useIncomingRequesterProfiles } from "../hooks/useProfileData";
import { useConversationListStore, ConversationListItem } from "../stores/useConversationListStore";
import { useAudioPlaybackStore } from "../stores/useAudioPlaybackStore";
import { useFriendRequestActionsStore } from "../stores/useFriendRequestActionsStore";
import FriendRequestItem from "../components/conversations/FriendRequestItem";
import ConversationItem from "../components/conversations/ConversationItem";

const ConversationsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { profile } = useProfile();
  const { conversations, profiles, updateMessageReadStatus } = useConversations();
  const {
    friendRequests,
    getFriendRequests,
    getFriends,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useFriends();
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
    handleAutoPlay(conversations, autoplay, profile?.uid, audioPlayer, updateMessageReadStatus);
  }, [
    conversations.map((c) => `${c.conversationId}:${c.messages.length}`).join(","),
    autoplay,
    profile?.uid,
    audioPlayer,
    handleAutoPlay,
    updateMessageReadStatus,
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

  const renderItem = ({ item }: { item: ConversationListItem }) => {
    if (item.type === "friendRequest") {
      return (
        <FriendRequestItem
          request={item.data}
          requesterProfile={item.requesterProfile}
          onAccept={() =>
            handleAccept(
              item.data,
              item.requesterProfile,
              acceptFriendRequest,
              getFriendRequests,
              getFriends
            )
          }
          onDecline={() =>
            handleDecline(item.data.id, rejectFriendRequest, getFriendRequests)
          }
        />
      );
    } else {
      if (!profile) return <View />;

      const otherUserUid = getOtherUserUid(item.data, profile.uid);
      if (!otherUserUid) return <View />;

      const otherProfile = profiles.find((p) => p.uid === otherUserUid);
      if (!otherProfile) return <View />;

      const isSelected = selectedConversation === item.data.conversationId;

      return (
        <ConversationItem
          conversation={item.data}
          currentUserProfile={profile}
          otherProfile={otherProfile}
          isSelected={isSelected}
          onPress={() => setSelectedConversation(item.data.conversationId)}
          onLongPress={() =>
            navigation.navigate("Conversation", {
              conversationId: item.data.conversationId,
            })
          }
          playFromUri={playFromUri}
          audioPlayer={audioPlayer}
        />
      );
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

