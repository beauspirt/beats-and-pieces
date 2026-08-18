"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

interface AudioContextType {
  currentTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackProgress: number; // 0 to 1
  playTrack: (
    id: string,
    title?: string,
    bpm?: number,
    audioUrl?: string,
    startProgress?: number
  ) => void;
  pauseTrack: () => void;
  seekTrack: (progress: number) => void;
  activeTrackTitle: string | null;
}

const AudioPlayerContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [activeTrackTitle, setActiveTrackTitle] = useState<string | null>(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      }
    };
  }, []);

  const playTrack = (
    id: string,
    title?: string,
    bpm = 90,
    audioUrl?: string,
    startProgress?: number
  ) => {
    // If clicking same playing track without seeking, toggle pause
    if (currentTrackId === id && isPlaying && startProgress === undefined) {
      pauseTrack();
      return;
    }

    // If resuming the same track already loaded
    if (currentTrackId === id && audioElementRef.current && audioElementRef.current.src) {
      if (startProgress !== undefined) {
        const dur = (audioElementRef.current.duration && !isNaN(audioElementRef.current.duration) && isFinite(audioElementRef.current.duration))
          ? audioElementRef.current.duration
          : duration;
        const targetTime = Math.max(0, Math.min(dur, startProgress * dur));
        try {
          audioElementRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
        } catch {
          // ignore
        }
      }
      if (!isPlaying) {
        audioElementRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    setCurrentTrackId(id);
    setActiveTrackTitle(title || `Beat #${id}`);

    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
    }

    const audio = audioElementRef.current;
    audio.pause();

    const sourceUrl = audioUrl || `/audio/01 Ortega - Bonita Applebong.wav`;
    currentAudioUrlRef.current = sourceUrl;
    audio.src = encodeURI(sourceUrl);

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        if (startProgress !== undefined) {
          audio.currentTime = startProgress * audio.duration;
          setCurrentTime(audio.currentTime);
        }
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.play().then(() => {
      setIsPlaying(true);
      if (startProgress !== undefined && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        audio.currentTime = startProgress * audio.duration;
      }
    }).catch((err) => {
      console.warn("Audio autoplay or playback note:", err);
      setIsPlaying(true);
    });
  };

  const pauseTrack = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
  };

  const seekTrack = (progress: number) => {
    const targetProgress = Math.max(0, Math.min(1, progress));
    if (audioElementRef.current) {
      const dur = (audioElementRef.current.duration && !isNaN(audioElementRef.current.duration) && isFinite(audioElementRef.current.duration))
        ? audioElementRef.current.duration
        : duration;
      const targetTime = targetProgress * dur;
      try {
        audioElementRef.current.currentTime = targetTime;
      } catch {
        // ignore
      }
      setCurrentTime(targetTime);
    } else {
      setCurrentTime(targetProgress * duration);
    }
  };

  const playbackProgress = duration > 0 ? currentTime / duration : 0;

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrackId,
        isPlaying,
        currentTime,
        duration,
        playbackProgress,
        playTrack,
        pauseTrack,
        seekTrack,
        activeTrackTitle,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within an AudioProvider");
  }
  return context;
};
