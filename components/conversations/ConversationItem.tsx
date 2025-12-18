import { View, Text, TouchableOpacity } from "react-native";
import Conversation from "../../objects/Conversation";
import Profile from "../../objects/Profile";
import { styles } from "../../styles/screens/ConversationsScreen.styles";
import { Entypo, FontAwesome } from "@expo/vector-icons";
import { isBefore } from "date-fns";
import { formatDate } from "../../utilities/dateUtils";
import {
  lastMessageTimestamp,
  lastMessageFromOtherUser,
  getStatusIndicator,
  getOtherUserUid,
} from "../../utilities/conversationUtils";
import { useAudioPlayer } from "expo-audio";
import { updateLastRead } from "../../utilities/UpdateConversation";

interface ConversationItemProps {
  conversation: Conversation;
  currentUserProfile: Profile;
  otherProfile: Profile;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  playFromUri: (uri: string, conversationId: string, audioPlayer: ReturnType<typeof useAudioPlayer>) => void;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
}

const ConversationItem = ({
  conversation,
  currentUserProfile,
  otherProfile,
  isSelected,
  onPress,
  onLongPress,
  playFromUri,
  audioPlayer,
}: ConversationItemProps) => {
  const status = getStatusIndicator(conversation, currentUserProfile.uid);

  const handlePress = () => {
    onPress();
    const lastMessage = lastMessageFromOtherUser(conversation, currentUserProfile.uid);

    // Play the last message from the other user when tapping the conversation
    if (lastMessage) {
      playFromUri(lastMessage.audioUrl, conversation.conversationId, audioPlayer);
      const lastRead = conversation.lastRead.find((l) => l.uid === currentUserProfile.uid);
      // Update last read if this message hasn't been read yet
      if (!lastRead || isBefore(lastRead.timestamp, lastMessage.timestamp)) {
        updateLastRead(conversation.conversationId, currentUserProfile.uid);
      }
    }
  };

  return (
    <TouchableOpacity
      style={
        isSelected
          ? styles.selectedConversationContainer
          : styles.conversationContainer
      }
      onPress={handlePress}
      onLongPress={onLongPress}
    >
      <View style={styles.statusIndicator}>
        <View style={[styles.statusCircle, { backgroundColor: status.color }]}>
          <FontAwesome name={status.icon as any} style={styles.statusIcon} />
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
      <TouchableOpacity style={styles.button} onPress={onLongPress}>
        <Entypo name="chat" style={styles.targetIcon} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default ConversationItem;
