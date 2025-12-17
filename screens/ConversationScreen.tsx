// React
import React, { useEffect, useRef } from "react";
import { View, Text, FlatList } from "react-native";

// Navigation
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { HeaderBackButton } from "@react-navigation/elements";

// Third-party libraries
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utilities & Providers
import { useProfile } from "../utilities/ProfileProvider";
import { useConversations } from "../utilities/ConversationsProvider";
import { sendMessage } from "../utilities/SendMessage";
import { updateLastRead } from "../utilities/UpdateConversation";

// Hooks & Stores
import { useAudioRecording } from "../hooks/useAudioRecording";
import { useConversationMessages } from "../hooks/useConversationMessages";
import { useAudioRecordingStore } from "../stores/useAudioRecordingStore";

// Components
import RecordingPanel from "../components/chat/RecordingPanel";
import MessageSection from "../components/chat/MessageSection";

// Objects & Types
import Message from "../objects/Message";
import { ConversationScreenProps, RootStackParamList } from "../types/navigation";

// Styles
import { createStyles as createConversationScreenStyles } from "../styles/ConversationScreen.styles";
import { colors } from "../styles/theme";

const ConversationScreen = ({ route }: ConversationScreenProps) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const conversationId = route.params.conversationId;
  const { profile } = useProfile();
  const { conversations, updateMessageReadStatus } = useConversations();
  const insets = useSafeAreaInsets();

  const { conversation, sortedMessages, otherProfile } = useConversationMessages(conversationId);
  const [currentUri, setCurrentUri] = React.useState("");
  const { isRecording } = useAudioRecordingStore();
  
  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef<number>(0);
  // Track if user has manually scrolled away from bottom
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);
  // Track if this is initial load
  const isInitialLoadRef = useRef(true);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessageCountRef.current = 0;
    setShouldAutoScroll(true);
  }, [conversationId]);

  useEffect(() => {
    navigation.setOptions({
      title: otherProfile?.name || "Conversation",
      headerLeft: () => (
        <HeaderBackButton
          onPress={() => {
            navigation.goBack();
          }}
          tintColor={colors.text}
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

  // Only scroll to end when a new message is actually added (not on every data change)
  useEffect(() => {
    const currentMessageCount = sortedMessages.reduce((sum, section) => sum + section.data.length, 0);
    const prevMessageCount = prevMessageCountRef.current;
    
    // Only scroll if:
    // 1. This is the initial load, OR
    // 2. A new message was added AND user should auto-scroll
    if (isInitialLoadRef.current) {
      // Initial load - scroll to end
      if (flatListRef.current && currentMessageCount > 0) {
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }
      isInitialLoadRef.current = false;
      prevMessageCountRef.current = currentMessageCount;
    } else if (currentMessageCount > prevMessageCount && shouldAutoScroll) {
      // New message added and user is at/near bottom - scroll to end
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      prevMessageCountRef.current = currentMessageCount;
    } else {
      // Just update the count without scrolling
      prevMessageCountRef.current = currentMessageCount;
    }
  }, [sortedMessages, shouldAutoScroll]);

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
        onScroll={(event) => {
          // Track if user is near the bottom (within 100px)
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
          setShouldAutoScroll(distanceFromBottom < 100);
        }}
        scrollEventThrottle={400}
        ListEmptyComponent={() => <Text>No Messages</Text>}
      />
      <RecordingPanel
        onPressIn={startRecording}
        onPressOut={stopRecordingHook}
        showTopButtons={true}
        showRecipient={true}
        recipientName={otherProfile?.name || "Select a Conversation"}
        isRecording={isRecording}
        isInConversationScreen={true}
      />
    </View>
  );
};

export default ConversationScreen;


