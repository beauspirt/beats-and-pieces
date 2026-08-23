"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Play, Pause, Download } from "lucide-react";
import { useAudioPlayer } from "@/lib/audio-context";
import { formatTime } from "@/lib/utils";
import precomputedPeaksV2 from "@/lib/waveform-peaks-v2.json";

export interface WaveformData {
  peaks: number[];
  body?: number[];
  duration?: number;
}

export const globalWaveformCache = new Map<string, WaveformData>();

export function extractRealAudioBufferWaveform(buffer: AudioBuffer, numSlices = 800): WaveformData {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const samplesPerSlice = Math.floor(totalSamples / numSlices);
  const rawPeaks: number[] = [];
  let globalMax = 0.0001;

  for (let i = 0; i < numSlices; i++) {
    const start = i * samplesPerSlice;
    const end = Math.min(start + samplesPerSlice, totalSamples);
    let peak = 0;

    for (let s = start; s < end; s++) {
      const val = Math.abs(channelData[s]);
      if (val > peak) peak = val;
    }

    if (peak > globalMax) globalMax = peak;
    rawPeaks.push(peak);
  }

  const peaks = rawPeaks.map((p) => Math.min(98, Math.max(3, Math.round((p / globalMax) * 95 + 3))));

  return { peaks, duration: Math.round(buffer.duration) };
}

export function generateProceduralPeaks(seedStr: string, count = 200): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const peaks: number[] = [];
  let prev = 45;
  for (let i = 0; i < count; i++) {
    const pseudoRand = Math.abs(Math.sin(hash + i * 1.37) * 10000) % 1;
    const target = 18 + pseudoRand * 72;
    prev = prev * 0.35 + target * 0.65;
    peaks.push(Math.round(Math.min(95, Math.max(8, prev))));
  }
  return peaks;
}

export interface AudioWaveformPlayerProps {
  id: string;
  title?: string;
  artist?: string;
  artistId?: string;
  coverUrl?: string;
  audioUrl?: string;
  bpm?: number;
  duration?: number;
  waveformPeaks?: number[];
  downloadable?: boolean;
  showDownload?: boolean;
  compact?: boolean;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  id,
  title = "Beat Track",
  artist,
  artistId,
  coverUrl,
  audioUrl,
  bpm = 90,
  duration = 45,
  waveformPeaks,
  showDownload = false,
  compact = false,
}) => {
  const {
    currentTrackId,
    isPlaying,
    currentTime,
    duration: contextDuration,
    playbackProgress,
    playTrack,
    pauseTrack,
    togglePlay,
    seekTrack,
  } = useAudioPlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);
  const wasActiveOnDownRef = useRef(false);
  const hoverFractionRef = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number; isScrolling: boolean } | null>(null);

  const isThisTrackActive = currentTrackId === id;
  const isThisTrackPlaying = isThisTrackActive && isPlaying;

  const [waveformData, setWaveformData] = useState<WaveformData | null>(() => {
    if (waveformPeaks && waveformPeaks.length > 0) {
      return { peaks: waveformPeaks, duration };
    }
    if (audioUrl && globalWaveformCache.has(audioUrl)) {
      return globalWaveformCache.get(audioUrl)!;
    }
    return null;
  });

  useEffect(() => {
    if (waveformPeaks && waveformPeaks.length > 0) {
      setWaveformData({ peaks: waveformPeaks, duration });
    }
  }, [waveformPeaks, duration]);

  // Decode real AudioBuffer only for custom newly uploaded tracks not in precomputed dictionary
  useEffect(() => {
    if (!audioUrl || typeof window === "undefined") return;
    if (globalWaveformCache.has(audioUrl)) {
      setWaveformData(globalWaveformCache.get(audioUrl)!);
      return;
    }

    const dict = precomputedPeaksV2 as Record<string, WaveformData>;
    const decodedUrl = decodeURIComponent(audioUrl);
    const filename = decodedUrl.split("/").pop() || "";
    if (dict[audioUrl] || dict[decodedUrl] || dict[filename]) {
      // Already has authoritative precomputed peaks - skip redundant decoding
      return;
    }

    let isMounted = true;
    const resolvedUrl =
      audioUrl.startsWith("http://") || audioUrl.startsWith("https://") || audioUrl.startsWith("blob:")
        ? audioUrl
        : audioUrl
            .split("/")
            .map((seg) => (seg ? encodeURIComponent(decodeURIComponent(seg)) : ""))
            .join("/");

    fetch(resolvedUrl)
      .then((res) => res.arrayBuffer())
      .then((arrayBuf) => {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        return ctx.decodeAudioData(arrayBuf).then((decodedBuf) => {
          ctx.close();
          const extracted = extractRealAudioBufferWaveform(decodedBuf, 800);
          globalWaveformCache.set(audioUrl, extracted);
          globalWaveformCache.set(resolvedUrl, extracted);
          if (isMounted) {
            setWaveformData(extracted);
          }
        });
      })
      .catch(() => {
        // ignore network error
      });

    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  // Retrieve high-definition waveform peaks
  const getWaveformData = useCallback((): WaveformData => {
    if (waveformData && waveformData.peaks.length > 0) {
      return waveformData;
    }

    const dict = precomputedPeaksV2 as Record<string, WaveformData>;
    if (audioUrl) {
      if (dict[audioUrl]) return dict[audioUrl];
      const decodedUrl = decodeURIComponent(audioUrl);
      if (dict[decodedUrl]) return dict[decodedUrl];
      const filename = decodedUrl.split("/").pop() || "";
      if (dict[filename]) return dict[filename];
      const rawFilename = audioUrl.split("/").pop() || "";
      if (dict[rawFilename]) return dict[rawFilename];
    }

    // Do not return placeholder procedural peaks to avoid jumping/flashing
    return { peaks: [], duration: duration || 60 };
  }, [waveformData, audioUrl, duration]);

  // Render Clean Continuous Single-Shade Waveform (Transparent Container Background)
  const renderWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.clearRect(0, 0, pixelWidth, pixelHeight);

    const isLight = typeof document !== "undefined" && document.documentElement.classList.contains("light");
    const centerY = Math.floor(pixelHeight / 2);
    const maxAmplitude = Math.floor(pixelHeight * 0.46);

    const { peaks } = getWaveformData();
    if (!peaks || peaks.length === 0) {
      // Draw subtle flat baseline while waiting for real waveform to decode
      ctx.fillStyle = isLight ? "#d1d5db" : "#242424";
      ctx.fillRect(0, centerY - Math.max(1, Math.round(dpr)), pixelWidth, Math.max(2, Math.round(2 * dpr)));
      return;
    }

    const totalSlices = peaks.length;
    const progress = isThisTrackActive ? playbackProgress : 0;
    
    // Only show hover needle and brighter preview on ACTIVE tracks
    const hoverFraction = isThisTrackActive ? hoverFractionRef.current : null;

    // Single-Pass Solid Physical Device Pixel Rendering
    // Every physical pixel column in [0..pixelWidth-1] is drawn at exact integer bounds with 100% solid opacity
    for (let px = 0; px < pixelWidth; px++) {
      const sliceIdx = Math.min(totalSlices - 1, Math.floor((px / Math.max(1, pixelWidth - 1)) * (totalSlices - 1)));
      const peakVal = peaks[sliceIdx] || 10;
      const peakHeight = Math.max(1, Math.round((peakVal / 100) * maxAmplitude));
      const py = centerY - peakHeight;
      const barHeight = peakHeight * 2;

      const progressFraction = px / Math.max(1, pixelWidth - 1);
      const isPlayed = progressFraction <= progress;
      const isHovered = hoverFraction !== null && progressFraction <= hoverFraction;

      if (isLight) {
        ctx.fillStyle = isPlayed ? "#7B61FF" : isHovered ? "#9CA3AF" : "#D4D4D8";
      } else {
        ctx.fillStyle = isPlayed ? "#FFFFFF" : isHovered ? "#4A4A4A" : "#262626";
      }

      ctx.fillRect(px, py, 1, barHeight);
    }

    // Playhead Needle Line (Active Track)
    if (isThisTrackActive && progress > 0 && progress < 1) {
      const playheadX = Math.round(progress * pixelWidth);
      ctx.fillStyle = isLight ? "#7B61FF" : "#FFFFFF";
      ctx.fillRect(playheadX, 0, Math.max(1, Math.round(1.5 * dpr)), pixelHeight);
    }

    // Hover Needle
    if (hoverFraction !== null) {
      const needleX = Math.round(hoverFraction * pixelWidth);
      ctx.fillStyle = isLight ? "rgba(123, 97, 255, 0.8)" : "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(needleX, 0, Math.max(1, Math.round(1 * dpr)), pixelHeight);
    }
  }, [getWaveformData, isThisTrackActive, playbackProgress]);

  // Animation frame loop for continuous 60fps playback
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderWaveform();
      if (isThisTrackPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };
    loop();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isThisTrackPlaying, renderWaveform]);

  // Redraw when progress or waveformData changes
  useEffect(() => {
    renderWaveform();
  }, [renderWaveform, playbackProgress, waveformData]);

  // Observe theme class changes on html element
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      renderWaveform();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [renderWaveform]);

  // ResizeObserver for clean responsive layout adjustments
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      renderWaveform();
    });
    observer.observe(container);
    if (canvas) observer.observe(canvas);

    renderWaveform();
    const timer = setTimeout(() => renderWaveform(), 50);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [renderWaveform]);

  // Determine accurate duration to display
  const effectiveDuration = waveformData?.duration || (getWaveformData().duration) || duration || 60;
  const displayDuration = isThisTrackActive && contextDuration > 0
    ? contextDuration
    : effectiveDuration;

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisTrackPlaying) {
      pauseTrack();
    } else {
      if (isThisTrackActive) {
        togglePlay();
      } else {
        playTrack(id, title, bpm, audioUrl, 0, effectiveDuration, artist, artistId, coverUrl);
      }
    }
  };

  const getProgressFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    const x = e.clientX - rect.left;
    const raw = x / rect.width;
    if (isNaN(raw) || !isFinite(raw)) return 0;
    return Math.max(0, Math.min(1, raw));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = true;
    wasActiveOnDownRef.current = isThisTrackActive;

    if (e.pointerType === "touch") {
      // Record starting coordinates to distinguish between vertical scroll and intentional tap/scrub
      touchStartPos.current = { x: e.clientX, y: e.clientY, isScrolling: false };
      return;
    }

    // For mouse, immediately seek/play and capture pointer
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const p = getProgressFromPointer(e);
    hoverFractionRef.current = p;

    if (!isThisTrackActive) {
      playTrack(id, title, bpm, audioUrl, 0, effectiveDuration, artist, artistId, coverUrl);
    } else {
      seekTrack(p);
    }
    renderWaveform();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch" && touchStartPos.current) {
      const dx = Math.abs(e.clientX - touchStartPos.current.x);
      const dy = Math.abs(e.clientY - touchStartPos.current.y);

      // If user moved vertically more than 7px, they are scrolling the page!
      if (dy > 7 && !touchStartPos.current.isScrolling) {
        touchStartPos.current.isScrolling = true;
        isPointerDownRef.current = false;
        hoverFractionRef.current = null;
        renderWaveform();
        return;
      }

      // If scrolling, ignore horizontal moves
      if (touchStartPos.current.isScrolling) {
        return;
      }

      // If moved horizontally more than 10px while holding, start scrubbing
      if (dx > 10) {
        e.preventDefault();
        const p = getProgressFromPointer(e);
        hoverFractionRef.current = p;
        if (wasActiveOnDownRef.current && isThisTrackActive) {
          seekTrack(p);
        }
        renderWaveform();
        return;
      }
      return;
    }

    const p = getProgressFromPointer(e);
    hoverFractionRef.current = p;

    if (isPointerDownRef.current) {
      e.preventDefault();
      // Only scrub on drag if the track was already active when pointer went down
      if (wasActiveOnDownRef.current && isThisTrackActive) {
        seekTrack(p);
      }
    }
    renderWaveform();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch" && touchStartPos.current) {
      const wasScrolling = touchStartPos.current.isScrolling;
      const dy = Math.abs(e.clientY - touchStartPos.current.y);
      touchStartPos.current = null;
      isPointerDownRef.current = false;
      wasActiveOnDownRef.current = false;

      // If it was a scroll gesture, do nothing!
      if (wasScrolling || dy > 7) {
        hoverFractionRef.current = null;
        renderWaveform();
        return;
      }

      // Otherwise it was an intentional tap on the waveform: seek/play!
      const p = getProgressFromPointer(e);
      hoverFractionRef.current = p;
      if (!isThisTrackActive) {
        playTrack(id, title, bpm, audioUrl, p, effectiveDuration, artist, artistId, coverUrl);
      } else {
        seekTrack(p);
      }
      renderWaveform();
      return;
    }

    isPointerDownRef.current = false;
    wasActiveOnDownRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    // Keep hover needle right where cursor was released
    const p = getProgressFromPointer(e);
    hoverFractionRef.current = p;
    renderWaveform();
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) {
      hoverFractionRef.current = null;
      renderWaveform();
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioUrl) {
      const link = document.createElement("a");
      link.href = audioUrl;
      link.download = audioUrl.split("/").pop() || "sample.wav";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center gap-3.5 bg-transparent select-none p-0"
    >
      {/* Play / Pause Toggle Button */}
      <button
        onClick={handlePlayToggle}
        aria-label={isThisTrackPlaying ? "Pause" : "Play"}
        className={`shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
          compact ? "w-9 h-9 sm:w-10 sm:h-10 min-w-[36px] min-h-[36px]" : "w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px]"
        } ${
          isThisTrackPlaying
            ? "bg-white text-black shadow-white/10"
            : "bg-[#202020] text-white hover:bg-[#7B61FF] hover:text-white"
        }`}
      >
        {isThisTrackPlaying ? (
          <Pause className={compact ? "w-3.5 h-3.5 fill-current" : "w-4 h-4 fill-current"} />
        ) : (
          <Play className={compact ? "w-3.5 h-3.5 ml-0.5 fill-current" : "w-4 h-4 ml-0.5 fill-current"} />
        )}
      </button>

      {/* Waveform Visualizer on Pure Transparent Background (No background box / No layout shift) */}
      <div className={`flex-1 relative overflow-hidden bg-transparent ${compact ? "h-12 sm:h-14" : "h-14 sm:h-18"}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="w-full h-full cursor-pointer touch-pan-y select-none block"
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/* Bottom Right Corner Timecode Pillbox (Border-free, Inter font) */}
        <div className="absolute bottom-1 right-1 flex items-center pointer-events-none select-none z-10">
          <div className="px-2 py-0.5 rounded-md bg-[#141414]/90 backdrop-blur-sm shadow-sm flex items-center gap-1 text-[11px] font-sans tabular-nums">
            {isThisTrackActive ? (
              <>
                <span className="text-white font-bold">{formatTime(currentTime)}</span>
                <span className="text-[#666666]">/</span>
                <span className="text-[#9E9E9E]">{formatTime(displayDuration)}</span>
              </>
            ) : (
              <span className="text-[#888888] font-medium">{formatTime(displayDuration)}</span>
            )}
          </div>
        </div>

        {/* Optional Download Button in Top Right */}
        {showDownload && (
          <button
            onClick={handleDownload}
            aria-label="Download audio file"
            className="absolute top-1 right-1 p-1.5 rounded-lg bg-[#1C1C1C] text-[#888888] hover:text-white hover:bg-[#252525] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
