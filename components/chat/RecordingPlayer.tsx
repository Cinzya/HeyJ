import React, { useEffect, useRef, useState } from "react";
import { View, Platform, Image } from "react-native";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  AudioSource,
  setAudioModeAsync
} from "expo-audio";
import { markMessageAsRead } from "../../utilities/MarkMessageAsRead";
import { useAudioSettings } from "../../utilities/AudioSettingsProvider";
import { supabase } from "../../utilities/Supabase";
import { loadAudioFile } from "../../services/audioService";
import { setAudioVolume } from "../../utilities/AudioRouting";
import RecordingPlayerHeader from "./RecordingPlayerHeader";
import RecordingPlayerControls from "./RecordingPlayerControls";
import PlayingIndicator from "./PlayingIndicator";
import { styles } from "../../styles/components/chat/RecordingPlayer.styles";

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
  stopAutoplay,
  onMarkAsRead,
}: {
  uri: string;
  currentUri: string;
  setCurrentUri: (uri: string) => void;
  messageId: string;
  senderUid: string;
  currentUserUid: string;
  isRead?: boolean;
  timestamp?: Date;
  profilePicture?: string;
  isIncoming?: boolean;
  autoPlay?: boolean;
  onPlaybackFinished?: () => void;
  stopAutoplay?: () => void;
  onMarkAsRead?: (messageId: string) => void;
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
      console.log("📖 Marking message as read:", messageId, "URI:", uri, "Playing:", playerStatus.playing);
      markMessageAsRead(messageId);
      hasMarkedAsRead.current = true;
      setLocalIsRead(true);
    } else {
      console.log("⚠️ Not marking as read:", {
        hasMarkedAsRead: hasMarkedAsRead.current,
        isRecipient: currentUserUid !== senderUid,
        isCurrentMessage: currentUri === uri,
        isPlaying: playerStatus.playing,
        messageId
      });
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
        // Check if we're at or near the end - if so, seek to beginning first
        const currentTime = playerStatus.currentTime || 0;
        const duration = playerStatus.duration || 0;
        const positionMs = position || 0;
        const durationMs = duration * 1000 || 0;
        
        const isAtEndByTime = duration > 0 && currentTime >= duration - 0.1;
        const isAtEndByPosition = durationMs > 0 && positionMs >= durationMs - 100;
        const isAtEnd = isAtEndByTime || isAtEndByPosition;
        
        if (isAtEnd) {
          console.log("🔄 Resetting playback position to beginning before replay (loadAudio)");
          audioPlayer.seekTo(0);
          setPosition(0);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        audioPlayer.play();
        // Note: Marking as read is now handled by the useEffect that watches playerStatus.playing
      }
      return; // Already loading or loaded
    }

    try {
      setIsLoading(true);
      setIsReady(false);

      const localFileUri = await loadAudioFile(uri);
      if (!localFileUri) {
        setIsLoading(false);
        setIsReady(false);
        return;
      }

      // Replace the audio source
      audioPlayer.replace(localFileUri);
      setFile(localFileUri);

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
        // Set audio volume based on speaker mode before playing
        setAudioVolume(audioPlayer, speakerMode);
        audioPlayer.play();
        // Note: Marking as read is now handled by the useEffect that watches playerStatus.playing
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

  // Update volume when speakerMode changes
  useEffect(() => {
    if (audioPlayer && isReady) {
      setAudioVolume(audioPlayer, speakerMode);
    }
  }, [speakerMode, audioPlayer, isReady]);

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
    } else if (currentUri === uri && autoPlay && !hasAutoPlayed.current && currentUserUid !== senderUid) {
      // Auto-play when this becomes the current message and autoplay is enabled
      // Note: autoPlay prop already includes the global autoplay setting check
      if (isReady && file) {
        // Audio is already loaded, play immediately
        hasAutoPlayed.current = true;
        console.log("🎯 Autoplay: Starting playback (will mark as read when playing):", messageId);
        audioPlayer.play();
      } else if (!isLoading && !file) {
        // Audio needs to be loaded first, then play
        hasAutoPlayed.current = true;
        console.log("🎯 Autoplay: Starting playback (will mark as read when playing):", messageId);
        loadAudio(true); // Pass true to play after loading
      }
    }
  }, [currentUri, uri, playerStatus.playing, isReady, file, isLoading, autoPlay, currentUserUid, senderUid]);

  // Update local read state when prop changes (but only if we haven't toggled it manually)
  useEffect(() => {
    if (!hasToggledRead.current && isRead) {
      setLocalIsRead(true);
    }
  }, [isRead]);

  // Watch for playback start and mark as read when playing starts
  useEffect(() => {
    // Only mark as read if:
    // 1. This is the current message (currentUri === uri)
    // 2. Player is actually playing (playerStatus.playing)
    // 3. User is the recipient (not the sender)
    // 4. We haven't already marked it as read
    // 5. Audio is ready
    if (
      currentUri === uri &&
      playerStatus.playing &&
      currentUserUid !== senderUid &&
      !hasMarkedAsRead.current &&
      isReady &&
      file
    ) {
      console.log("🎵 Audio playing - marking as read:", messageId);
      handlePlayStart();
    }
  }, [playerStatus.playing, currentUri, uri, currentUserUid, senderUid, isReady, file, messageId]);

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
          audioPlayer.pause();
          audioPlayer.seekTo(0);
          setPosition(0); // Reset position state immediately
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
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false, // We're playing, not recording
        });
      } catch (error) {
        console.error("Error setting audio mode for playback:", error);
      }
    }
    
    // Set audio volume based on speaker mode
    setAudioVolume(audioPlayer, speakerMode);

    // If this is not the current playing audio, switch to it
    if (currentUri !== uri) {
      setCurrentUri(uri);
      // Reset the marked as read flag when switching to a different message
      hasMarkedAsRead.current = false;
      // Stop autoplay when user manually interacts with playback
      // This prevents autoplay from interfering with manual playback
      if (stopAutoplay) {
        stopAutoplay();
      }
      // If audio is already loaded and ready, play immediately
      if (isReady && file) {
        // Small delay to ensure player is ready (especially on iOS)
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          audioPlayer.play();
        } catch (error) {
          console.error("Error playing audio when switching:", error);
        }
        // Note: Marking as read is now handled by the useEffect that watches playerStatus.playing
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
        try {
          // Check if we're at or near the end - if so, seek to beginning first
          const currentTime = playerStatus.currentTime || 0;
          const duration = playerStatus.duration || 0;
          const positionMs = position || 0;
          const durationMs = duration * 1000 || 0;
          
          // Check both playerStatus and our tracked position state
          const isAtEndByTime = duration > 0 && currentTime >= duration - 0.1;
          const isAtEndByPosition = durationMs > 0 && positionMs >= durationMs - 100;
          const isAtEnd = isAtEndByTime || isAtEndByPosition;
          
          if (isAtEnd) {
            // Seek to beginning before playing
            console.log("🔄 Resetting playback position to beginning before replay");
            audioPlayer.seekTo(0);
            setPosition(0); // Also reset our position state
            // Small delay to ensure seek completes before playing
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          audioPlayer.play();
          // Note: Marking as read is now handled by the useEffect that watches playerStatus.playing
        } catch (error) {
          console.error("Error playing audio:", error);
        }
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


  return (
    <View style={[styles.wrapper, isIncoming ? styles.wrapperIncoming : styles.wrapperOutgoing]}>
      {isIncoming && profilePicture && (
        <Image
          style={styles.avatar}
          source={{ uri: profilePicture }}
        />
      )}
      <View style={styles.container}>
        <RecordingPlayerHeader
          showReadStatus={showReadStatus}
          displayIsRead={displayIsRead}
          onToggleReadStatus={toggleReadStatus}
          timestamp={timestamp}
          duration={duration}
          styles={styles}
        />
        <RecordingPlayerControls
          isPlaying={isPlaying}
          isLoading={isLoading}
          isReady={isReady}
          duration={duration}
          position={position}
          onPausePlay={pausePlay}
          onSeek={(value) => {
            setPosition(value);
            audioPlayer.seekTo(value / 1000);
          }}
          styles={styles}
        />
        {isPlaying && <PlayingIndicator styles={styles} />}
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

