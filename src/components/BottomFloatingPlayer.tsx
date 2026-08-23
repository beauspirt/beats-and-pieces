"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Volume2, Volume1, VolumeX, X, Disc } from "lucide-react";
import { useAudioPlayer } from "@/lib/audio-context";
import { formatTime } from "@/lib/utils";

export const BottomFloatingPlayer: React.FC = () => {
  const {
    currentTrackId,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    playTrack,
    pauseTrack,
    togglePlay,
    seekTrack,
    closePlayer,
    activeTrackTitle,
    activeTrackArtist,
    activeTrackArtistId,
    activeTrackCover,
  } = useAudioPlayer();

  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubFraction, setScrubFraction] = useState(0);
  const [showMobileVolume, setShowMobileVolume] = useState(false);

  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const mobileScrubberRef = useRef<HTMLDivElement | null>(null);
  const volumeBarRef = useRef<HTMLDivElement | null>(null);
  const mobileVolumeBarRef = useRef<HTMLDivElement | null>(null);
  const mobileVolumePopupRef = useRef<HTMLDivElement | null>(null);

  const isPointerDownScrubber = useRef(false);
  const isPointerDownVolume = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Slide-up enter animation on track activation
  useEffect(() => {
    if (currentTrackId) {
      setIsClosing(false);
      const timer = setTimeout(() => setIsVisible(true), 20);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [currentTrackId]);

  // Smooth dismiss handler with slide-down exit animation
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClosing(true);
    setTimeout(() => {
      closePlayer();
      setIsClosing(false);
      setIsVisible(false);
    }, 280);
  };

  // Close mobile volume flyout when tapping outside
  useEffect(() => {
    if (!showMobileVolume) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (mobileVolumePopupRef.current && !mobileVolumePopupRef.current.contains(e.target as Node)) {
        setShowMobileVolume(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [showMobileVolume]);

  if (!mounted || !currentTrackId) return null;

  const integerSeconds = Math.floor(currentTime);
  const currentDisplayProgress = isScrubbing ? scrubFraction : (duration > 0 ? integerSeconds / duration : 0);
  const currentDisplayTime = isScrubbing ? scrubFraction * duration : integerSeconds;
  const currentVolumePercent = isMuted ? 0 : volume;

  // --- SCRUBBER HANDLERS (Spotify smooth & silent scrubbing) ---
  const getScrubberFraction = (e: React.PointerEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement | null>) => {
    const bar = targetRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  };

  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    e.preventDefault();
    e.stopPropagation();
    isPointerDownScrubber.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const targetRef = isMobile ? mobileScrubberRef : scrubberRef;
    const frac = getScrubberFraction(e, targetRef);
    setIsScrubbing(true);
    setScrubFraction(frac);
  };

  const handleScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    if (!isPointerDownScrubber.current) return;
    const targetRef = isMobile ? mobileScrubberRef : scrubberRef;
    const frac = getScrubberFraction(e, targetRef);
    setScrubFraction(frac);
  };

  const handleScrubberPointerUp = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    if (!isPointerDownScrubber.current) return;
    isPointerDownScrubber.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const targetRef = isMobile ? mobileScrubberRef : scrubberRef;
    const frac = getScrubberFraction(e, targetRef);
    setIsScrubbing(false);
    seekTrack(frac);
  };

  // --- VOLUME BAR HANDLERS ---
  const getVolumeFraction = (e: React.PointerEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement | null>) => {
    const bar = targetRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  };

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    e.preventDefault();
    e.stopPropagation();
    isPointerDownVolume.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const targetRef = isMobile ? mobileVolumeBarRef : volumeBarRef;
    const frac = getVolumeFraction(e, targetRef);
    setVolume(frac);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    if (!isPointerDownVolume.current) return;
    const targetRef = isMobile ? mobileVolumeBarRef : volumeBarRef;
    const frac = getVolumeFraction(e, targetRef);
    setVolume(frac);
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>, isMobile = false) => {
    if (!isPointerDownVolume.current) return;
    isPointerDownVolume.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const targetRef = isMobile ? mobileVolumeBarRef : volumeBarRef;
    const frac = getVolumeFraction(e, targetRef);
    setVolume(frac);
  };

  return (
    <div
      className={`fixed inset-x-0 z-50 bg-[#121212] select-none transition-[bottom] duration-300 ease-out border-b-[60px] border-[#121212] -mb-[60px] ${
        isVisible && !isClosing ? "bottom-0" : "-bottom-36 pointer-events-none"
      }`}
    >
      
      {/* Mobile Top Interactive Scrubber (Pinned absolutely to top edge with zero layout shift) */}
      <div
        ref={mobileScrubberRef}
        onPointerDown={(e) => handleScrubberPointerDown(e, true)}
        onPointerMove={(e) => handleScrubberPointerMove(e, true)}
        onPointerUp={(e) => handleScrubberPointerUp(e, true)}
        className="sm:hidden absolute top-0 left-0 right-0 -translate-y-1/2 h-5 flex items-center cursor-pointer z-30 select-none touch-none group"
      >
        <div className="w-full h-[3px] bg-[#2A2A2A] relative overflow-hidden">
          <div
            className="h-full bg-[#7B61FF]"
            style={{ width: `${Math.max(0, Math.min(100, currentDisplayProgress * 100))}%` }}
          />
        </div>
        {/* Mobile Scrubber Drag Thumb */}
        <div
          className="w-2.5 h-2.5 bg-white rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-[0_1px_4px_rgba(0,0,0,0.8)] pointer-events-none"
          style={{ left: `${Math.max(0, Math.min(100, currentDisplayProgress * 100))}%` }}
        />
      </div>

      {/* Main Container: Generous top & bottom padding on mobile and desktop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 flex items-center justify-between gap-3 sm:gap-6 min-h-[72px] sm:min-h-[96px]">
        
        {/* LEFT COLUMN: Track Info (Cover, Title, Clickable Artist) */}
        <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-1/3 sm:max-w-[280px]">
          {/* Artwork Thumbnail */}
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-md overflow-hidden bg-[#242424] relative shrink-0 shadow-md flex items-center justify-center">
            {activeTrackCover ? (
              <Image
                src={activeTrackCover}
                alt={activeTrackTitle || "Beat Artwork"}
                fill
                className="object-cover"
              />
            ) : (
              <Disc className={`w-5 h-5 sm:w-6 sm:h-6 ${isPlaying ? "text-[#7B61FF] animate-spin" : "text-[#666666]"}`} style={{ animationDuration: "3s" }} />
            )}
          </div>

          {/* Title & Artist Stack */}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight" title={activeTrackTitle || ""}>
              {activeTrackTitle || "Playing Beat"}
            </h4>

            {/* Clickable Beatmaker (when public) or Anonymized Tag */}
            {activeTrackArtistId ? (
              <Link
                href={`/producers/${activeTrackArtistId}`}
                className="text-[11px] sm:text-xs text-[#B3B3B3] hover:text-white hover:underline transition-colors block truncate mt-0.5 sm:mt-1 font-medium"
              >
                {activeTrackArtist || "Producer"}
              </Link>
            ) : (
              <span className="text-[11px] sm:text-xs text-[#888888] block truncate mt-0.5 sm:mt-1">
                {activeTrackArtist || "Community Track"}
              </span>
            )}
          </div>
        </div>

        {/* CENTER COLUMN (Desktop only): Play/Pause Button + Spotify-Style Scrubber */}
        <div className="hidden sm:flex flex-col items-center justify-center gap-2 flex-1 max-w-xl min-w-0">
          
          {/* Transport Controls Row */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all cursor-pointer"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Scrubber Row: Time + Track + Duration */}
          <div className="flex items-center gap-2.5 w-full">
            <span className="text-[11px] font-mono text-[#A7A7A7] select-none w-9 text-right shrink-0">
              {formatTime(currentDisplayTime)}
            </span>

            {/* Interactive Scrubber Track (Thin 3px Bar with generous hit area) */}
            <div
              ref={scrubberRef}
              onPointerDown={(e) => handleScrubberPointerDown(e, false)}
              onPointerMove={(e) => handleScrubberPointerMove(e, false)}
              onPointerUp={(e) => handleScrubberPointerUp(e, false)}
              className="flex-1 py-3 -my-3 flex items-center relative cursor-pointer group select-none"
            >
              {/* Slim Unified 3px Track */}
              <div className="w-full h-[3px] bg-[#3E3E3E] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-white group-hover:bg-[#7B61FF] rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, currentDisplayProgress * 100))}%` }}
                />
              </div>

              {/* Always-Visible Pixel-Perfect Playhead Circle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover:scale-125 group-active:scale-125 transition-transform duration-150 ease-out will-change-transform flex items-center justify-center"
                style={{
                  left: `${Math.max(0, Math.min(100, currentDisplayProgress * 100))}%`,
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className="w-3 h-3 overflow-visible drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
                  shapeRendering="geometricPrecision"
                >
                  <circle cx="8" cy="8" r="6" fill="#FFFFFF" />
                </svg>
              </div>
            </div>

            <span className="text-[11px] font-mono text-[#A7A7A7] select-none w-9 text-left shrink-0">
              {formatTime(duration)}
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: Mobile Play Button + Volume Popover (Mobile) / Slider (Desktop) + Dismiss */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 sm:w-1/3 sm:max-w-[280px] relative">
          
          {/* Mobile Volume Popover Flyout */}
          {showMobileVolume && (
            <div
              ref={mobileVolumePopupRef}
              className="sm:hidden absolute bottom-full right-6 mb-3 bg-[#1A1A1A]/95 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-white/10 rounded-2xl p-3 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <button
                onClick={toggleMute}
                className="p-1 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || currentVolumePercent === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : currentVolumePercent < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <div
                ref={mobileVolumeBarRef}
                onPointerDown={(e) => handleVolumePointerDown(e, true)}
                onPointerMove={(e) => handleVolumePointerMove(e, true)}
                onPointerUp={(e) => handleVolumePointerUp(e, true)}
                className="w-24 py-2.5 -my-2.5 flex items-center relative cursor-pointer select-none touch-none"
              >
                <div className="w-full h-1 bg-[#3E3E3E] rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-[#7B61FF] rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, currentVolumePercent * 100))}%` }}
                  />
                </div>
                <div
                  className="w-3 h-3 bg-white rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-md pointer-events-none"
                  style={{ left: `${Math.max(0, Math.min(100, currentVolumePercent * 100))}%` }}
                />
              </div>

              <span className="text-[11px] font-mono text-zinc-400 min-w-[28px] text-right">
                {Math.round(currentVolumePercent * 100)}%
              </span>
            </div>
          )}

          {/* Volume Icon Button (Opens Flyout on Mobile, Mutes on Desktop) */}
          <button
            onClick={() => {
              if (window.innerWidth < 640) {
                setShowMobileVolume((prev) => !prev);
              } else {
                toggleMute();
              }
            }}
            className={`p-1.5 transition-colors cursor-pointer shrink-0 rounded-lg ${
              showMobileVolume ? "text-white bg-white/10" : "text-[#B3B3B3] hover:text-white"
            }`}
            title={isMuted ? "Unmute" : "Volume"}
            aria-label="Volume controls"
          >
            {isMuted || currentVolumePercent === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : currentVolumePercent < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Spotify-style Slim 3px Volume Bar (Desktop Only) */}
          <div
            ref={volumeBarRef}
            onPointerDown={(e) => handleVolumePointerDown(e, false)}
            onPointerMove={(e) => handleVolumePointerMove(e, false)}
            onPointerUp={(e) => handleVolumePointerUp(e, false)}
            className="w-16 sm:w-24 py-3 -my-3 items-center relative cursor-pointer group select-none hidden sm:flex"
          >
            <div className="w-full h-[3px] bg-[#3E3E3E] rounded-full overflow-hidden relative">
              <div
                className="h-full bg-white group-hover:bg-[#7B61FF] rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, currentVolumePercent * 100))}%` }}
              />
            </div>

            {/* Volume Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-150 ease-out will-change-transform flex items-center justify-center"
              style={{
                left: `${Math.max(0, Math.min(100, currentVolumePercent * 100))}%`,
              }}
            >
              <svg
                viewBox="0 0 16 16"
                className="w-2.5 h-2.5 overflow-visible drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                shapeRendering="geometricPrecision"
              >
                <circle cx="8" cy="8" r="6" fill="#FFFFFF" />
              </svg>
            </div>
          </div>

          {/* Mobile Play/Pause Button (Visible on mobile right next to volume) */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center shadow-md transition-all cursor-pointer sm:hidden"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Dismiss Player Bar with smooth slide-down animation */}
          <button
            onClick={handleClose}
            className="p-1.5 text-[#B3B3B3] hover:text-white transition-colors cursor-pointer shrink-0 ml-0.5 sm:ml-1"
            title="Close player"
            aria-label="Close player"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

      </div>
    </div>
  );
};
