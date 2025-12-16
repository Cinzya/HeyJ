import {
  View,
  Text,
  FlatList,
  Platform,
} from "react-native";
import { createStyles as createConversationScreenStyles } from "../styles/ConversationScreen.styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../utilities/ProfileProvider";
import { useConversations } from "../utilities/ConversationsProvider";
import { useEffect, useRef } from "react";
import Message from "../objects/Message";
import { useNavigation } from "@react-navigation/native";
import RecordingPlayer from "../components/chat/RecordingPlayer";
import RecordingPanel from "../components/chat/RecordingPanel";
import { HeaderBackButton } from "@react-navigation/elements";
import { sendMessage } from "../utilities/SendMessage";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useConversationMessages } from "../hooks/useConversationMessages";
import { useConversationAutoplay } from "../hooks/useConversationAutoplay";
import { ConversationScreenProps } from "../types/navigation";

const ConversationScreen = ({ route }: ConversationScreenProps) => {
  const navigation = useNavigation();
  const conversationId = route.params.conversationId;
  const { profile } = useProfile();
  const { conversations } = useConversations();
  const insets = useSafeAreaInsets();
  const { autoplay } = useAudioSettings();

  const { conversation, sortedMessages, otherProfile } = useConversationMessages(conversationId);
  const { currentUri, setCurrentUri, isAutoPlaying, playNextUnreadMessage } = useConversationAutoplay(
    conversation,
    otherProfile,
    profile
  );

  useEffect(() => {
    navigation.setOptions({
      title: otherProfile?.name || "Conversation",
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => {
            navigation.goBack();
          }}
          tintColor="black"
        />
      ),
    });
  }, [otherProfile]);

  const {
    width,
    height,
    radius,
    startRecording,
    stopRecording: stopRecordingHook,
  } = useAudioRecording({
    conversationId,
    onStopRecording: async (uri: string) => {
      if (profile && conversationId) {
        await sendMessage(
          navigation,
          { profile, conversations },
          uri,
          conversationId
        );
      }
    },
  });

  const styles = createConversationScreenStyles(width, height, radius, insets);

  const renderMessage = (message: Message) => {
    if (message.uid === otherProfile?.uid) {
      // Incoming message - align left with avatar on left
      return (
        <View style={styles.messageContainer}>
          <RecordingPlayer
            uri={message.audioUrl}
            currentUri={currentUri}
            setCurrentUri={setCurrentUri}
            messageId={message.messageId}
            senderUid={message.uid}
            currentUserUid={profile!.uid}
            isRead={message.isRead}
            timestamp={message.timestamp}
            profilePicture={otherProfile.profilePicture}
            isIncoming={true}
            autoPlay={autoplay && !message.isRead && isAutoPlaying}
            onPlaybackFinished={isAutoPlaying ? playNextUnreadMessage : undefined}
          />
        </View>
      );
    } else {
      // Outgoing message - align right with avatar on right
      return (
        <View style={styles.messageContainer}>
          <RecordingPlayer
            uri={message.audioUrl}
            currentUri={currentUri}
            setCurrentUri={setCurrentUri}
            messageId={message.messageId}
            senderUid={message.uid}
            currentUserUid={profile!.uid}
            isRead={message.isRead}
            timestamp={message.timestamp}
            profilePicture={profile!.profilePicture}
            isIncoming={false}
          />
        </View>
      );
    }
  };

  const renderRightWaves = () => {
    return (
      <View style={{ flexDirection: "row" }}>
        {Array.from({ length: 20 }, (_, index) => (
          <View key={index} style={{ width: 2, height: 15, backgroundColor: "#a2a2a2", borderRadius: 15, marginHorizontal: 2 }} />
        ))}
      </View>
    );
  };

  const renderLeftWaves = () => {
    return (
      <FlatList
        data={loudness}
        style={{ width: "100%" }}
        horizontal
        contentContainerStyle={[
          {
            flexDirection: "row",
            alignItems: "center",
            maxWidth: useWindowDimensions().width * 0.28,
            height: 60,
            justifyContent: "flex-end",
            paddingLeft: 0,
          },
        ]}
        renderItem={({ item, index }) => {
          return (
            <View
              key={index}
              style={{ width: 2, height: item as DimensionValue, backgroundColor: "#000", borderRadius: 15, marginHorizontal: 2 }}
            />
          );
        }}
      />
    );
  };

  const renderSection = ({
    title,
    data,
  }: {
    title: string;
    data: Message[];
  }) => {
    return (
      <View>
        <FlatList
          data={data}
          renderItem={({ item: message }) => renderMessage(message)}
        />
      </View>
    );
  };

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [sortedMessages]);

  useEffect(() => {
    if (conversation) {
      updateLastRead(conversation?.conversationId, profile!.uid);
    }
  }, [sortedMessages.length]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        scrollEnabled
        data={sortedMessages}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => renderSection(item)}
        contentContainerStyle={styles.listContainer}
        contentInsetAdjustmentBehavior="automatic"
        onContentSizeChange={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={() => <Text>No Messages</Text>}
      />
      <RecordingPanel
        onPressIn={startRecording}
        onPressOut={stopRecordingHook}
        showTopButtons={true}
        showRecipient={true}
        recipientName={otherProfile?.name || "Select a Conversation"}
      />
    </View>
  );
};

export default ConversationScreen;


