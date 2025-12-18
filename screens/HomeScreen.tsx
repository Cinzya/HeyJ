// React
import { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";

// Navigation
import { useNavigation, NavigationProp } from "@react-navigation/native";

// Utilities & Providers
import { useProfile } from "../utilities/ProfileProvider";
import { useConversations } from "../utilities/ConversationsProvider";
import { useFriends } from "../utilities/FriendsProvider";
import { sendMessage } from "../utilities/SendMessage";
import { supabase } from "../utilities/Supabase";
import { logAgentEvent } from "../utilities/AgentLogger";

// Hooks
import { useAudioRecording } from "../hooks/useAudioRecording";

// Stores
import { useConversationListStore } from "../stores/useConversationListStore";
import { useAudioRecordingStore } from "../stores/useAudioRecordingStore";

// Components
import RecordingPanel from "../components/chat/RecordingPanel";

// Screens
import ConversationsScreen from "./ConversationsScreen";

// Types & Styles
import { RootStackParamList } from "../types/navigation";
import { createStyles as createHomeScreenStyles } from "../styles/screens/HomeScreen.styles";

const HomeScreen = () => {
  logAgentEvent({
    location: 'HomeScreen.tsx:render',
    message: 'HomeScreen rendering',
    data: {},
    hypothesisId: 'B',
  });

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  let profile, getProfile, conversations, profiles, friends, getFriends;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    getProfile = profileContext.getProfile;
    logAgentEvent({
      location: 'HomeScreen.tsx:useProfile',
      message: 'HomeScreen useProfile success',
      data: { hasProfile: !!profile },
      hypothesisId: 'B',
    });
  } catch (error) {
    logAgentEvent({
      location: 'HomeScreen.tsx:useProfile:error',
      message: 'HomeScreen useProfile error',
      data: { errorMessage: error instanceof Error ? error.message : String(error) },
      hypothesisId: 'B',
    });
    throw error;
  }
  try {
    const conversationsContext = useConversations();
    conversations = conversationsContext.conversations;
    profiles = conversationsContext.profiles;
    logAgentEvent({
      location: 'HomeScreen.tsx:useConversations',
      message: 'HomeScreen useConversations success',
      data: { conversationsCount: conversations?.length || 0 },
      hypothesisId: 'B',
    });
  } catch (error) {
    logAgentEvent({
      location: 'HomeScreen.tsx:useConversations:error',
      message: 'HomeScreen useConversations error',
      data: { errorMessage: error instanceof Error ? error.message : String(error) },
      hypothesisId: 'B',
    });
    throw error;
  }
  try {
    const friendsContext = useFriends();
    friends = friendsContext.friends;
    getFriends = friendsContext.getFriends;
    logAgentEvent({
      location: 'HomeScreen.tsx:useFriends',
      message: 'HomeScreen useFriends success',
      data: { friendsCount: friends?.length || 0 },
      hypothesisId: 'B',
    });
  } catch (error) {
    logAgentEvent({
      location: 'HomeScreen.tsx:useFriends:error',
      message: 'HomeScreen useFriends error',
      data: { errorMessage: error instanceof Error ? error.message : String(error) },
      hypothesisId: 'B',
    });
    throw error;
  }

  const { selectedConversation, setSelectedConversation } = useConversationListStore();
  const { isRecording } = useAudioRecordingStore();
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>("");
  const [selectedFriendUid, setSelectedFriendUid] = useState<string | null>(null);

  const {
    width,
    height,
    radius,
    startRecording,
    stopRecording: stopRecordingHook,
  } = useAudioRecording({
    requireConversation: true,
    conversationId: selectedConversation,
    onStopRecording: async (uri: string) => {
      if (selectedConversation) {
        await sendMessage(
          navigation,
          { profile, conversations },
          uri,
          selectedConversation
        );
      }
    },
  });

  useEffect(() => {
    if (profile && selectedConversation) {
      const conversation = conversations.find((c) => c.conversationId === selectedConversation);
      if (conversation) {
        const uid: string = conversation.uids.filter((id) => id !== profile?.uid)[0];
        const otherProfile = profiles.find((p) => p.uid === uid);
        setSelectedRecipientName(otherProfile?.name || "---");
        setSelectedFriendUid(uid);
      } else {
        setSelectedRecipientName("");
        setSelectedFriendUid(null);
      }
    } else {
      setSelectedRecipientName("");
      setSelectedFriendUid(null);
    }
  }, [profile, profiles, selectedConversation, conversations]);

  useEffect(() => {
    if (profile) {
      getFriends();
    }
  }, [profile]);

  useEffect(() => {
    navigation.addListener("blur", (event) => { });
  }, [navigation]);

  const handleFriendSelected = async (friendUid: string) => {
    if (!profile) return;

    logAgentEvent({
      location: 'HomeScreen.tsx:handleFriendSelected',
      message: 'handleFriendSelected called',
      data: { friendUid, currentUid: profile.uid },
      hypothesisId: 'A',
    });

    try {
      // Use findOrCreateConversation to ensure we don't create duplicates
      const { findOrCreateConversation } = await import("../utilities/FindOrCreateConversation");
      const result = await findOrCreateConversation(profile.uid, friendUid);
      const conversation = result.conversation;
      const conversationId = conversation.conversationId;

      logAgentEvent({
        location: 'HomeScreen.tsx:findOrCreateConversation',
        message: 'findOrCreateConversation result',
        data: { conversationId, isNew: result.isNew, friendUid, currentUid: profile.uid },
        hypothesisId: 'A',
      });

      // Get friend's profile to update
      const friend = friends.find((f) => f.uid === friendUid);
      if (!friend) {
        Alert.alert("Error", "Friend not found.");
        return;
      }

      // Fetch latest friend profile to ensure we have current conversations
      const { data: friendProfileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("uid", friendUid)
        .single();

      const otherConversations = friendProfileData && Array.isArray(friendProfileData.conversations)
        ? friendProfileData.conversations
        : [];
      const currentConversations = Array.isArray(profile.conversations)
        ? profile.conversations
        : [];

      // Update other user's profile if needed
      if (!otherConversations.includes(conversationId)) {
        await supabase
          .from("profiles")
          .update({
            conversations: [...otherConversations, conversationId],
          })
          .eq("uid", friendUid);
      }

      // Update current user's profile if needed
      if (!currentConversations.includes(conversationId)) {
        await supabase
          .from("profiles")
          .update({
            conversations: [...currentConversations, conversationId],
          })
          .eq("uid", profile.uid);
      }

      // Refresh profile to get updated conversations
      await new Promise((resolve) => setTimeout(resolve, 100));
      getProfile();

      // Select the conversation
      setSelectedConversation(conversationId);
      setSelectedRecipientName(friend.name);
      setSelectedFriendUid(friendUid);
    } catch (error) {
      console.error("Error finding/creating conversation:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const styles = createHomeScreenStyles(width, height, radius);


  return (
    <View style={styles.container}>
      {profile ? (
        <ConversationsScreen />
      ) : (
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      )}
      <RecordingPanel
        onPressIn={startRecording}
        onPressOut={stopRecordingHook}
        showTopButtons={true}
        showRecipient={true}
        recipientName={selectedRecipientName}
        friends={friends}
        selectedFriendUid={selectedFriendUid}
        onFriendSelected={handleFriendSelected}
        isRecording={isRecording}
      />
    </View>
  );
};

export default HomeScreen;
