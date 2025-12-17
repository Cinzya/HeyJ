import { useState, useRef, useEffect } from "react";
import { Animated, Easing, Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets,
} from "expo-audio";
import { useAudioRecordingStore } from "../stores/useAudioRecordingStore";
const getRecordingStore = () => useAudioRecordingStore.getState();

interface UseAudioRecordingOptions {
  onStopRecording?: (uri: string) => Promise<void>;
  requireConversation?: boolean;
  conversationId?: string | null;
}

export const useAudioRecording = (options: UseAudioRecordingOptions = {}) => {
  const { onStopRecording, requireConversation, conversationId } = options;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  
  // Use Zustand store for state management
  const {
    isRecording,
    recordingAllowed,
    loudness,
    width,
    height,
    radius,
    setIsRecording,
    setRecordingAllowed,
    setLoudness,
    setButtonDimensions,
    setWidth,
    setHeight,
    setRadius,
    resetButtonDimensions,
  } = useAudioRecordingStore();

  const animatedWidth = useRef(new Animated.Value(45)).current;
  const animatedHeight = useRef(new Animated.Value(45)).current;
  const animatedRadius = useRef(new Animated.Value(45)).current;

  // Track if we're currently processing a recording to prevent race conditions
  const isProcessingRecording = useRef(false);

  // Request permissions and set up audio mode
  const requestPermissions = async () => {
    const response = await AudioModule.requestRecordingPermissionsAsync();
    setRecordingAllowed(response.status as "granted" | "denied" | "undetermined");

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

    const widthListener = animatedWidth.addListener(({ value }) => {
      setWidth(value);
    });
    const heightListener = animatedHeight.addListener(({ value }) => {
      setHeight(value);
    });
    const radiusListener = animatedRadius.addListener(({ value }) => {
      setRadius(value);
    });

    return () => {
      animatedWidth.removeListener(widthListener);
      animatedHeight.removeListener(heightListener);
      animatedRadius.removeListener(radiusListener);
    };
  }, []);

  // Sync recording state with store
  useEffect(() => {
    setIsRecording(recorderState.isRecording);
  }, [recorderState.isRecording, setIsRecording]);

  // Monitor recording metering for waveform visualization
  useEffect(() => {
    if (recorderState.isRecording) {
      const interval = setInterval(() => {
        // expo-audio doesn't expose metering directly yet
        // For now, we'll use a simulated waveform
        const currentLoudness = useAudioRecordingStore.getState().loudness;
        const randomLoudness = Math.random() * 60 + 15;
        setLoudness([...currentLoudness.slice(-19), randomLoudness]);
      }, 100);

      return () => clearInterval(interval);
    } else {
      // Reset loudness when not recording
      setLoudness(Array.from({ length: 20 }, () => 15));
    }
  }, [recorderState.isRecording, setLoudness]);

  const startRecording = async () => {
    if (recordingAllowed !== "granted") {
      await requestPermissions();
      // Check the updated permission state from the store
      const { recordingAllowed: updatedPermission } = getRecordingStore();
      if (updatedPermission !== "granted") {
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
      setIsRecording(true);

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
      setIsRecording(false);
      resetButtonDimensions();

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
        toValue: 45,
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

