import { View, FlatList } from "react-native";
import { styles } from "../styles/ConversationsScreen.styles";
import { useProfile } from "../utilities/ProfileProvider";
import { useConversations } from "../utilities/ConversationsProvider";
import { useFriends } from "../utilities/FriendsProvider";
import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { useIncomingRequesterProfiles } from "../hooks/useProfileData";
import { useConversationListStore, ConversationListItem as ConversationListItemType } from "../stores/useConversationListStore";
import { useAudioPlaybackStore } from "../stores/useAudioPlaybackStore";
import { useFriendRequestActionsStore } from "../stores/useFriendRequestActionsStore";
import ConversationListItemComponent from "../components/conversations/ConversationListItem";

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
  const { autoplay, speakerMode } = useAudioSettings();

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
    handleAutoPlay(conversations, autoplay, profile?.uid, audioPlayer, updateMessageReadStatus, speakerMode);
  }, [
    conversations.map((c) => `${c.conversationId}:${c.messages.length}`).join(","),
    autoplay,
    profile?.uid,
    audioPlayer,
    handleAutoPlay,
    updateMessageReadStatus,
    speakerMode,
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

  return (
    <FlatList
      data={sortedListItems}
      renderItem={({ item }) => (
        <ConversationListItemComponent
          item={item}
          profiles={profiles}
          currentUserProfile={profile}
          selectedConversation={selectedConversation}
          onSelect={setSelectedConversation}
          onNavigate={(conversationId: string) =>
            navigation.navigate("Conversation", { conversationId })
          }
          playFromUri={playFromUri}
          audioPlayer={audioPlayer}
          acceptFriendRequest={acceptFriendRequest}
          getFriendRequests={getFriendRequests}
          getFriends={getFriends}
          handleAccept={handleAccept}
          handleDecline={handleDecline}
          rejectFriendRequest={rejectFriendRequest}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      keyExtractor={(item, index) => {
        if (item.type === "friendRequest") {
          return `friendRequest-${item.data.id}`;
        } else {
          return `conversation-${item.data.conversationId}`;
        }
      }}
      style={styles.container}
    />
  );
};

export default ConversationsScreen;

