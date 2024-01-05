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
} from "react-native";
import { useProfile } from "../utilities/ProfileProvider";
import { groupBy, sortBy } from "lodash";
import Conversation from "../objects/Conversation";
import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import RecordingPlayer from "../components/chat/RecordingPlayer";
// @ts-expect-error
import { FontAwesome } from "react-native-vector-icons";
import { HeaderBackButton } from "@react-navigation/elements";
import { sendMessage } from "../utilities/SendMessage";
import { OneSignal } from "react-native-onesignal";
import { updateLastRead } from "../utilities/UpdateConversation";

const ConversationScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation();
  const conversationId = route.params.conversationId;
  const { profile, conversations, profiles } = useProfile();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sortedMessages, setSortedMessages] = useState<
    { title: string; data: Message[] }[]
  >([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);

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
  }, [conversationId, conversation, profile, profiles]);

  useEffect(() => {
    navigation.setOptions({
      title: otherProfile?.firstName + " " + otherProfile?.lastName,
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

  const [recording, setRecording] = useState<Audio.Recording>();
  const [recordingAllowed, setRecordingAllowed] = useState("denied");
  const [recordingStatus, setRecordingStatus] =
    useState<Audio.RecordingStatus>();
  const [isRecording, setIsRecording] = useState(false);
  const [loudness, setLoudness] = useState<Number[]>(
    Array.from({ length: 20 }, () => 15)
  );

  const animatedWidth = useRef(new Animated.Value(45)).current;
  const animatedHeight = useRef(new Animated.Value(45)).current;
  const animatedRadius = useRef(new Animated.Value(45)).current;

  const [width, setWidth] = useState(45);
  const [height, setHeight] = useState(45);
  const [radius, setRadius] = useState(45);

  useEffect(() => {
    requestPermissions();

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
  });

  const requestPermissions = async () => {
    const response = await Audio.requestPermissionsAsync();
    setRecordingAllowed(response.status);
  };

  const startRecording = async () => {
    if (recordingAllowed !== "granted") {
      requestPermissions();
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: true,
    });

    const newRecording = new Audio.Recording();
    setRecording(newRecording);

    newRecording.setProgressUpdateInterval(10);
    await newRecording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    newRecording.setOnRecordingStatusUpdate((status: Audio.RecordingStatus) => {
      setRecordingStatus(status);
    });

    await newRecording.startAsync();

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
  };

  useEffect(() => {
    const newNumber = recordingStatus?.metering;
    if (newNumber) {
      const interpolate = (
        value: any,
        inMin: any,
        inMax: any,
        outMin: any,
        outMax: any
      ) => {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
      };

      const adjustedLoudness = interpolate(newNumber, -160, 0, 0, 75);

      setLoudness((prevLoudness) => [...prevLoudness, adjustedLoudness]);
    }
  }, [recordingStatus]);

  const stopRecording = async () => {
    if (!recording) {
      return;
    }

    Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    try {
      await recording.stopAndUnloadAsync();
      sendMessage(
        navigation,
        { profile, conversations },
        recording.getURI()!,
        conversationId
      );
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
      setRecording(undefined);
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

  const styles = Styles(width, height, radius);

  const [currentUri, setCurrentUri] = useState("");

  const renderMessage = (message: Message) => {
    if (message.uid === otherProfile?.uid) {
      return (
        <View style={styles.incomingContainer}>
          <Image
            style={styles.incomingProfilePicture}
            source={{ uri: otherProfile.profilePicture }}
          />
          <View style={styles.incomingMessage}>
            <RecordingPlayer
              uri={message.audioUrl}
              currentUri={currentUri}
              setCurrentUri={setCurrentUri}
            />
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.outgoingContainer}>
          <View style={styles.outgoingMessage}>
            <RecordingPlayer
              uri={message.audioUrl}
              currentUri={currentUri}
              setCurrentUri={setCurrentUri}
            />
          </View>
          <Image
            style={styles.outgoingProfilePicture}
            source={{ uri: profile!.profilePicture }}
          />
        </View>
      );
    }
  };

  const renderRightWaves = () => {
    const waves = Array.from({ length: 20 }, (_, index) => (
      <View key={index} style={styles.rightWave} />
    ));

    return waves;
  };

  const renderLeftWaves = () => {
    return (
      <FlatList
        data={loudness}
        style={{ width: "100%" }}
        horizontal
        contentContainerStyle={[
          styles.waveContainer,
          {
            justifyContent: "flex-end",
            paddingLeft: 0,
          },
        ]}
        renderItem={({ item, index }) => {
          return (
            <View
              key={index}
              style={[styles.leftWave, { height: item as DimensionValue }]}
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
        <Text style={styles.date}>{title}</Text>
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
      <View style={styles.recordingContainer}>
        <View style={styles.waveFormContainer}>
          {renderLeftWaves()}
          <View style={styles.waveDivider} />
          <View style={styles.waveContainer}>{renderRightWaves()}</View>
        </View>
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={styles.buttonOutline}
        >
          <View style={styles.button}>
            <FontAwesome name="microphone" style={styles.microphone} />
          </View>
        </TouchableOpacity>
      </View>
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
  buttonRadius: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContainer: {
      paddingTop: 175,
      justifyContent: "flex-end",
      bottom: 160,
    },
    date: {
      alignSelf: "center",
    },
    incomingContainer: {
      width: "100%",
      height: 85,
      flexDirection: "row",
      marginHorizontal: 15,
      alignItems: "center",
    },
    incomingMessage: {
      width: 250,
      height: 65,
      borderRadius: 15,
      backgroundColor: "#B2B2B2",
      alignItems: "center",
      justifyContent: "center",
    },
    incomingProfilePicture: {
      width: 35,
      height: 35,
      borderRadius: 50,
      marginRight: 5,
    },
    lastMessage: {
      fontSize: 14,
      color: "gray",
    },
    outgoingContainer: {
      width: "100%",
      height: 85,
      flexDirection: "row",
      paddingHorizontal: 15,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    outgoingProfilePicture: {
      width: 35,
      height: 35,
      borderRadius: 50,
      marginLeft: 5,
    },
    outgoingMessage: {
      width: 250,
      height: 65,
      borderRadius: 15,
      backgroundColor: "#E9E9E9",
      alignItems: "center",
      justifyContent: "center",
    },
    recordingContainer: {
      height: 100,
      width: useWindowDimensions().width * 0.88,
      flexDirection: "row",
      backgroundColor: "#E2E2E2",
      borderRadius: 25,
      alignSelf: "center",
      justifyContent: "flex-start",
      alignItems: "center",
      shadowColor: "#A2A2A2",
      shadowOpacity: 0.5,
      shadowOffset: { width: 3, height: 3 },
      position: "absolute",
      bottom: 35,
    },
    waveFormContainer: {
      maxWidth: useWindowDimensions().width * 0.65,
      flexDirection: "row",
      alignItems: "center",
      position: "absolute",
      left: 15,
    },
    waveDivider: {
      width: 2,
      height: 75,
      backgroundColor: "red",
      borderRadius: 15,
      marginHorizontal: 2,
    },
    waveContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: useWindowDimensions().width * 0.3,
      height: 75,
    },
    rightWave: {
      width: 2,
      height: 15,
      backgroundColor: "#a2a2a2",
      borderRadius: 15,
      marginHorizontal: 2,
    },
    leftWave: {
      width: 2,
      height: 15,
      backgroundColor: "#000",
      borderRadius: 15,
      marginHorizontal: 2,
    },
    buttonOutline: {
      width: 60,
      height: 60,
      borderColor: "#000",
      borderRadius: 75,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      position: "absolute",
      right: 25,
    },
    button: {
      width: buttonWidth,
      height: buttonHeight,
      borderRadius: buttonRadius,
      backgroundColor: "red",
      alignItems: "center",
      justifyContent: "center",
    },
    microphone: {
      fontSize: 20,
      color: "#FFF",
    },
  });
