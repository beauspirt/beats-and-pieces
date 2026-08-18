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

// 12ms micro-fade de-click constant (standard DAW / Web Audio anti-aliasing crossfade)
const DECLICK_FADE_DURATION = 0.012;

// Maximum number of uncompressed AudioBuffers kept in browser memory (prevents mobile OOM)
const MAX_CACHED_BUFFERS = 4;

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(45);
  const [activeTrackTitle, setActiveTrackTitle] = useState<string | null>(null);

  // Web Audio API and fallback references
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const activeGainNodeRef = useRef<GainNode | null>(null);
  const startContextTimeRef = useRef<number>(0);
  const startTrackOffsetRef = useRef<number>(0);
  const currentBufferRef = useRef<AudioBuffer | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Fallback HTML5 Audio element
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

  // LRU Buffer Cache helpers (keeps memory footprint under ~150MB)
  const getCachedBuffer = useCallback((url: string): AudioBuffer | null => {
    const cache = audioBufferCacheRef.current;
    if (!cache.has(url)) return null;
    const buf = cache.get(url)!;
    cache.delete(url);
    cache.set(url, buf);
    return buf;
  }, []);

  const setCachedBuffer = useCallback((url: string, buffer: AudioBuffer) => {
    const cache = audioBufferCacheRef.current;
    if (cache.has(url)) {
      cache.delete(url);
    } else if (cache.size >= MAX_CACHED_BUFFERS) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
    cache.set(url, buffer);
  }, []);

  // Stop playback when moving to a different page
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      pauseTrack();
      setCurrentTrackId(null);
      setCurrentTime(0);
      setDuration(45);
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
      if (activeGainNodeRef.current) {
        try {
          activeGainNodeRef.current.disconnect();
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

  // De-click stop helper: fades out previous audio in 12ms to eliminate DC clicks and pops
  const stopActiveSourceWithDeclick = useCallback(() => {
    const ctx = audioContextRef.current;
    const prevSource = activeSourceNodeRef.current;
    const prevGain = activeGainNodeRef.current;

    if (ctx && prevGain && prevSource) {
      try {
        const now = ctx.currentTime;
        prevGain.gain.cancelScheduledValues(now);
        prevGain.gain.setValueAtTime(prevGain.gain.value, now);
        prevGain.gain.linearRampToValueAtTime(0.0001, now + DECLICK_FADE_DURATION);
        prevSource.stop(now + DECLICK_FADE_DURATION);
      } catch {
        try {
          prevSource.stop();
        } catch {
          // ignore
        }
      }

      const sourceToClean = prevSource;
      const gainToClean = prevGain;
      setTimeout(() => {
        try {
          sourceToClean.disconnect();
          gainToClean.disconnect();
        } catch {
          // ignore
        }
      }, (DECLICK_FADE_DURATION + 0.04) * 1000);
    } else if (prevSource) {
      try {
        prevSource.stop();
        prevSource.disconnect();
      } catch {
        // ignore
      }
    }

    activeSourceNodeRef.current = null;
    activeGainNodeRef.current = null;
  }, []);

  const pauseTrack = useCallback(() => {
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    stopActiveSourceWithDeclick();

    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
    }

    setIsPlaying(false);
  }, [stopActiveSourceWithDeclick]);

  const startBufferPlayback = useCallback((
    buffer: AudioBuffer,
    offsetSeconds: number
  ) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Smoothly fade out any existing playback without clicks
    stopActiveSourceWithDeclick();

    const safeOffset = Math.max(0, Math.min(buffer.duration - 0.05, offsetSeconds));
    const now = ctx.currentTime;

    // Create new source and gain nodes with 12ms micro-fadein envelope
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(1, now + DECLICK_FADE_DURATION);
    gainNode.connect(ctx.destination);

    sourceNode.connect(gainNode);

    sourceNode.onended = () => {
      if (activeSourceNodeRef.current === sourceNode) {
        setIsPlaying(false);
      }
    };

    activeSourceNodeRef.current = sourceNode;
    activeGainNodeRef.current = gainNode;
    currentBufferRef.current = buffer;
    setDuration(buffer.duration);
    setCurrentTime(safeOffset);

    startContextTimeRef.current = now;
    startTrackOffsetRef.current = safeOffset;

    sourceNode.start(now, safeOffset);
    setIsPlaying(true);
    startTimeLoop();
  }, [getAudioContext, startTimeLoop, stopActiveSourceWithDeclick]);

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

    // Check if AudioBuffer is already in LRU cache
    const cachedBuffer = getCachedBuffer(resolvedUrl);
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

        setCachedBuffer(resolvedUrl, decodedBuffer);

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

  }, [currentTrackId, getAudioContext, isPlaying, currentTime, pauseTrack, startBufferPlayback, startTimeLoop, getCachedBuffer, setCachedBuffer]);

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
