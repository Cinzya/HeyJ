// Audio player types based on expo-audio
// Using any for now as expo-audio types may not be fully exported
// In a production app, you would import the actual types from expo-audio
export type AudioPlayer = any; // ReturnType<typeof import("expo-audio").useAudioPlayer>
export type AudioPlayerStatus = any; // ReturnType<typeof import("expo-audio").useAudioPlayerStatus>

