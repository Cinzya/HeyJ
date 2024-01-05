import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
// @ts-expect-error
import { Entypo } from "react-native-vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import UUID from "react-native-uuid";

const RecordingPlayer = ({
  uri,
  currentUri,
  setCurrentUri,
}: {
  uri: string;
  currentUri: string;
  setCurrentUri: any;
}) => {
  const [file, setFile] = useState<
    FileSystem.FileSystemDownloadResult | undefined
  >(undefined);
  const sound = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(0);
  const [filePosition, setFilePosition] = useState(0);
  const [position, setPosition] = useState(0);

  const loadAudio = async () => {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        uri,
        FileSystem.documentDirectory + `${UUID.v4()} small.mp4`,
        { cache: true }
      );

      Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const newFile = await downloadResumable.downloadAsync();

      if (newFile) {
        setFile(newFile);
        const { sound: newSound } = await Audio.Sound.createAsync(
          {
            uri: newFile!.uri,
          },
          { shouldPlay: true }
        );
        sound.current = newSound;
        await sound.current.setProgressUpdateIntervalAsync(10);
        sound.current.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis!);
            setFilePosition(status.positionMillis);
            setPosition(status.positionMillis);

            if (status.didJustFinish) {
              setPosition(0);
              setPlaying(false);
              sound.current?.pauseAsync().catch(() => {});
            }
          }
        });
      } else {
        console.error("Error loading audio: File is undefined");
      }
    } catch (error) {
      console.error("Error loading audio:", error);
    }
  };

  const unloadAudio = async () => {
    setFile(undefined);
    await sound.current?.unloadAsync();
    setPosition(0);
    setFilePosition(0);
    setPlaying(false);
  };

  useEffect(() => {
    if (currentUri === uri) {
      loadAudio();
    } else {
      unloadAudio();
    }
  }, [currentUri]);

  const updatePosition = async () => {
    if (currentUri !== uri) {
      return;
    }

    if (position !== filePosition) {
      await sound.current?.setPositionAsync(position).catch(() => {});
    }
  };

  useEffect(() => {
    updatePosition();
  }, [position]);

  const pausePlay = async () => {
    if (currentUri !== uri) {
      setCurrentUri(uri);
    }

    setPlaying(!playing);
    if (sound.current) {
      if (playing) {
        await sound.current.pauseAsync();
      } else {
        await sound.current.playAsync().catch((e) => console.log(e));
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.playContainer}>
        <TouchableOpacity onPress={pausePlay} style={styles.button}>
          <Entypo
            name={playing ? "controller-stop" : "controller-play"}
            size={25}
          />
        </TouchableOpacity>
        <Slider
          style={{ width: 200, height: 40 }}
          minimumValue={0}
          maximumValue={duration || 0}
          value={position}
          onValueChange={(value) => setPosition(value)}
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
