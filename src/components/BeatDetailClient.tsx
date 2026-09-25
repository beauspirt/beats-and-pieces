"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { beatService } from "@/services/beatService";
import { DiscoveryBeat } from "@/lib/types";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { Tooltip } from "@/components/Tooltip";
import { Flame, Star, ArrowLeft, Loader2 } from "lucide-react";

export function BeatDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const beatId = searchParams.get("id");
  
  const [beat, setBeat] = useState<DiscoveryBeat | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  // Re-fetch beat when storage updates
  useEffect(() => {
    if (!beatId) {
      setHasChecked(true);
      return;
    }

    const fetchBeat = () => {
      const allBeats = beatService.getAllDiscoveryBeats();
      const found = allBeats.find((b) => b.id === beatId);
      setBeat(found || null);
    };

    beatService.syncFromSupabase().then(() => {
      fetchBeat();
      setHasChecked(true);
    });

    window.addEventListener("bnp_beats_updated", fetchBeat);
    return () => {
      window.removeEventListener("bnp_beats_updated", fetchBeat);
    };
  }, [beatId]);

  const toggleFavorite = () => {
    if (!beat) return;
    const isFav = beatService.toggleFavorite(beat.id);
    setBeat({ ...beat, isFavorite: isFav });
  };

  if (!beatId || (!beat && hasChecked)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <h1 className="text-3xl font-black text-[#FF5E3A]">404</h1>
        <h2 className="text-xl font-bold text-white">Beat Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          This beat may have been removed or doesn't exist.
        </p>
        <Link
          href="/beats"
          className="px-6 py-2.5 rounded-full bg-[#FF5E3A] hover:bg-[#FF4520] text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-lg mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore All Beats</span>
        </Link>
      </div>
    );
  }

  if (!hasChecked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF5E3A] animate-spin" />
      </div>
    );
  }

  if (!beat) return null;

  const displayAvatar =
    beat.beatmaker.avatarUrl && !beat.beatmaker.avatarUrl.includes("supabase.co")
      ? beat.beatmaker.avatarUrl
      : "/avatars/default-avatar.png";
  const displayTag = beat.beatmaker.tag || beat.beatmaker.id;

  const match =
    (beat.battleSource && beat.battleSource.match(/Beat Battle #?(\d+)/i)) ||
    (beat.id && beat.id.match(/disc-bb(\d+)/));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer w-max"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Go Back</span>
      </button>

      {/* Main Beat Card (Using the exact layout from Beats Discovery) */}
      <div className="bg-[#181818] rounded-[32px] p-5 sm:p-6 shadow-2xl relative border border-white/5">
        
        {/* Row 1: Header (Title, Producer, Avatar, Badges, Meta) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
          
          {/* Left: Beat Title + Producer Avatar/Tag + Badges */}
          <div className="flex items-start gap-4 min-w-0 flex-1 pr-24 sm:pr-0">
            <Link
              href={`/${beat.beatmaker.id}`}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden relative shrink-0 hover:opacity-80 transition-opacity bg-[#121212] ring-2 ring-white/10"
            >
              <Image
                src={displayAvatar}
                alt={displayTag}
                fill
                className="object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (img && !img.src.endsWith("/avatars/default-avatar.png")) {
                    img.src = "/avatars/default-avatar.png";
                  }
                }}
              />
            </Link>

            <div className="min-w-0 flex-1 pt-1">
              {/* Title & Badges */}
              <div className="flex flex-wrap items-center gap-2.5 min-w-0 mb-1.5">
                <h1 className="font-black text-white text-2xl sm:text-3xl leading-tight break-words [overflow-wrap:anywhere]">
                  {beat.title}
                </h1>

                {beat.rank === 1 && (
                  <span className="h-7 px-3.5 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0 border border-[#FF5E3A]/30">
                    1st Place
                  </span>
                )}
                {beat.rank === 2 && (
                  <span className="h-7 px-3.5 rounded-full bg-[#1E1E1E] text-[#AAAAAA] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0 border border-white/10">
                    2nd Place
                  </span>
                )}
                {beat.rank === 3 && (
                  <span className="h-7 px-3.5 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0 border border-[#FF8A65]/30">
                    3rd Place
                  </span>
                )}

                {match && (
                  <Link
                    href={`/battles/battle-${match[1]}`}
                    className="px-3.5 h-7 rounded-full bg-[#7B61FF]/15 text-zinc-300 hover:bg-[#7B61FF]/25 hover:text-white text-xs font-bold shrink-0 transition-all inline-flex items-center gap-1.5 leading-none border border-[#7B61FF]/30"
                    title={`View ${beat.battleSource || `Beat Battle #${match[1]}`}`}
                  >
                    <span>BB#{match[1]}</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                )}
              </div>

              {/* Beatmaker name */}
              <Link
                href={`/${beat.beatmaker.id}`}
                className="text-sm text-[#7B61FF] hover:underline font-bold block truncate"
              >
                {displayTag}
              </Link>
            </div>
          </div>

          {/* Right: Meta Badges (BPM, Price, Jury, Fav) */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 shrink-0 select-none sm:self-start">
            {/* BPM */}
            {beat.bpm ? (
              <span className="text-xs font-bold px-3.5 py-2 rounded-full bg-[#121212] text-[#888888] select-none inline-flex items-center justify-center text-center leading-none border border-white/5">
                {beat.bpm} BPM
              </span>
            ) : null}

            {/* Price Tag Pill */}
            {beat.priceTag ? (
              <span
                className={`px-3.5 py-2 rounded-full text-xs font-bold select-none inline-flex items-center justify-center text-center leading-none border ${
                  beat.priceTag === "Not For Sale"
                    ? "bg-[#121212] text-[#666666] border-white/5"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                }`}
              >
                {beat.priceTag}
              </span>
            ) : null}

            {/* Jury Score Avg */}
            {typeof beat.juryScore === "number" && beat.juryScore > 0 ? (
              <Tooltip content="Jury Score Average">
                <div className="flex items-center gap-1 text-sm text-[#7B61FF] font-bold px-2 select-none cursor-default">
                  <Star className="w-4 h-4 fill-current text-[#7B61FF]" />
                  <span>{beat.juryScore.toFixed(2)}</span>
                </div>
              </Tooltip>
            ) : null}

            {/* Top Right Corner Actions (Absolute on mobile, inline on desktop) */}
            <div className="absolute top-5 right-5 sm:static sm:top-auto sm:right-auto z-10 flex items-center gap-3">
              {/* Favorite Button */}
              <button
                type="button"
                onClick={toggleFavorite}
                className="p-2 rounded-full bg-[#121212] hover:bg-[#202020] transition-colors text-[#888888] hover:text-amber-400 cursor-pointer select-none border border-white/5 shadow-sm"
                title={beat.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star
                  className={`w-4 h-4 ${
                    beat.isFavorite ? "fill-amber-400 text-amber-400" : ""
                  }`}
                />
              </button>

              {/* Community Flames (Public Rating Avg) */}
              {typeof beat.flames === "number" && beat.flames >= 1 ? (
                <Tooltip content="Public Rating Average">
                  <div className="flex items-center gap-1 text-sm text-[#FF5E3A] font-bold select-none cursor-default leading-none">
                    <Flame className="w-4 h-4 fill-current" />
                    <span>{beat.flames.toFixed(2)}</span>
                  </div>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>

        {/* Row 2: Full Waveform Player */}
        <div className="pt-6 pb-2">
          <AudioWaveformPlayer
            id={`single-beat-${beat.id}`}
            title={beat.title}
            artist={displayTag}
            artistId={beat.beatmaker.id}
            coverUrl={beat.beatmaker.avatarUrl}
            audioUrl={beat.audioUrl}
            waveformPeaks={beat.waveform}
            duration={beat.duration}
            bpm={beat.bpm}
            compact={false}
          />
        </div>

        {/* Row 3: Clickable Genre & Tags */}
        {((beat.genres && beat.genres.length > 0) || (beat.tags && beat.tags.length > 0)) ? (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5 text-xs select-none mt-2">
            {beat.genres?.map((g) => (
              <span
                key={g}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#121212] text-[#888888] border border-white/5"
              >
                {g}
              </span>
            ))}

            {beat.tags?.map((t) => (
              <span
                key={t}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#121212] text-[#777777] border border-white/5"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

      </div>
    </div>
  );
}
