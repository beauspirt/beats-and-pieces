"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Play, Pause, Download } from "lucide-react";
import { useAudioPlayer } from "@/lib/audio-context";
import { formatTime } from "@/lib/utils";
import precomputedPeaksV2 from "@/lib/waveform-peaks-v2.json";

interface AudioWaveformPlayerProps {
  id: string;
  title?: string;
  audioUrl?: string;
  bpm?: number;
  duration?: number;
  downloadable?: boolean;
  showDownload?: boolean;
  compact?: boolean;
}

interface WaveformData {
  peaks: number[];
  body?: number[];
  duration?: number;
}

const globalWaveformCache = new Map<string, WaveformData>();

function extractRealAudioBufferWaveform(buffer: AudioBuffer, numSlices = 800): WaveformData {
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

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  id,
  title = "Beat Track",
  audioUrl,
  bpm = 90,
  duration = 45,
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
    seekTrack,
  } = useAudioPlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);
  const wasActiveOnDownRef = useRef(false);
  const hoverFractionRef = useRef<number | null>(null);

  const isThisTrackActive = currentTrackId === id;
  const isThisTrackPlaying = isThisTrackActive && isPlaying;

  const [waveformData, setWaveformData] = useState<WaveformData | null>(() => {
    if (audioUrl && globalWaveformCache.has(audioUrl)) {
      return globalWaveformCache.get(audioUrl)!;
    }
    return null;
  });

  // Decode real AudioBuffer in background to extract exact audio waveform
  useEffect(() => {
    if (!audioUrl || typeof window === "undefined") return;
    if (globalWaveformCache.has(audioUrl)) {
      setWaveformData(globalWaveformCache.get(audioUrl)!);
      return;
    }

    let isMounted = true;
    const resolvedUrl = audioUrl
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

    for (const [file, data] of Object.entries(precomputedPeaksV2)) {
      if (
        (title && file.toLowerCase().includes(title.toLowerCase())) ||
        (id && file.toLowerCase().includes(id.toLowerCase()))
      ) {
        return data as WaveformData;
      }
    }

    // No placeholder dummy waveforms! Return empty peaks until real audio is ready.
    return { peaks: [], duration: duration || 60 };
  }, [waveformData, audioUrl, title, id, duration]);

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

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const { peaks } = getWaveformData();
    if (!peaks || peaks.length === 0) {
      ctx.restore();
      return;
    }

    const totalSlices = peaks.length;
    const progress = isThisTrackActive ? playbackProgress : 0;
    
    // Only show hover needle and brighter preview on ACTIVE tracks
    const hoverFraction = isThisTrackActive ? hoverFractionRef.current : null;

    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    const centerY = Math.floor(height / 2);
    const maxAmplitude = Math.floor(height * 0.46);

    const isLight = typeof document !== "undefined" && document.documentElement.classList.contains("light");

    // Single-Pass Solid Uniform Width Waveform (Pure crisp solid colors)
    for (let x = 0; x < width; x++) {
      const sliceIdx = Math.min(totalSlices - 1, Math.floor((x / Math.max(1, width - 1)) * (totalSlices - 1)));
      const peakVal = peaks[sliceIdx] || 10;
      const peakHeight = Math.max(1, Math.round((peakVal / 100) * maxAmplitude));
      const y = centerY - peakHeight;
      const barHeight = peakHeight * 2;

      const progressFraction = x / Math.max(1, width - 1);
      const isPlayed = progressFraction <= progress;
      const isHovered = hoverFraction !== null && progressFraction <= hoverFraction;

      if (isLight) {
        ctx.fillStyle = isPlayed ? "#7B61FF" : isHovered ? "#9CA3AF" : "#D4D4D8";
      } else {
        ctx.fillStyle = isPlayed ? "#FFFFFF" : isHovered ? "#4A4A4A" : "#262626";
      }

      ctx.fillRect(x, y, 1, barHeight);
    }

    // Playhead Needle Line (Active Track)
    if (isThisTrackActive && progress > 0 && progress < 1) {
      const playheadX = Math.round(progress * rect.width);
      ctx.fillStyle = isLight ? "#7B61FF" : "#FFFFFF";
      ctx.fillRect(playheadX, 0, 1.5, rect.height);
    }

    // Hover Needle
    if (hoverFraction !== null) {
      const needleX = Math.round(hoverFraction * rect.width);
      ctx.fillStyle = isLight ? "rgba(123, 97, 255, 0.8)" : "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(needleX, 0, 1, rect.height);
    }

    ctx.restore();
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

  // Redraw when progress changes
  useEffect(() => {
    renderWaveform();
  }, [renderWaveform, playbackProgress]);

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

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisTrackPlaying) {
      pauseTrack();
    } else {
      playTrack(id, title, bpm, audioUrl);
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
    e.preventDefault();
    e.stopPropagation();
    isPointerDownRef.current = true;
    wasActiveOnDownRef.current = isThisTrackActive;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const p = getProgressFromPointer(e);
    hoverFractionRef.current = p;

    if (!isThisTrackActive) {
      // Initial click on inactive track: ALWAYS start from 0:00
      playTrack(id, title, bpm, audioUrl, 0);
    } else {
      // Already active track: seek directly to clicked position
      seekTrack(p);
    }
    renderWaveform();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

  // Determine accurate duration to display
  const effectiveDuration = waveformData?.duration || (getWaveformData().duration) || duration || 60;
  const displayDuration = isThisTrackActive && contextDuration > 0
    ? contextDuration
    : effectiveDuration;

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
          compact ? "w-9 h-9" : "w-11 h-11"
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
      <div className={`flex-1 relative overflow-hidden bg-transparent ${compact ? "h-14" : "h-18"}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="w-full h-full cursor-pointer touch-none select-none block"
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/* Bottom Right Corner Timecode (Zero Layout Shift) */}
        <div className="absolute bottom-1 right-1 flex items-center gap-2 pointer-events-none select-none">
          <span className="text-[11px] font-mono tabular-nums text-[#777777] px-1.5 py-0.5">
            {isThisTrackActive ? (
              <>
                <span className="text-white font-bold">{formatTime(currentTime)}</span>
                <span className="text-[#555555]"> / </span>
                <span>{formatTime(displayDuration)}</span>
              </>
            ) : (
              <span>{formatTime(displayDuration)}</span>
            )}
          </span>
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
