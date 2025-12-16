import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from "react-native";
import Slider from "@react-native-community/slider";
// @ts-expect-error
import { Entypo, FontAwesome } from "react-native-vector-icons";
import { format, isToday, isYesterday } from "date-fns";
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
import { supabase } from "../../utilities/Supabase";

const RecordingPlayer = ({
  uri,
  currentUri,
  setCurrentUri,
  messageId,
  senderUid,
  currentUserUid,
  isRead,
  timestamp,
  profilePicture,
  isIncoming,
  autoPlay,
  onPlaybackFinished,
}: {
  uri: string;
  currentUri: string;
  setCurrentUri: any;
  messageId: string;
  senderUid: string;
  currentUserUid: string;
  isRead?: boolean;
  timestamp?: Date;
  profilePicture?: string;
  isIncoming?: boolean;
  autoPlay?: boolean;
  onPlaybackFinished?: () => void;
}) => {
  const [file, setFile] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [localIsRead, setLocalIsRead] = useState(isRead || false);
  const hasMarkedAsRead = useRef(false);
  const hasToggledRead = useRef(false);
  const hasAutoPlayed = useRef(false);
  const { speakerMode, autoplay } = useAudioSettings();

  // Initialize player - will be set when file loads
  // Use a placeholder that won't cause errors
  const audioPlayer = useAudioPlayer(file);
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  const [duration, setDuration] = useState<number | null>(0);
  const [position, setPosition] = useState(0);

  const handlePlayStart = () => {
    // Only mark as read if recipient is playing (not the sender) and this is the current message
    // Double-check that we're actually playing this specific message
    if (!hasMarkedAsRead.current && currentUserUid !== senderUid && currentUri === uri && playerStatus.playing) {
      console.log("📖 Marking message as read:", messageId, "URI:", uri);
      markMessageAsRead(messageId);
      hasMarkedAsRead.current = true;
      setLocalIsRead(true);
    }
  };

  const toggleReadStatus = async () => {
    const currentDisplayIsRead = hasToggledRead.current ? localIsRead : (isRead || false);

    console.log("🔘 toggleReadStatus called", {
      currentUserUid,
      senderUid,
      messageId,
      currentDisplayIsRead,
      localIsRead,
      isRead,
      hasToggledRead: hasToggledRead.current,
      isFromOtherUser: currentUserUid !== senderUid
    });

    if (currentUserUid === senderUid) {
      // Can't toggle read status for your own messages
      console.log("❌ Cannot toggle - this is your own message");
      return;
    }

    const newReadStatus = !currentDisplayIsRead;
    console.log("✅ Toggling read status from", currentDisplayIsRead, "to", newReadStatus);
    hasToggledRead.current = true;
    setLocalIsRead(newReadStatus);

    // Update the database
    try {
      const { error } = await supabase
        .from("messages")
        .update({ isRead: newReadStatus })
        .eq("messageId", messageId);

      if (error) {
        console.error("Error toggling message read status:", error);
        // Revert on error
        hasToggledRead.current = false;
        setLocalIsRead(!newReadStatus);
      } else {
        console.log("✅ Successfully updated read status in database");
      }
    } catch (error) {
      console.error("Error toggling message read status:", error);
      // Revert on error
      hasToggledRead.current = false;
      setLocalIsRead(!newReadStatus);
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
          audioPlayer.play();
          // Mark as read after playback starts
          setTimeout(() => {
            if (playerStatus.playing && currentUri === uri) {
              handlePlayStart();
            }
          }, 100);
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
      hasAutoPlayed.current = false;
    } else if (currentUri === uri && (autoPlay || autoplay) && !hasAutoPlayed.current && currentUserUid !== senderUid) {
      // Auto-play when this becomes the current message and autoplay is enabled
      if (isReady && file) {
        // Audio is already loaded, play immediately
        hasAutoPlayed.current = true;
        audioPlayer.play();
        // Mark as read after a small delay to ensure playback actually started
        setTimeout(() => {
          if (playerStatus.playing && currentUri === uri) {
            handlePlayStart();
          }
        }, 100);
      } else if (!isLoading && !file) {
        // Audio needs to be loaded first, then play
        hasAutoPlayed.current = true;
        loadAudio(true); // Pass true to play after loading
      }
    }
  }, [currentUri, uri, playerStatus.playing, isReady, file, isLoading, autoPlay, autoplay, currentUserUid, senderUid]);

  // Update local read state when prop changes (but only if we haven't toggled it manually)
  useEffect(() => {
    if (!hasToggledRead.current && isRead) {
      setLocalIsRead(true);
    }
  }, [isRead]);

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
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:292', message: 'Playback finished - pausing and seeking to 0', data: { uri, currentTime, totalDuration, isReady, hasFile: !!file }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
          setPosition(0);
          audioPlayer.pause();
          audioPlayer.seekTo(0);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:297', message: 'After pause and seekTo - player state', data: { uri, isReady, hasFile: !!file }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
          // Notify parent that playback finished (for autoplay queue)
          if (onPlaybackFinished && currentUri === uri) {
            onPlaybackFinished();
          }
        }
      }, 100);

      return () => clearInterval(interval);
    } else if (!playerStatus.playing && currentUri === uri) {
      // Update position even when paused
      setPosition((playerStatus.currentTime || 0) * 1000);
    }
  }, [playerStatus.playing, playerStatus.currentTime, currentUri, uri, isReady]);

  const pausePlay = async () => {
    // Reset autoplay flag when manually playing (user interaction)
    if (currentUri !== uri || !playerStatus.playing) {
      hasAutoPlayed.current = false;
    }

    // Configure audio session for playback before playing (especially important on iOS)
    if (Platform.OS === 'ios') {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:319', message: 'Setting audio mode to allowsRecording:false for playback', data: { uri }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B,E' }) }).catch(() => { });
        // #endregion
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false, // We're playing, not recording
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:325', message: 'Audio mode set to allowsRecording:false - this may block future recording', data: { uri }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'B,E' }) }).catch(() => { });
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:359', message: 'Switching to different audio - about to play', data: { uri, isReady, hasFile: !!file, currentPosition: position }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
        // #endregion
        // Small delay to ensure player is ready (especially on iOS)
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          audioPlayer.play();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:365', message: 'After play() call when switching audio', data: { uri }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:368', message: 'Error playing when switching audio', data: { uri, errorMessage: (error as Error)?.message || String(error) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
          console.error("Error playing audio when switching:", error);
        }
        // Mark as read after playback starts
        setTimeout(() => {
          if (playerStatus.playing && currentUri === uri) {
            handlePlayStart();
          }
        }, 100);
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:380', message: 'Pausing playback', data: { uri, isReady, hasFile: !!file, currentPosition: position }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
      // #endregion
      audioPlayer.pause();
    } else {
      if (isReady && file) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:386', message: 'About to call audioPlayer.play() - checking state', data: { uri, isReady, hasFile: !!file, currentPosition: position, playerStatusPlaying: playerStatus.playing, duration: playerStatus.duration }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
        // #endregion
        try {
          audioPlayer.play();
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:391', message: 'After audioPlayer.play() call - success', data: { uri }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
          // Mark as read after playback starts
          setTimeout(() => {
            if (playerStatus.playing && currentUri === uri) {
              handlePlayStart();
            }
          }, 100);
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:399', message: 'Error calling audioPlayer.play()', data: { uri, errorMessage: (error as Error)?.message || String(error), errorString: String(error) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
          console.error("Error playing audio:", error);
        }
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'RecordingPlayer.tsx:404', message: 'Cannot play - audio not ready', data: { uri, isReady, hasFile: !!file, isLoading }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'F' }) }).catch(() => { });
        // #endregion
      }
    }
  };

  const isPlaying = playerStatus.playing && currentUri === uri;
  const showLoading = isLoading && currentUri === uri;
  const isFromOtherUser = senderUid !== currentUserUid;
  const showReadStatus = isFromOtherUser;
  // Use local state if it's been set (toggled), otherwise use the prop
  // If localIsRead has been explicitly set (not just initialized), use it
  const displayIsRead = hasToggledRead.current ? localIsRead : (isRead || false);

  const formatTimestamp = (ts?: Date): string => {
    if (!ts) return "";
    if (isToday(ts)) {
      return format(ts, "h:mm a");
    } else if (isYesterday(ts)) {
      return "Yesterday " + format(ts, "h:mm a");
    } else {
      return format(ts, "MM/dd h:mm a");
    }
  };

  return (
    <View style={[styles.wrapper, isIncoming ? styles.wrapperIncoming : styles.wrapperOutgoing]}>
      {isIncoming && profilePicture && (
        <Image
          style={styles.avatar}
          source={{ uri: profilePicture }}
        />
      )}
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.leftHeader}>
            {showReadStatus && (
              <TouchableOpacity
                onPress={toggleReadStatus}
                style={styles.readStatusContainer}
                activeOpacity={0.7}
              >
                <FontAwesome
                  name={displayIsRead ? "check-circle" : "circle-o"}
                  size={16}
                  style={[styles.readIcon, displayIsRead && styles.readIconActive]}
                />
              </TouchableOpacity>
            )}
            {timestamp && (
              <>
                {showReadStatus && <View style={styles.separator} />}
                <View style={styles.timestampContainer}>
                  <FontAwesome name="clock-o" size={12} style={styles.timestampIcon} />
                  <Text style={styles.timestamp}>{formatTimestamp(timestamp) || ""}</Text>
                </View>
              </>
            )}
          </View>
          {duration != null && duration > 0 && (
            <View style={styles.durationBadge}>
              <FontAwesome name="headphones" size={12} style={styles.durationIcon} />
              <Text style={styles.durationText}>{formatTime(duration)}</Text>
            </View>
          )}
        </View>
        <View style={styles.playContainer}>
          <TouchableOpacity
            onPress={pausePlay}
            style={[styles.button, isPlaying && styles.buttonActive]}
            disabled={isLoading || !isReady}
            activeOpacity={0.7}
          >
            <Entypo
              name={isPlaying ? "pause-solid" : "controller-play"}
              size={28}
              color={isLoading || !isReady ? "#999" : isPlaying ? "#FFF" : "#000"}
            />
          </TouchableOpacity>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration || 1}
              value={position}
              onValueChange={(value) => {
                setPosition(value);
                audioPlayer.seekTo(value / 1000);
              }}
              minimumTrackTintColor={isPlaying ? "#4CAF50" : "#000"}
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor={isPlaying ? "#4CAF50" : "#000"}
              disabled={!isReady || !duration}
            />
            {showLoading && (
              <View style={styles.loadingOverlay}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
          </View>
        </View>
        {isPlaying && (
          <View style={styles.footerRow}>
            <View style={styles.playingIndicator}>
              <View style={styles.playingDot} />
              <Text style={styles.playingText}>Playing</Text>
            </View>
          </View>
        )}
      </View>
      {!isIncoming && profilePicture && (
        <Image
          style={styles.avatar}
          source={{ uri: profilePicture }}
        />
      )}
    </View>
  );
};

export default RecordingPlayer;

const formatTime = (time: number): string => {
  if (!time || time < 0) return "0s";
  const totalSeconds = Math.floor(time / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    marginVertical: 6,
  },
  wrapperIncoming: {
    justifyContent: "flex-start",
  },
  wrapperOutgoing: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    marginTop: 4,
  },
  container: {
    flex: 1,
    marginHorizontal: 10,
    padding: 16,
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    minWidth: 200,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  leftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  readStatusContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  readIcon: {
    color: "#999",
  },
  readIconActive: {
    color: "#4CAF50",
  },
  separator: {
    width: 1,
    height: 16,
    backgroundColor: "#D0D0D0",
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timestampIcon: {
    color: "#999",
  },
  timestamp: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8E8E8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D0D0",
  },
  durationIcon: {
    color: "#666",
  },
  durationText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  playContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  buttonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#45a049",
  },
  sliderContainer: {
    flex: 1,
    position: "relative",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  timeText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  playingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  playingText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

