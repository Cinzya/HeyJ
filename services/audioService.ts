import { Platform } from "react-native";
import { documentDirectory, createDownloadResumable } from "expo-file-system/legacy";
import { setAudioModeAsync } from "expo-audio";
import UUID from "react-native-uuid";
import { AudioPlayer } from "../types/audio";

/**
 * Loads an audio file from a URI and returns the local file path
 * @param uri - The remote URI of the audio file
 * @param fileName - Optional custom file name (defaults to UUID)
 * @returns The local file URI, or null if loading failed
 */
export const loadAudioFile = async (
  uri: string,
  fileName?: string
): Promise<string | null> => {
  try {
    const docDir = documentDirectory;
    if (!docDir) {
      console.error("Error loading audio: Document directory is undefined");
      return null;
    }

    const filePath = docDir + (fileName || `${UUID.v4()}.mp4`);
    console.log("📥 Loading audio from:", uri);

    const downloadResumable = createDownloadResumable(uri, filePath, { cache: true });
    const newFile = await downloadResumable.downloadAsync();

    if (newFile) {
      console.log("✅ Audio file downloaded:", newFile.uri);
      return newFile.uri;
    } else {
      console.error("Error loading audio: File is undefined");
      return null;
    }
  } catch (error) {
    console.error("Error loading audio:", error);
    return null;
  }
};

/**
 * Loads and plays audio from a URI using the provided audio player
 * @param uri - The remote URI of the audio file
 * @param audioPlayer - The audio player instance to use
 * @param conversationId - Optional conversation ID to track
 * @param onConversationPlaying - Optional callback to set currently playing conversation
 * @returns Promise that resolves when audio is loaded and playing
 */
export const playAudioFromUri = async (
  uri: string,
  audioPlayer: AudioPlayer,
  conversationId?: string,
  onConversationPlaying?: (conversationId: string) => void
): Promise<void> => {
  try {
    const docDir = documentDirectory;
    if (!docDir) {
      console.error("Error playing audio: Document directory is undefined");
      return;
    }

    if (!audioPlayer) {
      console.error("Error playing audio: Audio player not available");
      return;
    }

    // Configure audio session for playback (especially important on iOS)
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

    const downloadResumable = createDownloadResumable(
      uri,
      docDir + "notification.mp4",
      {}
    );

    const newFile = await downloadResumable.downloadAsync();
    if (newFile) {
      audioPlayer.replace(newFile.uri);
      audioPlayer.play();
      if (conversationId && onConversationPlaying) {
        onConversationPlaying(conversationId);
      }
    }
  } catch (error) {
    console.error("Error playing audio from URI:", error);
  }
};

