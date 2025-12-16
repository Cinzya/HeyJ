import { NavigationProp } from "@react-navigation/native";
import { Alert } from "react-native";
import { useProfile } from "./ProfileProvider";
import { handleError, handleApiError } from "./errorHandler";
import UUID from "react-native-uuid";
import { supabase } from "../utilities/Supabase";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import Conversation from "../objects/Conversation";
import { RootStackParamList } from "../types/navigation";

export const sendMessage = async (
  navigation: NavigationProp<RootStackParamList>,
  profileData: {
    profile: Profile | null;
    conversations: Conversation[];
  },
  uri: string,
  conversationId: string
) => {
  console.log("📨 sendMessage called with conversationId:", conversationId);

  const { profile, conversations } = profileData;

  if (!profile) {
    console.error("❌ No profile available in sendMessage");
    Alert.alert("Error", "You must be logged in to send messages.");
    return;
  }

  const conversation = conversations.find(
    (c) => c.conversationId === conversationId
  );

  if (!conversation) {
    console.error("❌ Conversation not found:", conversationId);
    console.log("Available conversations:", conversations.map(c => c.conversationId));
    Alert.alert("Error", "Conversation not found. Please try again.");
    return;
  }

  console.log("✅ Found conversation:", conversation.conversationId);

  try {
    const messageId = UUID.v4().toString();
    const fileName = `message_${messageId}.mp3`;

    console.log("📤 Fetching audio from URI:", uri);
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    console.log("✅ Audio fetched, size:", buffer.byteLength);

    console.log("☁️ Uploading to Supabase storage...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("message_audios")
      .upload(fileName, buffer, { contentType: "audio/mp3" });

    if (uploadError) {
      const errorMessage = handleApiError(uploadError, "Failed to upload audio");
      Alert.alert("Error", errorMessage);
      return;
    }

    if (!uploadData) {
      Alert.alert("Error", "Failed to upload audio. Please try again.");
      return;
    }

    console.log("✅ Audio uploaded, path:", uploadData.path);
    const url = supabase.storage
      .from("message_audios")
      .getPublicUrl(uploadData.path).data.publicUrl;
    console.log("✅ Public URL:", url);

    const message = new Message(messageId, new Date(), profile.uid, url, false);

    console.log("💾 Inserting message into database...");
    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .insert(message.toJSON());

    if (messageError) {
      const errorMessage = handleApiError(messageError, "Failed to save message");
      Alert.alert("Error", errorMessage);
      return;
    }

    console.log("✅ Message inserted, updating conversation...");
    const updatedMessages = [
      ...conversation.toJSON().messages,
      message.messageId,
    ];
    const newConversation = {
      ...conversation.toJSON(),
      messages: updatedMessages,
    };

    const { data: conversationData, error: conversationError } = await supabase
      .from("conversations")
      .upsert(newConversation);

    if (conversationError) {
      handleError(conversationError, "SendMessage - conversation update", true, "We were unable to send your message. Please try again.");
      return;
    }

    console.log("✅ Conversation updated, ensuring both users have it in their profiles...");
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:113',message:'conversation updated, checking profiles',data:{conversationId,messageId,senderUid:profile.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Ensure both users have this conversation ID in their profiles
    const otherUid = conversation.uids.find((id: string) => id !== profile.uid);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:117',message:'found other user uid',data:{conversationId,otherUid,hasOtherUid:!!otherUid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (otherUid) {
      // Get the other user's profile
      const { data: otherProfileData, error: otherProfileError } = await supabase
        .from("profiles")
        .select()
        .eq("uid", otherUid)
        .single();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:123',message:'fetched other user profile',data:{conversationId,otherUid,hasProfile:!!otherProfileData,hasError:!!otherProfileError,error:otherProfileError?.message||null,otherConversations:otherProfileData?.conversations||[],hasConversation:otherProfileData?.conversations?.includes(conversationId)||false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!otherProfileError && otherProfileData) {
        const otherConversations = Array.isArray(otherProfileData.conversations)
          ? otherProfileData.conversations
          : [];

        // Add conversation ID if not already present
        if (!otherConversations.includes(conversationId)) {
          console.log("📝 Adding conversation to other user's profile...");
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:132',message:'updating other user profile with conversation',data:{conversationId,otherUid,currentConversationsCount:otherConversations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          const { error: updateOtherError } = await supabase
            .from("profiles")
            .update({
              conversations: [...otherConversations, conversationId],
            })
            .eq("uid", otherUid);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:138',message:'other user profile update result',data:{conversationId,otherUid,updateError:updateOtherError?.message||null,success:!updateOtherError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion

          if (updateOtherError) {
            console.error("⚠️ Error updating other user's profile:", updateOtherError);
          } else {
            console.log("✅ Other user's profile updated");
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:145',message:'other user already has conversation',data:{conversationId,otherUid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SendMessage.tsx:149',message:'error fetching other user profile',data:{conversationId,otherUid,error:otherProfileError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    }

    // Also ensure current user has it (in case it's missing)
    const currentConversations = Array.isArray(profile.conversations)
      ? profile.conversations
      : [];

    if (!currentConversations.includes(conversationId)) {
      console.log("📝 Adding conversation to current user's profile...");
      const { error: updateCurrentError } = await supabase
        .from("profiles")
        .update({
          conversations: [...currentConversations, conversationId],
        })
        .eq("uid", profile.uid);

      if (updateCurrentError) {
        console.error("⚠️ Error updating current user's profile:", updateCurrentError);
      } else {
        console.log("✅ Current user's profile updated");
      }
    }

    console.log("✅ Message sent successfully!");
  } catch (error: any) {
    handleError(error, "SendMessage", true, "Failed to send message");
  }
};
