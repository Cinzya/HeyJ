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
import {
  useAudioRecorder,
  RecordingOptions,
  AudioModule,
  RecordingPresets,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "../utilities/ProfileProvider";
import ConversationsScreen from "./ConversationsScreen";
import { sendMessage } from "../utilities/SendMessage";
import { useNavigation } from "@react-navigation/native";
import { useAudioSettings } from "../utilities/AudioSettingsProvider";
// @ts-expect-error
import { FontAwesome } from "react-native-vector-icons";

const HomeScreen = () => {
  const navigation = useNavigation();
  const { profile, conversations, profiles } = useProfile();
  const { speakerMode, toggleSpeakerMode, autoplay, toggleAutoplay } = useAudioSettings();

  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [selectedRecipientName, setSelectedRecipientName] = useState<string>("");

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
    if (profile && selectedConversation) {
      const conversation = conversations.find((c) => c.conversationId === selectedConversation);
      if (conversation) {
        const uid: string = conversation.uids.filter((id) => id !== profile?.uid)[0];
        const otherProfile = profiles.find((p) => p.uid === uid);
        setSelectedRecipientName(otherProfile?.name || "---");
      } else {
        setSelectedRecipientName("");
      }
    } else {
      setSelectedRecipientName("");
    }
  }, [profile, profiles, selectedConversation, conversations]);

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
        <View style={styles.topButtonRow}>
          <TouchableOpacity
            onPress={toggleSpeakerMode}
            style={[styles.speakerButton, speakerMode && styles.speakerButtonActive]}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="volume-up"
              style={[styles.speakerIcon, speakerMode && styles.speakerIconActive]}
            />
            <Text style={[styles.speakerLabel, speakerMode && styles.speakerLabelActive]}>
              SPEAKER
            </Text>
            {speakerMode && <View style={styles.speakerIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleAutoplay}
            style={[styles.autoplayButton, autoplay && styles.autoplayButtonActive]}
            activeOpacity={0.7}
          >
            <FontAwesome
              name="play-circle"
              style={[styles.autoplayIcon, autoplay && styles.autoplayIconActive]}
            />
            <Text style={[styles.autoplayLabel, autoplay && styles.autoplayLabelActive]}>
              PLAY
            </Text>
            {autoplay && <View style={styles.autoplayIndicator} />}
          </TouchableOpacity>
        </View>
        <View style={styles.recipientContainer}>
          <Text style={styles.recipientLabel}>To:</Text>
          <View style={styles.recipientField}>
            <Text style={styles.recipientName}>
              {selectedRecipientName || "Select a Conversation"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={styles.holdAndSpeakButton}
          activeOpacity={0.8}
        >
          <Text style={styles.holdAndSpeakText}>HOLD TO SPEAK</Text>
        </TouchableOpacity>
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
    selectionContainer: {
      minHeight: 200,
      width: useWindowDimensions().width * 0.95,
      backgroundColor: "#D3D3D3",
      borderRadius: 12,
      alignSelf: "center",
      paddingVertical: 20,
      paddingHorizontal: 20,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowOffset: { width: 2, height: 4 },
      shadowRadius: 6,
      position: "absolute",
      bottom: 35,
      borderWidth: 2,
      borderColor: "#B0B0B0",
      borderTopWidth: 1,
    },
    recordingContainer: {
      height: 80,
      width: "100%",
      flexDirection: "row",
      alignSelf: "center",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: 15,
    },
    waveFormContainer: {
      maxWidth: useWindowDimensions().width * 0.6,
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 10,
    },
    waveDivider: {
      width: 2,
      height: 60,
      backgroundColor: "#666",
      borderRadius: 15,
      marginHorizontal: 2,
    },
    waveContainer: {
      flexDirection: "row",
      alignItems: "center",
      maxWidth: useWindowDimensions().width * 0.28,
      height: 60,
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
    recipientContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
      paddingHorizontal: 10,
    },
    recipientLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: "#333",
      marginRight: 10,
    },
    recipientField: {
      flex: 1,
      backgroundColor: "#FFF",
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: "#C0C0C0",
    },
    recipientName: {
      fontSize: 16,
      color: "#333",
    },
    topButtonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: 15,
      gap: 10,
    },
    speakerButton: {
      width: 90,
      height: 60,
      backgroundColor: "#E0E0E0",
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#B0B0B0",
      position: "relative",
    },
    speakerButtonActive: {
      backgroundColor: "#4CAF50",
      borderColor: "#45a049",
    },
    speakerIcon: {
      fontSize: 20,
      color: "#666",
      marginBottom: 4,
    },
    speakerIconActive: {
      color: "#FFF",
    },
    speakerLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: "#666",
      letterSpacing: 0.5,
    },
    speakerLabelActive: {
      color: "#FFF",
    },
    speakerIndicator: {
      position: "absolute",
      bottom: 6,
      left: "50%",
      marginLeft: -12,
      width: 24,
      height: 3,
      backgroundColor: "#FFF",
      borderRadius: 2,
    },
    autoplayButton: {
      width: 90,
      height: 60,
      backgroundColor: "#E0E0E0",
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#B0B0B0",
      position: "relative",
    },
    autoplayButtonActive: {
      backgroundColor: "#4CAF50",
      borderColor: "#45a049",
    },
    autoplayIcon: {
      fontSize: 20,
      color: "#666",
      marginBottom: 4,
    },
    autoplayIconActive: {
      color: "#FFF",
    },
    autoplayLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: "#666",
      letterSpacing: 0.5,
    },
    autoplayLabelActive: {
      color: "#FFF",
    },
    autoplayIndicator: {
      position: "absolute",
      bottom: 6,
      left: "50%",
      marginLeft: -12,
      width: 24,
      height: 3,
      backgroundColor: "#FFF",
      borderRadius: 2,
    },
    holdAndSpeakButton: {
      width: "100%",
      height: 180,
      backgroundColor: "#FF9800",
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 5,
      elevation: 4,
    },
    holdAndSpeakText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#FFF",
      letterSpacing: 1,
    },
    timeLabel: {
      paddingTop: 15,
      fontWeight: "600",
    },
  });
