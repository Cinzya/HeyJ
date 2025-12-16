import {
  View,
  Text,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { useProfile } from "../utilities/ProfileProvider";
import ConversationsScreen from "./ConversationsScreen";
import { sendMessage } from "../utilities/SendMessage";
import { useNavigation } from "@react-navigation/native";
import RecordingPanel from "../components/chat/RecordingPanel";
import { supabase } from "../utilities/Supabase";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useConversationListStore } from "../stores/useConversationListStore";
import { createStyles as createHomeScreenStyles } from "../styles/HomeScreen.styles";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { profile, conversations, profiles, friends, getFriends, getProfile } = useProfile();

  const { selectedConversation, setSelectedConversation } = useConversationListStore();
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:272',message:'handleFriendSelected called',data:{friendUid,currentUid:profile.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    try {
      // Use findOrCreateConversation to ensure we don't create duplicates
      const { findOrCreateConversation } = await import("../utilities/FindOrCreateConversation");
      const result = await findOrCreateConversation(profile.uid, friendUid);
      const conversation = result.conversation;
      const conversationId = conversation.conversationId;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'HomeScreen.tsx:279',message:'findOrCreateConversation result',data:{conversationId,isNew:result.isNew,friendUid,currentUid:profile.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

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
      />
    </View>
  );
};

export default HomeScreen;
