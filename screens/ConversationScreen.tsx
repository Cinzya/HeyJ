import React from "react";
import {
  View,
  Text,
  FlatList,
} from "react-native";
import { createStyles as createConversationScreenStyles } from "../styles/ConversationScreen.styles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../utilities/ProfileProvider";
import { useConversations } from "../utilities/ConversationsProvider";
import { useEffect, useRef } from "react";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import RecordingPanel from "../components/chat/RecordingPanel";
import { HeaderBackButton } from "@react-navigation/elements";
import { sendMessage } from "../utilities/SendMessage";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useConversationMessages } from "../hooks/useConversationMessages";
import { useAudioRecordingStore } from "../stores/useAudioRecordingStore";
import { ConversationScreenProps, RootStackParamList } from "../types/navigation";
import MessageSection from "../components/chat/MessageSection";
import Message from "../objects/Message";

const ConversationScreen = ({ route }: ConversationScreenProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const conversationId = route.params.conversationId;
  const { profile } = useProfile();
  const { conversations, updateMessageReadStatus } = useConversations();
  const insets = useSafeAreaInsets();

  const { conversation, sortedMessages, otherProfile } = useConversationMessages(conversationId);
  const [currentUri, setCurrentUri] = React.useState("");
  const { isRecording } = useAudioRecordingStore();

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

  const renderSection = ({
    title,
    data,
  }: {
    title: string;
    data: Message[];
  }) => {
    if (!profile) return null;
    
    return (
      <MessageSection
        title={title}
        data={data}
        currentUri={currentUri}
        setCurrentUri={setCurrentUri}
        currentUserUid={profile.uid}
        otherProfile={otherProfile}
        currentUserProfile={profile}
        autoplay={false}
        isAutoPlaying={false}
        onMarkAsRead={updateMessageReadStatus}
        messageContainerStyle={styles.messageContainer}
      />
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
        isRecording={isRecording}
      />
    </View>
  );
};

export default ConversationScreen;


