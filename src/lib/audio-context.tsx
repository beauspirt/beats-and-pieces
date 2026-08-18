"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

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
  const pendingSeekProgressRef = useRef<number | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      }
    };
  }, []);

  const seekTrack = useCallback((progress: number) => {
    if (typeof progress !== "number" || isNaN(progress) || !isFinite(progress)) return;
    const targetProgress = Math.max(0, Math.min(1, progress));

    const audio = audioElementRef.current;
    if (audio) {
      const dur = (typeof audio.duration === "number" && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0)
        ? audio.duration
        : duration;

      if (dur > 0) {
        const targetTime = targetProgress * dur;
        try {
          audio.currentTime = targetTime;
          setCurrentTime(targetTime);
        } catch (e) {
          console.warn("Could not seek audio immediately:", e);
        }
      }
    } else {
      setCurrentTime(targetProgress * duration);
    }
  }, [duration]);

  const playTrack = useCallback((
    id: string,
    title?: string,
    bpm = 90,
    audioUrl?: string,
    startProgress?: number
  ) => {
    const validStartProgress = (typeof startProgress === "number" && !isNaN(startProgress) && isFinite(startProgress))
      ? Math.max(0, Math.min(1, startProgress))
      : undefined;

    // 1. If clicking the exact same track that is ALREADY active
    if (currentTrackId === id && audioElementRef.current && audioElementRef.current.src) {
      if (validStartProgress !== undefined) {
        seekTrack(validStartProgress);
        if (!isPlaying) {
          audioElementRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      } else {
        // Toggle play/pause
        if (isPlaying) {
          pauseTrack();
        } else {
          audioElementRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      }
      return;
    }

    // 2. Switching to a new track or initial play
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

    if (validStartProgress !== undefined) {
      pendingSeekProgressRef.current = validStartProgress;
    } else {
      pendingSeekProgressRef.current = null;
    }

    const applyPendingSeek = () => {
      if (pendingSeekProgressRef.current !== null && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        const targetTime = pendingSeekProgressRef.current * audio.duration;
        try {
          audio.currentTime = targetTime;
          setCurrentTime(targetTime);
        } catch {
          // ignore
        }
        pendingSeekProgressRef.current = null;
      }
    };

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
        applyPendingSeek();
      }
    };

    audio.oncanplay = () => {
      applyPendingSeek();
    };

    audio.ontimeupdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
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
      applyPendingSeek();
    }).catch((err) => {
      console.warn("Audio play notice:", err);
      setIsPlaying(true);
    });
  }, [currentTrackId, isPlaying, seekTrack]);

  const pauseTrack = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

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
