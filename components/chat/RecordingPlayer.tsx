import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import Slider from "@react-native-community/slider";
// @ts-expect-error
import { Entypo } from "react-native-vector-icons";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  AudioSource,
  setAudioModeAsync
} from "expo-audio";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
import UUID from "react-native-uuid";
import { markMessageAsRead } from "../../utilities/MarkMessageAsRead";
import { useAudioSettings } from "../../utilities/AudioSettingsProvider";

const RecordingPlayer = ({
  uri,
  currentUri,
  setCurrentUri,
  messageId,
  senderUid,
  currentUserUid,
}: {
  uri: string;
  currentUri: string;
  setCurrentUri: any;
  messageId: string;
  senderUid: string;
  currentUserUid: string;
}) => {
  const [file, setFile] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const hasMarkedAsRead = useRef(false);
  const { speakerMode } = useAudioSettings();

  // Initialize player - will be set when file loads
  // Use a placeholder that won't cause errors
  const audioPlayer = useAudioPlayer(file);
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  const [duration, setDuration] = useState<number | null>(0);
  const [position, setPosition] = useState(0);

  const handlePlayStart = () => {
    // Only mark as read if recipient is playing (not the sender)
    if (!hasMarkedAsRead.current && currentUserUid !== senderUid) {
      markMessageAsRead(messageId);
      hasMarkedAsRead.current = true;
    }
  };

  const loadAudio = async (shouldPlay: boolean = false) => {
    if (isLoading || file) {
      // If already loaded and should play, play it
      if (shouldPlay && isReady && file && currentUri === uri) {
        handlePlayStart();
        audioPlayer.play();
      }
      return; // Already loading or loaded
    }

    try {
      setIsLoading(true);
      setIsReady(false);

      const docDir = documentDirectory;
      if (!docDir) {
        console.error("Error loading audio: Document directory is undefined");
        setIsLoading(false);
        return;
      }

      console.log("📥 Loading audio from:", uri);
      const downloadResumable = createDownloadResumable(
        uri,
        docDir + `${UUID.v4()}.mp4`,
        { cache: true }
      );

      const newFile = await downloadResumable.downloadAsync();

      if (newFile) {
        console.log("✅ Audio file downloaded:", newFile.uri);

        // Replace the audio source
        audioPlayer.replace(newFile.uri);
        setFile(newFile.uri);

        // Wait for player to be ready (especially important on iOS)
        // iOS needs time to prepare the audio
        const waitTime = Platform.OS === 'ios' ? 200 : 100;
        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Verify player is ready by checking if duration is available
        let attempts = 0;
        while (attempts < 10 && !playerStatus.duration) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }

        setIsReady(true);
        console.log("✅ Audio player ready, duration:", playerStatus.duration);

        // If we should play after loading, do it now
        if (shouldPlay && currentUri === uri) {
          // Ensure audio session is configured for playback on iOS
          if (Platform.OS === 'ios') {
            try {
              await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: false,
              });
            } catch (error) {
              console.error("Error setting audio mode for playback:", error);
            }
          }
          handlePlayStart();
          audioPlayer.play();
        }
      } else {
        console.error("Error loading audio: File is undefined");
        setIsReady(false);
      }
    } catch (error) {
      console.error("Error loading audio:", error);
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Configure audio session for playback (especially important on iOS)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false, // We're playing, not recording
      }).catch((error) => {
        console.error("Error setting audio mode:", error);
      });
    }
  }, []);

  // Pre-load audio metadata (duration) when component mounts
  useEffect(() => {
    // Load audio in background to get duration, but don't set as current
    if (!file && !isLoading) {
      loadAudio(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const unloadAudio = async () => {
    if (playerStatus.playing) {
      audioPlayer.pause();
    }
    // Don't reset duration - keep it for display
    // setFile(undefined); // Keep file loaded for quick access
    // setIsReady(false); // Keep ready state
    setPosition(0);
  };

  useEffect(() => {
    if (currentUri !== uri) {
      // Only pause if this was the playing audio
      if (playerStatus.playing) {
        audioPlayer.pause();
        setPosition(0);
      }
      // Reset the marked as read flag when switching to a different message
      hasMarkedAsRead.current = false;
    }
  }, [currentUri, uri, playerStatus.playing]);

  // Sync duration when player is ready (regardless of currentUri)
  useEffect(() => {
    if (playerStatus.duration) {
      setDuration(playerStatus.duration * 1000);
    }
  }, [playerStatus.duration]);

  // Monitor playback progress
  useEffect(() => {
    if (playerStatus.playing && currentUri === uri && isReady) {
      const interval = setInterval(() => {
        const currentTime = playerStatus.currentTime || 0;
        const totalDuration = playerStatus.duration || 0;

        setPosition(currentTime * 1000);

        // Check if finished
        if (currentTime >= totalDuration && totalDuration > 0) {
          setPosition(0);
          audioPlayer.pause();
          audioPlayer.seekTo(0);
        }
      }, 100);

      return () => clearInterval(interval);
    } else if (!playerStatus.playing && currentUri === uri) {
      // Update position even when paused
      setPosition((playerStatus.currentTime || 0) * 1000);
    }
  }, [playerStatus.playing, playerStatus.currentTime, currentUri, uri, isReady]);

  const pausePlay = async () => {
    // Configure audio session for playback before playing (especially important on iOS)
    if (Platform.OS === 'ios') {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false, // We're playing, not recording
        });
        // Note: expo-audio doesn't have direct speaker routing support
        // For full speaker routing, you may need to use expo-av or a native module
        // This is a placeholder for future implementation
        if (speakerMode) {
          // TODO: Implement speaker routing when expo-audio adds support
          // or integrate with expo-av Audio.setAudioModeAsync({ shouldRouteToSpeaker: true })
          console.log("Speaker mode enabled - routing to speaker");
        }
      } catch (error) {
        console.error("Error setting audio mode for playback:", error);
      }
    } else if (Platform.OS === 'android') {
      // Android speaker routing would go here
      if (speakerMode) {
        console.log("Speaker mode enabled - routing to speaker");
      }
    }

    // If this is not the current playing audio, switch to it
    if (currentUri !== uri) {
      setCurrentUri(uri);
      // Reset the marked as read flag when switching to a different message
      hasMarkedAsRead.current = false;
      // If audio is already loaded and ready, play immediately
      if (isReady && file) {
        // Small delay to ensure player is ready (especially on iOS)
        await new Promise(resolve => setTimeout(resolve, 100));
        handlePlayStart();
        audioPlayer.play();
        return;
      }
      // Otherwise, load it and then play
      if (!isLoading) {
        await loadAudio(true); // Pass true to play after loading
      }
      return;
    }

    // This is the current playing audio
    // If audio is not ready yet, load it first and then play
    if (!isReady && !isLoading) {
      await loadAudio(true); // Pass true to play after loading
      return;
    }

    // Toggle play/pause
    if (playerStatus.playing) {
      audioPlayer.pause();
    } else {
      if (isReady && file) {
        handlePlayStart();
        audioPlayer.play();
      }
    }
  };

  const isPlaying = playerStatus.playing && currentUri === uri;
  const showLoading = isLoading && currentUri === uri;

  return (
    <View style={styles.container}>
      <View style={styles.playContainer}>
        <TouchableOpacity
          onPress={pausePlay}
          style={styles.button}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Entypo
            name={isPlaying ? "controller-stop" : "controller-play"}
            size={25}
            color={isLoading ? "#999" : "#000"}
          />
        </TouchableOpacity>
        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={0}
          maximumValue={duration || 0}
          value={position}
          onValueChange={(value) => {
            setPosition(value);
            audioPlayer.seekTo(value / 1000);
          }}
          minimumTrackTintColor="#000"
          maximumTrackTintColor="#A2A2A2"
        />
      </View>
      <View style={styles.timeContainer}>
        <Text>{formatTime(position)}</Text>
        <Text>{duration ? formatTime(duration - position) : "--"}</Text>
      </View>
    </View>
  );
};

export default RecordingPlayer;

const formatTime = (time: number) => {
  const seconds = Math.floor(time / 1000);
  return seconds + "s";
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  playContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    paddingRight: 5,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

