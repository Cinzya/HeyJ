import React, { createContext, useContext, useState } from "react";

interface AudioSettingsContextType {
  speakerMode: boolean;
  setSpeakerMode: (enabled: boolean) => void;
  toggleSpeakerMode: () => void;
  autoplay: boolean;
  setAutoplay: (enabled: boolean) => void;
  toggleAutoplay: () => void;
}

const AudioSettingsContext = createContext<AudioSettingsContextType | null>(null);

export const AudioSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [speakerMode, setSpeakerMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  const toggleSpeakerMode = () => {
    setSpeakerMode((prev) => !prev);
  };

  const toggleAutoplay = () => {
    setAutoplay((prev) => !prev);
  };

  return (
    <AudioSettingsContext.Provider
      value={{
        speakerMode,
        setSpeakerMode,
        toggleSpeakerMode,
        autoplay,
        setAutoplay,
        toggleAutoplay,
      }}
    >
      {children}
    </AudioSettingsContext.Provider>
  );
};

export const useAudioSettings = () => {
  const context = useContext(AudioSettingsContext);
  if (!context) {
    throw new Error("useAudioSettings must be used within an AudioSettingsProvider");
  }
  return context;
};

