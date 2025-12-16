import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  DimensionValue,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../utilities/ProfileProvider";
import { groupBy, sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import { useEffect, useRef, useState, useCallback } from "react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import { useNavigation } from "@react-navigation/native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets
} from "expo-audio";
import RecordingPlayer from "../components/chat/RecordingPlayer";
import RecordingPanel from "../components/chat/RecordingPanel";
// @ts-expect-error
import { FontAwesome } from "react-native-vector-icons";
import { HeaderBackButton } from "@react-navigation/elements";
import { sendMessage } from "../utilities/SendMessage";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
import UUID from "react-native-uuid";

const ConversationScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation();
  const conversationId = route.params.conversationId;
  const { profile, conversations, profiles } = useProfile();
  const insets = useSafeAreaInsets();
  const { autoplay } = useAudioSettings();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sortedMessages, setSortedMessages] = useState<
    { title: string; data: Message[] }[]
  >([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastPlayedMessageIdRef = useRef<string | null>(null);

  const getSortedMessages = () => {
    const conversation = conversations.find(
      (c) => c.conversationId === conversationId
    );
    const uid = conversation?.uids.filter((id) => id !== profile?.uid)[0];
    const otherProfile = profiles.find((p) => p.uid === uid);

    if (conversation && otherProfile) {
      const newMessages = sortBy(conversation.messages, (m) => m.timestamp);
      const groupedMessages = Object.values(
        groupBy(newMessages, (m) => formatDate(m.timestamp))
      );

      const today = groupedMessages.filter((m) => isToday(m[0].timestamp));

      const sorted = [
        ...groupedMessages.filter((m) => !isToday(m[0].timestamp)),
        ...today,
      ].map((group) => {
        const lastTime = formatDate(group[0].timestamp);

        return { title: lastTime, data: group };
      });

      setConversation(conversation!);
      setSortedMessages(sorted);
      setOtherProfile(otherProfile!);
    }
  };

  useEffect(() => {
    getSortedMessages();
  }, [conversationId, conversations, profile, profiles]);

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

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [recordingAllowed, setRecordingAllowed] = useState("denied");
  const [loudness, setLoudness] = useState<Number[]>(
    Array.from({ length: 20 }, () => 15)
  );

  const animatedWidth = useRef(new Animated.Value(45)).current;
  const animatedHeight = useRef(new Animated.Value(45)).current;
  const animatedRadius = useRef(new Animated.Value(45)).current;

  const [width, setWidth] = useState(45);
  const [height, setHeight] = useState(45);
  const [radius, setRadius] = useState(45);

  // Track if we're currently processing a recording to prevent race conditions
  const isProcessingRecording = useRef(false);

  useEffect(() => {
    // Request permissions and set up audio mode
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setRecordingAllowed(status.status);

      if (status.granted) {
        // Configure audio mode for recording
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      }
    })();

    const widthListener = animatedWidth.addListener(({ value }) =>
      setWidth(value)
    );
    const heightListener = animatedHeight.addListener(({ value }) =>
      setHeight(value)
    );
    const radiusListener = animatedRadius.addListener(({ value }) =>
      setRadius(value)
    );

    return () => {
      animatedWidth.removeListener(widthListener);
      animatedHeight.removeListener(heightListener);
      animatedRadius.removeListener(radiusListener);
    };
  }, []);

  const startRecording = async () => {
    console.log("🎤 startRecording called");

    if (recordingAllowed !== "granted") {
      console.log("⚠️ Permissions not granted, requesting...");
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setRecordingAllowed(status.status);
      if (status.status !== "granted") {
        return;
      }
    }

    if (recorderState.isRecording) {
      console.log("⚠️ Already recording, skipping start");
      return;
    }

    if (isProcessingRecording.current) {
      console.log("⚠️ Currently processing a recording, skipping start");
      return;
    }

    try {
      console.log("🎤 Preparing to record...");
      await audioRecorder.prepareToRecordAsync();
      console.log("🎤 Starting recording...");
      audioRecorder.record();
      console.log("✅ Recording started, recorderState.isRecording:", recorderState.isRecording);

      const widthAnimation = Animated.timing(animatedWidth, {
        toValue: 30,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const heightAnimation = Animated.timing(animatedHeight, {
        toValue: 30,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const radiusAnimation = Animated.timing(animatedRadius, {
        toValue: 10,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const parallelAnimation = Animated.parallel([
        widthAnimation,
        heightAnimation,
        radiusAnimation,
      ]);

      parallelAnimation.start();
    } catch (error) {
      console.error("❌ Error starting recording:", error);
    }
  };

  // Monitor recording for waveform visualization
  useEffect(() => {
    if (recorderState.isRecording) {
      const interval = setInterval(() => {
        const randomLoudness = Math.random() * 60 + 15;
        setLoudness((prevLoudness) => [...prevLoudness.slice(-19), randomLoudness]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [recorderState.isRecording]);

  const stopRecording = async () => {
    console.log("🛑 ========== stopRecording CALLED ==========");
    console.log("   recorderState.isRecording:", recorderState.isRecording);
    console.log("   isProcessingRecording:", isProcessingRecording.current);

    // If already processing, don't process again
    if (isProcessingRecording.current) {
      console.log("⚠️ Already processing a recording, skipping");
      return;
    }

    // Check if we're actually recording using the recorder state
    if (!recorderState.isRecording) {
      console.log("⚠️ Not recording according to recorderState, aborting");
      return;
    }

    // Validate prerequisites
    if (!profile) {
      console.error("❌ No profile available");
      return;
    }

    if (!conversationId) {
      console.error("❌ No conversation ID");
      return;
    }

    // Mark as processing to prevent duplicate calls
    isProcessingRecording.current = true;

    try {
      console.log("🛑 Stopping recording...");

      // Stop the recorder - the URI will be available on audioRecorder.uri after stopping
      await audioRecorder.stop();

      console.log("✅ Recording stopped");

      // The recording URI should be available immediately after stop()
      // According to docs: "The recording will be available on audioRecorder.uri"
      const uri = audioRecorder.uri;

      console.log("📁 Recording URI:", uri);

      if (uri) {
        console.log("📤 Sending message with URI:", uri);
        await sendMessage(
          navigation,
          { profile, conversations },
          uri,
          conversationId
        );
        console.log("✅ Message send completed");
      } else {
        console.error("❌ No audio URI after stopping recording");
        console.error("   audioRecorder state:", {
          isRecording: audioRecorder.isRecording,
          uri: audioRecorder.uri,
        });
      }
    } catch (error) {
      console.error("❌ Error stopping recording:", error);
    } finally {
      // Reset processing flag
      isProcessingRecording.current = false;

      // Reset UI
      setLoudness(Array.from({ length: 20 }, () => 15));

      const widthAnimation = Animated.timing(animatedWidth, {
        toValue: 45,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const heightAnimation = Animated.timing(animatedHeight, {
        toValue: 45,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const radiusAnimation = Animated.timing(animatedRadius, {
        toValue: 50,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      const parallelAnimation = Animated.parallel([
        widthAnimation,
        heightAnimation,
        radiusAnimation,
      ]);

      parallelAnimation.start();
    }
  };

  const styles = Styles(width, height, radius, insets);

  const [currentUri, setCurrentUri] = useState("");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

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

  // Auto-play new messages when they arrive and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      lastMessageCountRef.current = conversation?.messages.length || 0;
      return;
    }

    const currentMessageCount = conversation.messages.length;

    // Check if a new message was added (count increased)
    if (currentMessageCount > lastMessageCountRef.current) {
      // Find the newest unheard message from the other user
      const unheardMessages = conversation.messages
        .filter(
          (m) =>
            m.uid === otherProfile.uid && // From other user
            !m.isRead // Not read yet
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp, newest first

      if (unheardMessages.length > 0) {
        const newestUnheard = unheardMessages[0];

        // Only auto-play if this is a different message than we last played
        if (lastPlayedMessageIdRef.current !== newestUnheard.messageId) {
          console.log("🔔 New message received, autoplaying:", newestUnheard.messageId);
          lastPlayedMessageIdRef.current = newestUnheard.messageId;
          setIsAutoPlaying(true);
          setCurrentUri(newestUnheard.audioUrl);
        }
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [conversation?.messages.length, autoplay, profile?.uid, otherProfile?.uid, conversation?.messages]);

  // Function to find and play the next unheard message
  const playNextUnreadMessage = useCallback(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      setIsAutoPlaying(false);
      return;
    }

    // Get all messages sorted chronologically
    const sortedMessages = sortBy(conversation.messages, (m) => m.timestamp.getTime());

    // Find the current message by matching audioUrl
    const currentMessageIndex = sortedMessages.findIndex(
      (m) => m.audioUrl === currentUri
    );

    if (currentMessageIndex === -1) {
      console.log("❌ Current message not found");
      setIsAutoPlaying(false);
      return;
    }

    // Look for the next message in chronological order
    for (let i = currentMessageIndex + 1; i < sortedMessages.length; i++) {
      const nextMessage = sortedMessages[i];

      // Check if it's an incoming message (from other user)
      if (nextMessage.uid !== otherProfile.uid) {
        continue; // Skip outgoing messages
      }

      // If we encounter a read message, stop auto-play
      if (nextMessage.isRead) {
        console.log("✅ Next message is read, stopping auto-play");
        setIsAutoPlaying(false);
        return;
      }

      // Found an unread incoming message - play it
      console.log("▶️ Playing next unread message:", nextMessage.messageId, "URI:", nextMessage.audioUrl);
      // Small delay to ensure previous message has finished
      setTimeout(() => {
        setCurrentUri(nextMessage.audioUrl);
      }, 500);
      return;
    }

    // No more messages found
    console.log("✅ No more unread messages");
    setIsAutoPlaying(false);
  }, [autoplay, conversation, profile, otherProfile, currentUri]);

  // Auto-play oldest unheard message when conversation opens and autoplay is enabled
  useEffect(() => {
    if (!autoplay || !conversation || !profile || !otherProfile) {
      return;
    }

    // Small delay to ensure component is mounted
    setTimeout(() => {
      playNextUnreadMessage();
    }, 500);
  }, [conversation?.conversationId, autoplay, profile?.uid, otherProfile?.uid]);

  // Monitor when current message finishes playing to auto-play next
  useEffect(() => {
    if (!isAutoPlaying || !autoplay || !conversation || !otherProfile) {
      return;
    }

    // Check if any message is currently playing by checking if currentUri matches any message
    const currentMessage = conversation.messages.find(m => m.audioUrl === currentUri);
    if (!currentMessage) {
      return;
    }

    // We'll detect playback completion in RecordingPlayer and trigger next message
    // This effect will handle the transition
  }, [currentUri, isAutoPlaying, autoplay, conversation, otherProfile]);

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
        onPressOut={stopRecording}
        showTopButtons={true}
        showRecipient={true}
        recipientName={otherProfile?.name || "Select a Conversation"}
      />
    </View>
  );
};

export default ConversationScreen;

const formatDate = (timestamp: Date) => {
  if (isToday(timestamp)) {
    return "Today " + format(timestamp, "h:mm a");
  } else if (isYesterday(timestamp)) {
    return "Yesterday " + format(timestamp, "h:mm a");
  } else if (isThisWeek(timestamp)) {
    return format(timestamp, "EEEE");
  } else {
    return format(timestamp, "MM/dd/yyyy");
  }
};

const Styles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number,
  insets: { top: number; bottom: number; left: number; right: number }
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContainer: {
      paddingTop: Platform.OS === 'ios' ? insets.top - 25 : 175,
      paddingBottom: 400,
      justifyContent: "flex-end",
    },
    messageContainer: {
      width: "100%",
      paddingHorizontal: 15,
    },
  });

