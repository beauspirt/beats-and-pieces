"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Play, Pause, Download } from "lucide-react";
import { useAudioPlayer } from "@/lib/audio-context";
import { formatTime } from "@/lib/utils";
import precomputedPeaks from "@/lib/waveform-peaks.json";

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

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  id,
  title = "Beat Track",
  audioUrl,
  bpm = 90,
  duration = 32,
  showDownload = false,
  compact = false,
}) => {
  const {
    currentTrackId,
    isPlaying,
    currentTime,
    playbackProgress,
    playTrack,
    pauseTrack,
    seekTrack,
  } = useAudioPlayer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);
  const hoverFractionRef = useRef<number | null>(null);

  const isThisTrackActive = currentTrackId === id;
  const isThisTrackPlaying = isThisTrackActive && isPlaying;

  // Retrieve high-definition PCM waveform peaks
  const getPeaks = useCallback((): number[] => {
    if (audioUrl) {
      const filename = decodeURIComponent(audioUrl.split("/").pop() || "");
      const peaks = (precomputedPeaks as Record<string, number[]>)[filename];
      if (peaks && peaks.length > 0) return peaks;
    }

    for (const [file, peaks] of Object.entries(precomputedPeaks)) {
      if (
        file.toLowerCase().includes(title.toLowerCase()) ||
        file.toLowerCase().includes(id.toLowerCase())
      ) {
        return peaks as number[];
      }
    }

    // Fallback dynamic peaks with strong transient contrasts
    const fallback: number[] = [];
    let seed = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 999);
    for (let i = 0; i < 300; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      const env = i < 50 ? 0.3 + (i / 50) * 0.6 : i > 240 ? 0.9 - ((i - 240) / 60) * 0.6 : 0.95;
      const isBeat = i % 8 === 0 || i % 8 === 4;
      const amp = (rnd * 0.35 + (isBeat ? 0.65 : 0.15)) * env;
      const contrast = Math.pow(amp, 1.8);
      fallback.push(Math.min(98, Math.max(8, Math.round(contrast * 94 + 6))));
    }
    return fallback;
  }, [audioUrl, title, id]);

  // High-Definition Contrast Canvas Drawing
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

    const peaks = getPeaks();
    const totalPeaks = peaks.length;
    const progress = isThisTrackActive ? playbackProgress : 0;
    const hoverFraction = hoverFractionRef.current;

    // Uniform 2px bar with 2px gap (4px step)
    const barWidth = 2;
    const barGap = 2;
    const step = barWidth + barGap;

    const barCount = Math.floor(rect.width / step);
    const totalSpan = barCount * step - barGap;
    const startX = Math.floor((rect.width - totalSpan) / 2);

    const centerY = Math.floor(rect.height / 2);
    const maxAmplitude = Math.floor(rect.height * 0.46);

    for (let i = 0; i < barCount; i++) {
      // Smooth interpolation between high-resolution peak samples
      const peakPos = (i / Math.max(1, barCount - 1)) * (totalPeaks - 1);
      const lowIndex = Math.floor(peakPos);
      const highIndex = Math.min(totalPeaks - 1, lowIndex + 1);
      const fraction = peakPos - lowIndex;
      const peakVal = (peaks[lowIndex] || 15) * (1 - fraction) + (peaks[highIndex] || 15) * fraction;

      // Dynamic scaling for high definition transients and deep valleys
      const normalizedHeight = (peakVal / 100) * maxAmplitude;
      const halfHeight = Math.max(1.5, Math.round(normalizedHeight));
      const barHeight = halfHeight * 2;

      const x = startX + i * step;
      const y = centerY - halfHeight;

      const barProgress = (x - startX) / Math.max(1, totalSpan);
      const isPlayed = barProgress <= progress;
      const isHovered = hoverFraction !== null && (x / rect.width) <= hoverFraction;

      if (isPlayed) {
        ctx.fillStyle = "#F8F9EC"; // Solid crisp cream-white
      } else if (isHovered) {
        ctx.fillStyle = "#4A4A4A"; // Hover preview
      } else {
        ctx.fillStyle = "#222222"; // Unplayed dark charcoal
      }

      ctx.beginPath();
      const radius = 1;
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barHeight, radius);
      } else {
        ctx.rect(x, y, barWidth, barHeight);
      }
      ctx.fill();
    }

    // Hover Needle
    if (hoverFraction !== null) {
      const needleX = Math.round(hoverFraction * rect.width);
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(needleX, 0, 1, rect.height);
    }

    ctx.restore();
  }, [getPeaks, isThisTrackActive, playbackProgress]);

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

  // ResizeObserver for clean responsive layout adjustments
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      renderWaveform();
    });
    observer.observe(container);
    return () => observer.disconnect();
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
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const p = getProgressFromPointer(e);
    if (!isThisTrackActive) {
      playTrack(id, title, bpm, audioUrl, p);
    } else {
      seekTrack(p);
    }
    renderWaveform();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getProgressFromPointer(e);
    hoverFractionRef.current = p;

    if (isPointerDownRef.current) {
      e.preventDefault();
      if (isThisTrackActive) {
        seekTrack(p);
      } else {
        playTrack(id, title, bpm, audioUrl, p);
      }
    }
    renderWaveform();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDownRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    hoverFractionRef.current = null;
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
      className={`w-full flex items-center gap-3 bg-[#121212] rounded-xl select-none ${
        compact ? "p-2" : "p-3 sm:p-4"
      }`}
    >
      {/* Play / Pause Toggle Button */}
      <button
        onClick={handlePlayToggle}
        aria-label={isThisTrackPlaying ? "Pause" : "Play"}
        className={`shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          compact ? "w-8 h-8" : "w-10 h-10"
        } ${
          isThisTrackPlaying
            ? "bg-[#F8F9EC] text-black shadow-lg"
            : "bg-[#222222] text-[#F8F9EC] hover:bg-[#7B61FF] hover:text-white"
        }`}
      >
        {isThisTrackPlaying ? (
          <Pause className={compact ? "w-3.5 h-3.5 fill-current" : "w-4 h-4 fill-current"} />
        ) : (
          <Play className={compact ? "w-3.5 h-3.5 ml-0.5 fill-current" : "w-4 h-4 ml-0.5 fill-current"} />
        )}
      </button>

      {/* HiDPI Canvas Waveform Visualizer */}
      <div className={`flex-1 relative overflow-hidden ${compact ? "h-9" : "h-12"}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="w-full h-full cursor-pointer touch-none select-none block"
        />
      </div>

      {/* Time & Optional Download */}
      <div className="flex items-center gap-2.5 shrink-0 text-xs font-mono text-[#888888]">
        <span>
          {isThisTrackActive
            ? formatTime(currentTime)
            : formatTime(duration)}
        </span>

        {showDownload && (
          <button
            onClick={handleDownload}
            aria-label="Download audio file"
            className="p-1.5 rounded-lg bg-[#1C1C1C] text-[#888888] hover:text-white hover:bg-[#252525] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
