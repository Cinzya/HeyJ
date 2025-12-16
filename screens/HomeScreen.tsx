import {
  View,
  StyleSheet,
  Animated,
  Text,
  TouchableOpacity,
  Easing,
  DimensionValue,
  FlatList,
  useWindowDimensions,
  Image,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import {
  useAudioRecorder,
  RecordingOptions,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
// @ts-expect-error
import { FontAwesome } from "react-native-vector-icons";
import { useProfile } from "../utilities/ProfileProvider";
import ConversationsScreen from "./ConversationsScreen";
import { sendMessage } from "../utilities/SendMessage";
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { profile, conversations, profiles } = useProfile();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [pickerOptions, setPickerOptions] = useState<
    {
      label: string;
      value: string;
      icon: () => React.ReactElement;
    }[]
  >([]);

  const recordingOptions: RecordingOptions = {
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 127,
      sampleRate: 44100,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  };


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

  useEffect(() => {
    if (profile) {
      const options =
        conversations.map((c) => {
          const uid: string = c.uids.filter((id) => id !== profile?.uid)[0];
          const otherProfile = profiles.find((p) => p.uid === uid);

          return {
            label: otherProfile?.name || "---",
            value: c.conversationId,
            icon: () => (
              <Image
                source={{ uri: otherProfile?.profilePicture }}
                style={styles.selectionImage}
              />
            ),
          };
        }) || [];

      setPickerOptions(options);
    }
  }, [profile, profiles]);

  useEffect(() => {
    navigation.addListener("blur", (event) => { });

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
  }, []);

  const requestPermissions = async () => {
    const response = await AudioModule.requestRecordingPermissionsAsync();
    setRecordingAllowed(response.status);
  };

  const startRecording = async () => {
    if (recordingAllowed !== "granted") {
      requestPermissions();
      return;
    }

    if (!selectedConversation) {
      alert("No conversation selected.");
      return;
    }

    try {
      console.log("🎤 Preparing to record...");
      await audioRecorder.prepareToRecordAsync();
      console.log("🎤 Starting recording...");
      await audioRecorder.record();
      console.log("✅ Recording started");

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

  // Monitor recording metering for waveform visualization
  useEffect(() => {
    if (audioRecorder.isRecording) {
      const interval = setInterval(() => {
        // expo-audio doesn't expose metering directly yet
        // For now, we'll use a simulated waveform
        const randomLoudness = Math.random() * 60 + 15;
        setLoudness((prevLoudness) => [...prevLoudness.slice(-19), randomLoudness]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [audioRecorder.isRecording]);

  const stopRecording = async () => {
    console.log(selectedConversation, audioRecorder.isRecording)
    if (!selectedConversation || !audioRecorder.isRecording) {
      return;
    }

    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        await sendMessage(
          navigation,
          { profile, conversations },
          audioRecorder.uri,
          selectedConversation
        );
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
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

  const noConversations = () => {
    return <Text style={styles.noConversationsLabel}>No Conversations</Text>;
  };

  return (
    <View style={styles.container}>
      {profile ? (
        <ConversationsScreen
          selectedConversation={selectedConversation}
          setSelectedConversation={setSelectedConversation}
        />
      ) : (
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      )}
      <View style={styles.selectionContainer}>
        <DropDownPicker
          open={pickerOpen}
          value={selectedConversation}
          items={pickerOptions}
          placeholder="Select a Conversation"
          setOpen={setPickerOpen}
          setValue={setSelectedConversation}
          onChangeValue={(value) => setSelectedConversation(value)}
          containerStyle={styles.conversationPicker}
          ListEmptyComponent={noConversations}
        />
        <View style={styles.recordingContainer}>
          <View style={styles.waveFormContainer}>
            {renderLeftWaves()}
            <View style={styles.waveDivider} />
            {renderRightWaves()}
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
    </View>
  );
};

export default HomeScreen;

const Styles = (
  buttonWidth: number,
  buttonHeight: number,
  buttonRadius: number
) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    pickerLabel: {
      bottom: 165,
    },
    conversationPicker: {
      width: "80%",
      // bottom: 150,
      alignSelf: "center",
    },
    noConversationsLabel: {
      alignSelf: "center",
      paddingVertical: 2,
    },
    selectionImage: {
      width: 35,
      height: 35,
      borderRadius: 50,
    },
    selectionContainer: {
      height: 175,
      width: useWindowDimensions().width * 0.88,
      backgroundColor: "#E2E2E2",
      borderRadius: 25,
      alignSelf: "center",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#A2A2A2",
      shadowOpacity: 0.5,
      shadowOffset: { width: 3, height: 3 },
      position: "absolute",
      bottom: 35,
    },
    recordingContainer: {
      height: 100,
      width: useWindowDimensions().width * 0.88,
      flexDirection: "row",
      // backgroundColor: "#E2E2E2",
      // borderRadius: 25,
      alignSelf: "center",
      justifyContent: "flex-start",
      alignItems: "center",
      // shadowColor: "#A2A2A2",
      // shadowOpacity: 0.5,
      // shadowOffset: { width: 3, height: 3 },
      // position: "absolute",
      // bottom: 35,
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
      maxWidth: useWindowDimensions().width * 0.3,
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
    timeLabel: {
      paddingTop: 15,
      fontWeight: "600",
    },
  });
