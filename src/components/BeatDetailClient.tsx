"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { beatService } from "@/services/beatService";
import { battleService } from "@/services/battleService";
import { producerService } from "@/services/producerService";
import { DiscoveryBeat } from "@/lib/types";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { Tooltip } from "@/components/Tooltip";
import { toBeatSlug, normalizeBeatId } from "@/lib/utils";
import { Flame, Star, ArrowLeft, Loader2, Share2, Check } from "lucide-react";

export function BeatDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQueryId = searchParams?.get("id");

  const [beatId, setBeatId] = useState<string | null>(rawQueryId || null);
  const [beat, setBeat] = useState<DiscoveryBeat | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (rawQueryId) {
      setBeatId(rawQueryId);
    } else if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get("id");
      if (queryId) setBeatId(queryId);
    }
  }, [rawQueryId]);

  // Re-fetch beat when storage updates or beatId changes
  useEffect(() => {
    if (!beatId) {
      setHasChecked(true);
      return;
    }

    const fetchBeat = () => {
      const rawTarget = beatId.trim();
      if (!rawTarget) {
        setBeat(null);
        return;
      }

      const cleanSlug = toBeatSlug(rawTarget);
      const lowerRaw = rawTarget.toLowerCase();
      const normTarget = normalizeBeatId(rawTarget);

      // 1. All discovery beats
      const allDiscovery = beatService.getAllDiscoveryBeats();

      // 2. All battle submissions (from ALL battles, active or completed)
      const allSubs = battleService.getAllSubmissions();
      const mappedBattleBeats: DiscoveryBeat[] = allSubs.map((sub) => {
        const prod = producerService.getProducerById(sub.userId) || producerService.getProducerByTag(sub.beatmakerTag);
        const battle = battleService.getBattleById(sub.battleId);
        let title = sub.beatTitle || (battle?.title ? `${battle.title} Entry` : "Untitled Beat");
        if (/^Beat Battle #\d+$/i.test(title.trim())) {
          title = `${title.trim()} Entry`;
        }
        return {
          id: sub.id,
          title,
          beatmaker: {
            id: sub.userId || prod?.id || "producer",
            tag: sub.beatmakerTag || prod?.nickname || "Producer",
            avatarUrl: prod?.avatarUrl || "/avatars/default-avatar.png",
          },
          audioUrl: sub.audioUrl,
          duration: sub.duration || 120,
          waveform: sub.waveform || [],
          bpm: typeof sub.bpm === "number" ? sub.bpm : undefined,
          priceTag: "Not For Sale",
          genres: [],
          tags: [],
          flames: typeof sub.flameRating === "number" && sub.flameRating >= 1 ? Math.min(5.0, Math.max(1.0, sub.flameRating)) : undefined,
          juryScore: typeof sub.juryScore === "number" && !isNaN(sub.juryScore) ? Number(sub.juryScore) : undefined,
          juryFeedbacks: sub.juryFeedbacks || [],
          battleSource: battle?.title,
          tier: sub.rank === 1 ? 1 : sub.rank === 2 ? 2 : sub.rank === 3 ? 3 : 4,
          rank: sub.rank,
          createdAt: sub.submittedAt || new Date().toISOString(),
        };
      });

      const pool = [...allDiscovery, ...mappedBattleBeats];

      let producerSlug = "";
      if (typeof window !== "undefined") {
        producerSlug = window.location.pathname.replace(/^\//, "").split("/")[0].toLowerCase();
      }

      // Priority 1: Exact ID match (case-insensitive)
      let found = pool.find((b) => b.id.toLowerCase() === lowerRaw);

      // Priority 2: Normalized ID match (stripping sub-, disc-)
      if (!found && normTarget) {
        found = pool.find((b) => normalizeBeatId(b.id) === normTarget);
      }

      // Priority 3: Match producer + clean slug
      if (!found && producerSlug) {
        found = pool.find((b) => {
          const prodMatch =
            b.beatmaker.id.toLowerCase() === producerSlug ||
            b.beatmaker.tag.toLowerCase() === producerSlug;
          return prodMatch && toBeatSlug(b.title, b.id) === cleanSlug;
        });
      }

      // Priority 4: Match title slug across pool
      if (!found) {
        found = pool.find((b) => toBeatSlug(b.title, b.id) === cleanSlug);
      }

      // Priority 5: If target was generic battle slug (e.g. "bb8-1" or "beat-battle-8-entry"), match producer + battle number
      if (!found && producerSlug) {
        const battleNumMatch = rawTarget.match(/battle-?(\d+)/i) || rawTarget.match(/bb(\d+)/i);
        if (battleNumMatch) {
          const battleNum = battleNumMatch[1];
          found = pool.find((b) => {
            const prodMatch =
              b.beatmaker.id.toLowerCase() === producerSlug ||
              b.beatmaker.tag.toLowerCase() === producerSlug;
            const battleMatch =
              (b.battleSource && b.battleSource.includes(battleNum)) ||
              (b.id && b.id.includes(`bb${battleNum}`));
            return prodMatch && battleMatch;
          });
        }
      }

      // Priority 6: Substring match in ID
      if (!found && normTarget.length >= 3) {
        found = pool.find((b) => {
          const bNorm = normalizeBeatId(b.id);
          return bNorm.includes(normTarget) || normTarget.includes(bNorm);
        });
      }

      setBeat(found || null);
    };

    Promise.allSettled([
      beatService.syncFromSupabase(),
      battleService.syncFromSupabase(),
      producerService.syncFromSupabase(),
    ]).then(() => {
      fetchBeat();
      setHasChecked(true);
    });

    window.addEventListener("bnp_beats_updated", fetchBeat);
    window.addEventListener("bnp_battles_updated", fetchBeat);
    return () => {
      window.removeEventListener("bnp_beats_updated", fetchBeat);
      window.removeEventListener("bnp_battles_updated", fetchBeat);
    };
  }, [beatId]);

  const toggleFavorite = () => {
    if (!beat) return;
    const isFav = beatService.toggleFavorite(beat.id);
    setBeat({ ...beat, isFavorite: isFav });
  };

  const handleShare = () => {
    if (!beat) return;
    const cleanSlug = toBeatSlug(beat.title, beat.id);
    const url = `${window.location.origin}/${beat.beatmaker.id}/beat?id=${cleanSlug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
      <Link
        href={`/${beat.beatmaker.id}`}
        className="flex items-center gap-2 text-sm text-white hover:text-zinc-300 transition-colors cursor-pointer w-max"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Go back to {displayTag}&apos;s profile</span>
      </Link>

      {/* Main Beat Card (Using the exact layout from Beats Discovery) */}
      <div className="bg-[#181818] rounded-[32px] p-5 sm:p-6 relative">
        
        {/* Row 1: Header (Actions & Meta on Top on mobile, Avatar + Title + Producer under) */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 min-w-0">
          
          {/* Main Info: Beat Title + Producer Avatar/Tag + Badges (Underneath on mobile, left on desktop) */}
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
            <Link
              href={`/${beat.beatmaker.id}`}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden relative shrink-0 hover:opacity-80 transition-opacity bg-[#121212]"
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

            <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
              {/* Title & Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0 mb-1.5">
                <h1 className="font-bold text-white text-lg leading-snug break-words [overflow-wrap:anywhere]">
                  {beat.title}
                </h1>

                {beat.rank === 1 && (
                  <span className="h-7 px-3.5 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                    1st Place
                  </span>
                )}
                {beat.rank === 2 && (
                  <span className="h-7 px-3.5 rounded-full bg-[#1E1E1E] text-[#AAAAAA] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                    2nd Place
                  </span>
                )}
                {beat.rank === 3 && (
                  <span className="h-7 px-3.5 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                    3rd Place
                  </span>
                )}

                {match && (
                  <Link
                    href={`/battles/battle-${match[1]}`}
                    className="px-3.5 h-7 rounded-full bg-[#7B61FF]/15 text-zinc-300 hover:bg-[#7B61FF]/25 hover:text-white text-xs font-bold shrink-0 transition-all inline-flex items-center gap-1.5 leading-none"
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

          {/* Meta & Actions: (Favorites / Share / Public Rating / Badges) - Top on mobile, right on desktop */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-3.5 shrink-0 select-none w-full sm:w-auto">
            {/* Left subgroup on mobile: BPM, Price Tag & Jury */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* BPM */}
              {beat.bpm ? (
                <span className="text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-[#121212] text-[#888888] select-none inline-flex items-center justify-center text-center leading-none">
                  {beat.bpm} BPM
                </span>
              ) : null}

              {/* Price Tag Pill */}
              {beat.priceTag ? (
                <span
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold select-none inline-flex items-center justify-center text-center leading-none ${
                    beat.priceTag === "Not For Sale"
                      ? "bg-[#121212] text-[#666666]"
                      : "bg-emerald-500/10 text-emerald-400"
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
            </div>

            {/* Right subgroup: Share, Favorite, Flame Rating */}
            <div className="flex items-center gap-3 ml-auto sm:ml-0">
              {/* Share Button */}
              <Tooltip content={copied ? "Link copied!" : "Copy link to beat"}>
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 rounded-full bg-[#121212] hover:bg-[#202020] transition-colors text-[#888888] hover:text-white cursor-pointer select-none shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
              </Tooltip>

              {/* Favorite Button */}
              <Tooltip content={beat.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className="p-2 rounded-full bg-[#121212] hover:bg-[#202020] transition-colors text-[#888888] hover:text-amber-400 cursor-pointer select-none shadow-sm"
                >
                  <Star
                    className={`w-4 h-4 ${
                      beat.isFavorite ? "fill-amber-400 text-amber-400" : ""
                    }`}
                  />
                </button>
              </Tooltip>

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
          <div className="flex flex-wrap items-center gap-2 pt-4 text-xs select-none mt-2">
            {beat.genres?.map((g) => (
              <span
                key={g}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#121212] text-[#888888]"
              >
                {g}
              </span>
            ))}

            {beat.tags?.map((t) => (
              <span
                key={t}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#121212] text-[#777777]"
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
