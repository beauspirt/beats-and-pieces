"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [activeTrackTitle, setActiveTrackTitle] = useState<string | null>(null);

  // Web Audio API and fallback HTML5 audio references
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startContextTimeRef = useRef<number>(0);
  const startTrackOffsetRef = useRef<number>(0);
  const currentBufferRef = useRef<AudioBuffer | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Fallback HTML5 Audio element for legacy environments
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Stop playback when moving to a different page
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      pauseTrack();
      setCurrentTrackId(null);
      setCurrentTime(0);
      setDuration(30);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (activeSourceNodeRef.current) {
        try {
          activeSourceNodeRef.current.stop();
          activeSourceNodeRef.current.disconnect();
        } catch {
          // ignore
        }
      }
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
        fallbackAudioRef.current.src = "";
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Continuous high-precision time update loop
  const startTimeLoop = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    const update = () => {
      const ctx = audioContextRef.current;
      const buf = currentBufferRef.current;

      if (ctx && buf) {
        const elapsed = ctx.currentTime - startContextTimeRef.current;
        const currentPos = startTrackOffsetRef.current + elapsed;

        if (currentPos >= buf.duration) {
          setCurrentTime(buf.duration);
          setIsPlaying(false);
          if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
          return;
        } else {
          setCurrentTime(Math.max(0, currentPos));
          animFrameIdRef.current = requestAnimationFrame(update);
        }
      } else if (fallbackAudioRef.current && !fallbackAudioRef.current.paused) {
        setCurrentTime(fallbackAudioRef.current.currentTime);
        if (fallbackAudioRef.current.duration && isFinite(fallbackAudioRef.current.duration)) {
          setDuration(fallbackAudioRef.current.duration);
        }
        animFrameIdRef.current = requestAnimationFrame(update);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(update);
  }, []);

  const pauseTrack = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);

    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      activeSourceNodeRef.current = null;
    }

    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
    }

    setIsPlaying(false);
  }, []);

  const startBufferPlayback = useCallback((
    buffer: AudioBuffer,
    offsetSeconds: number
  ) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Stop existing source node
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      activeSourceNodeRef.current = null;
    }

    const safeOffset = Math.max(0, Math.min(buffer.duration - 0.05, offsetSeconds));
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(ctx.destination);

    sourceNode.onended = () => {
      if (activeSourceNodeRef.current === sourceNode) {
        setIsPlaying(false);
      }
    };

    activeSourceNodeRef.current = sourceNode;
    currentBufferRef.current = buffer;
    setDuration(buffer.duration);
    setCurrentTime(safeOffset);

    startContextTimeRef.current = ctx.currentTime;
    startTrackOffsetRef.current = safeOffset;

    sourceNode.start(0, safeOffset);
    setIsPlaying(true);
    startTimeLoop();
  }, [getAudioContext, startTimeLoop]);

  const seekTrack = useCallback((progress: number) => {
    if (typeof progress !== "number" || isNaN(progress) || !isFinite(progress)) return;
    const targetProgress = Math.max(0, Math.min(1, progress));

    const buf = currentBufferRef.current;
    if (buf) {
      const targetTime = targetProgress * buf.duration;
      startBufferPlayback(buf, targetTime);
    } else if (fallbackAudioRef.current) {
      const dur = isFinite(fallbackAudioRef.current.duration) ? fallbackAudioRef.current.duration : duration;
      const targetTime = targetProgress * dur;
      fallbackAudioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  }, [duration, startBufferPlayback]);

  const playTrack = useCallback(async (
    id: string,
    title?: string,
    bpm = 90,
    audioUrl?: string,
    startProgress?: number
  ) => {
    const ctx = getAudioContext();
    const sourceUrl = audioUrl || `/audio/01 Ortega - Bonita Applebong.wav`;
    const resolvedUrl = encodeURI(sourceUrl);

    const initialProgress = (typeof startProgress === "number" && !isNaN(startProgress) && isFinite(startProgress))
      ? Math.max(0, Math.min(1, startProgress))
      : 0;

    // 1. If clicking the currently active track
    if (currentTrackId === id && currentBufferRef.current) {
      if (startProgress !== undefined) {
        const targetTime = initialProgress * currentBufferRef.current.duration;
        startBufferPlayback(currentBufferRef.current, targetTime);
      } else {
        if (isPlaying) {
          pauseTrack();
        } else {
          startBufferPlayback(currentBufferRef.current, currentTime);
        }
      }
      return;
    }

    // 2. Switching to a new track: Instantly stop previous track & reset progress
    pauseTrack();
    setCurrentTrackId(id);
    setActiveTrackTitle(title || `Beat #${id}`);
    currentUrlRef.current = resolvedUrl;
    
    // Instantly reset time so previous track progress never flashes on new track
    setCurrentTime(0);
    setDuration(45);

    // Check if AudioBuffer is already in cache
    const cachedBuffer = audioBufferCacheRef.current.get(resolvedUrl);
    if (cachedBuffer) {
      currentBufferRef.current = cachedBuffer;
      const targetTime = initialProgress * cachedBuffer.duration;
      startBufferPlayback(cachedBuffer, targetTime);
      return;
    }

    // Fetch and decode via Web Audio API
    try {
      if (ctx) {
        const response = await fetch(resolvedUrl);
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        audioBufferCacheRef.current.set(resolvedUrl, decodedBuffer);

        // Verify this is still the active requested track
        if (currentUrlRef.current === resolvedUrl) {
          currentBufferRef.current = decodedBuffer;
          const targetTime = initialProgress * decodedBuffer.duration;
          startBufferPlayback(decodedBuffer, targetTime);
        }
        return;
      }
    } catch (err) {
      console.warn("Web Audio fetch/decode failed, using HTML5 Audio fallback:", err);
    }

    // Fallback to HTML5 audio element if Web Audio API decode is unavailable
    if (!fallbackAudioRef.current) {
      fallbackAudioRef.current = new Audio();
    }
    const audio = fallbackAudioRef.current;
    audio.src = resolvedUrl;

    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
        if (initialProgress > 0) {
          audio.currentTime = initialProgress * audio.duration;
        }
      }
    };

    audio.play().then(() => {
      setIsPlaying(true);
      startTimeLoop();
    }).catch(console.error);

  }, [currentTrackId, getAudioContext, isPlaying, currentTime, pauseTrack, startBufferPlayback, startTimeLoop]);

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
