import { View } from "react-native";
import Message from "../../objects/Message";
import MessageItem from "./MessageItem";
import Profile from "../../objects/Profile";

interface MessageSectionProps {
  title: string;
  data: Message[];
  currentUri: string;
  setCurrentUri: (uri: string) => void;
  currentUserUid: string;
  otherProfile: Profile | null;
  currentUserProfile: Profile;
  autoplay: boolean;
  isAutoPlaying: boolean;
  playNextUnreadMessage?: () => void;
  stopAutoplay?: () => void;
  onMarkAsRead?: (messageId: string) => void;
  messageContainerStyle: any;
}

const MessageSection = ({
  title,
  data,
  currentUri,
  setCurrentUri,
  currentUserUid,
  otherProfile,
  currentUserProfile,
  autoplay,
  isAutoPlaying,
  playNextUnreadMessage,
  stopAutoplay,
  onMarkAsRead,
  messageContainerStyle,
}: MessageSectionProps) => {
  return (
    <View>
      {data.map((message) => (
        <MessageItem
          key={message.messageId}
          message={message}
          currentUri={currentUri}
          setCurrentUri={setCurrentUri}
          currentUserUid={currentUserUid}
          otherProfile={otherProfile}
          currentUserProfile={currentUserProfile}
          autoplay={autoplay}
          isAutoPlaying={isAutoPlaying}
          playNextUnreadMessage={playNextUnreadMessage}
          stopAutoplay={stopAutoplay}
          onMarkAsRead={onMarkAsRead}
          styles={{ messageContainer: messageContainerStyle }}
        />
      ))}
    </View>
  );
};

export default MessageSection;
