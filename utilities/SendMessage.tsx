import { useNavigation } from "@react-navigation/native";
import { Alert } from "react-native";
import { useProfile } from "./ProfileProvider";
import { Audio } from "expo-av";
import UUID from "react-native-uuid";
import { supabase } from "../utilities/Supabase";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import Conversation from "../objects/Conversation";
import { sendPushNotification } from "./Onesignal";

export const sendMessage = async (
  navigation: any,
  profileData: {
    profile: Profile | null;
    conversations: Conversation[];
  },
  uri: string,
  conversationId: string
) => {
  const { profile, conversations } = profileData;

  const conversation = conversations.filter(
    (c) => c.conversationId === conversationId
  )[0];

  if (conversation) {
    const messageId = UUID.v4().toString();

    const fileName = `message_${messageId}.mp3`;
    const localUri = uri;

    const response = await fetch(localUri);
    const buffer = await response.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("message_audios")
      .upload(fileName, buffer, { contentType: "audio/mp3" });

    if (!error && data) {
      const url = supabase.storage
        .from("message_audios")
        .getPublicUrl(data.path).data.publicUrl;

      const message = new Message(messageId, new Date(), profile!.uid, url);

      const { data: messageData, error } = await supabase
        .from("messages")
        .insert(message.toJSON());

      if (!error) {
        const updatedMessages = [
          ...conversation.toJSON().messages,
          message.messageId,
        ];
        const newConversation = {
          ...conversation.toJSON(),
          messages: updatedMessages,
        };

        const { data: conversationData, error } = await supabase
          .from("conversations")
          .upsert(newConversation);

        if (error) {
          Alert.alert(
            "Something went wrong...",
            "We were unable to send your message. Please try again."
          );
          return;
        } else {
          sendPushNotification(
            conversation.uids.filter((id) => id !== profile?.uid)[0],
            `${profile?.firstName} ${profile?.lastName}`,
            profile?.profilePicture!,
            conversationId,
            url
          );
        }
      }
    }
  }
};
