import { useState, useRef, useEffect } from "react";
import { Animated, Easing, Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";

interface UseAudioRecordingOptions {
  onStopRecording?: (uri: string) => Promise<void>;
  requireConversation?: boolean;
  conversationId?: string | null;
}

export const useAudioRecording = (options: UseAudioRecordingOptions = {}) => {
  const { onStopRecording, requireConversation, conversationId } = options;

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

  // Request permissions and set up audio mode
  const requestPermissions = async () => {
    const response = await AudioModule.requestRecordingPermissionsAsync();
    setRecordingAllowed(response.status);

    if (response.granted) {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }
    }
  };

  // Initialize permissions and animation listeners
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
  }, []);

  // Monitor recording metering for waveform visualization
  useEffect(() => {
    if (recorderState.isRecording) {
      const interval = setInterval(() => {
        // expo-audio doesn't expose metering directly yet
        // For now, we'll use a simulated waveform
        const randomLoudness = Math.random() * 60 + 15;
        setLoudness((prevLoudness) => [...prevLoudness.slice(-19), randomLoudness]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [recorderState.isRecording]);

  const startRecording = async () => {
    if (recordingAllowed !== "granted") {
      await requestPermissions();
      if (recordingAllowed !== "granted") {
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

    if (requireConversation && !conversationId) {
      Alert.alert("Error", "No conversation selected.");
      return;
    }

    try {
      // Ensure audio mode is set for recording (especially important on iOS)
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
        // Add a small delay to ensure audio mode takes effect on iOS
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Error setting audio mode for recording:", error);
      }

      console.log("🎤 Preparing to record...");
      await audioRecorder.prepareToRecordAsync();
      console.log("🎤 Starting recording...");
      await audioRecorder.record();
      console.log("✅ Recording started");

      // Animate button to recording state
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

  const stopRecording = async () => {
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

    // Mark as processing to prevent duplicate calls
    isProcessingRecording.current = true;

    try {
      console.log("🛑 Stopping recording...");
      await audioRecorder.stop();
      console.log("✅ Recording stopped");

      const uri = audioRecorder.uri;
      console.log("📁 Recording URI:", uri);

      if (uri && onStopRecording) {
        await onStopRecording(uri);
      }
    } catch (error) {
      console.error("❌ Error stopping recording:", error);
    } finally {
      // Reset processing flag
      isProcessingRecording.current = false;

      // Reset UI
      setLoudness(Array.from({ length: 20 }, () => 15));

      // Animate button back to normal state
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

  return {
    audioRecorder,
    recorderState,
    recordingAllowed,
    loudness,
    width,
    height,
    radius,
    startRecording,
    stopRecording,
    requestPermissions,
  };
};

