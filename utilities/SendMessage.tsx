import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import { useProfile } from "./ProfileProvider";
import UUID from "react-native-uuid";
import { supabase } from "../utilities/Supabase";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import Conversation from "../objects/Conversation";

export const sendMessage = async (
  navigation: any,
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
      console.error("❌ Storage upload error:", uploadError);
      Alert.alert("Error", `Failed to upload audio: ${uploadError.message}`);
      return;
    }

    if (!uploadData) {
      console.error("❌ No upload data returned");
      Alert.alert("Error", "Failed to upload audio. Please try again.");
      return;
    }

    console.log("✅ Audio uploaded, path:", uploadData.path);
    const url = supabase.storage
      .from("message_audios")
      .getPublicUrl(uploadData.path).data.publicUrl;
    console.log("✅ Public URL:", url);

    const message = new Message(messageId, new Date(), profile.uid, url);

    console.log("💾 Inserting message into database...");
    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .insert(message.toJSON());

    if (messageError) {
      console.error("❌ Message insert error:", messageError);
      Alert.alert("Error", `Failed to save message: ${messageError.message}`);
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
      console.error("❌ Conversation update error:", conversationError);
      Alert.alert(
        "Something went wrong...",
        "We were unable to send your message. Please try again."
      );
      return;
    }

    console.log("✅ Conversation updated, ensuring both users have it in their profiles...");

    // Ensure both users have this conversation ID in their profiles
    const otherUid = conversation.uids.find((id: string) => id !== profile.uid);
    if (otherUid) {
      // Get the other user's profile
      const { data: otherProfileData, error: otherProfileError } = await supabase
        .from("profiles")
        .select()
        .eq("uid", otherUid)
        .single();

      if (!otherProfileError && otherProfileData) {
        const otherConversations = Array.isArray(otherProfileData.conversations)
          ? otherProfileData.conversations
          : [];

        // Add conversation ID if not already present
        if (!otherConversations.includes(conversationId)) {
          console.log("📝 Adding conversation to other user's profile...");
          const { error: updateOtherError } = await supabase
            .from("profiles")
            .update({
              conversations: [...otherConversations, conversationId],
            })
            .eq("uid", otherUid);

          if (updateOtherError) {
            console.error("⚠️ Error updating other user's profile:", updateOtherError);
          } else {
            console.log("✅ Other user's profile updated");
          }
        }
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
    console.error("❌ Unexpected error in sendMessage:", error);
    Alert.alert("Error", `Failed to send message: ${error.message || "Unknown error"}`);
  }
};
