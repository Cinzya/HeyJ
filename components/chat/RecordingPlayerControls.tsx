import { View, Text, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
import { Entypo } from "@expo/vector-icons";

interface RecordingPlayerControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  duration: number | null;
  position: number;
  onPausePlay: () => void;
  onSeek: (value: number) => void;
  styles: any;
}

const RecordingPlayerControls = ({
  isPlaying,
  isLoading,
  isReady,
  duration,
  position,
  onPausePlay,
  onSeek,
  styles,
}: RecordingPlayerControlsProps) => {
  const showLoading = isLoading;

  return (
    <View style={styles.playContainer}>
      <TouchableOpacity
        onPress={onPausePlay}
        style={[styles.button, isPlaying && styles.buttonActive]}
        disabled={isLoading || !isReady}
        activeOpacity={0.7}
      >
        <Entypo
          name={isPlaying ? "controller-paus" : "controller-play"}
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
            onSeek(value);
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
  );
};

export default RecordingPlayerControls;
