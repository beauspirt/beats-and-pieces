"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleProducers, sampleDiscoveryBeats, sampleSubmissions } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { DiscoveryBeat, JudgeFeedbackItem } from "@/lib/types";
import { 
  Flame, Trophy, Mail, ExternalLink, 
  CheckCircle2, Copy, MapPin, Calendar, Star, Award
} from "lucide-react";

/**
 * 5-Second Auto-Cycling Judge Feedback Component
 * Cycles through multiple judge feedbacks every 5 seconds in a continuous loop.
 */
function JudgeFeedbackTicker({
  feedbacks,
}: {
  feedbacks: JudgeFeedbackItem[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!feedbacks || feedbacks.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % feedbacks.length);
    }, 5000); // 5 seconds per feedback

    return () => clearInterval(interval);
  }, [feedbacks]);

  if (!feedbacks || feedbacks.length === 0) return null;

  const current = feedbacks[currentIndex] || feedbacks[0];

  return (
    <div className="pt-2.5 mt-2.5 border-t border-[#242424]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        
        {/* Judge Feedback Quote & Name */}
        <div className="flex-1 flex items-baseline gap-2 min-w-0 transition-all duration-300">
          <span className="font-semibold text-[#7B61FF] shrink-0">
            {current.judgeName}:
          </span>
          <span className="text-[#C4C4C4] italic truncate sm:whitespace-normal">
            &ldquo;{current.feedback}&rdquo;
          </span>
        </div>

        {/* Multi-Judge Cycling Indicator Dots (if > 1 judge feedback) */}
        {feedbacks.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {feedbacks.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? "bg-[#7B61FF] scale-125"
                    : "bg-[#444444] hover:bg-[#666666]"
                }`}
                title={`Feedback from ${feedbacks[i].judgeName}`}
              />
            ))}
            <span className="text-[10px] text-[#666666] ml-1">
              {currentIndex + 1}/{feedbacks.length}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

export function ProducerProfileClient({ producerId }: { producerId: string }) {
  const producer = sampleProducers[producerId] || sampleProducers["usr-ortega"];

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowContactModal(false);
      }
    };
    if (showContactModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showContactModal]);

  // Merge and prioritize all beats for this producer
  const prioritizedBeats = useMemo(() => {
    // 1. Get all discovery beats matching producer
    const baseBeats = sampleDiscoveryBeats.filter(
      (b) =>
        b.beatmaker.id === producer.id ||
        b.beatmaker.tag.toLowerCase() === producer.nickname.toLowerCase()
    );

    // 2. Get all battle submissions by producer
    const submissions = sampleSubmissions.filter(
      (s) =>
        s.userId === producer.id ||
        s.beatmakerTag.toLowerCase() === producer.nickname.toLowerCase()
    );

    const mergedList: (DiscoveryBeat & {
      tier: number;
      rank?: number;
      juryScore?: number;
      competitionTitle?: string;
      juryFeedbacksList?: JudgeFeedbackItem[];
    })[] = [];

    // Process base discovery beats
    baseBeats.forEach((b) => {
      let tier = 4;
      let rank = b.rank;

      if (b.battleSource) {
        if (b.battleSource.includes("1st Place") || rank === 1) tier = 1;
        else if (b.battleSource.includes("2nd Place") || rank === 2) tier = 2;
        else if (b.battleSource.includes("3rd Place") || rank === 3) tier = 3;
        else tier = 3;
      }

      mergedList.push({
        ...b,
        tier,
        rank,
        competitionTitle: b.battleSource,
      });
    });

    // Merge battle submissions if not already in list
    submissions.forEach((sub) => {
      const existing = mergedList.find(
        (b) => b.audioUrl === sub.audioUrl || (b.title === sub.beatTitle && sub.beatTitle !== "Beat Battle #1")
      );

      const juryList: JudgeFeedbackItem[] = sub.juryFeedbacks || [];
      if (sub.juryFeedback && sub.judgeName && juryList.length === 0) {
        juryList.push({
          judgeName: sub.judgeName,
          feedback: sub.juryFeedback,
        });
      }

      if (existing) {
        if (juryList.length > 0) {
          existing.juryFeedbacksList = juryList;
        }
      } else {
        let tier = 4;
        if (sub.rank === 1) tier = 1;
        else if (sub.rank === 2) tier = 2;
        else if (sub.rank === 3) tier = 3;
        else if (sub.rank && sub.rank <= 8) tier = 3;

        mergedList.push({
          id: `sub-${sub.id}`,
          title: sub.beatTitle,
          beatmaker: {
            id: producer.id,
            tag: producer.nickname,
            avatarUrl: producer.avatarUrl,
          },
          audioUrl: sub.audioUrl,
          duration: sub.duration,
          bpm: sub.bpm || 90,
          battleSource: `Battle Entry (${sub.battleId})`,
          flames: sub.flameRating,
          juryScore: sub.juryScore,
          tier,
          rank: sub.rank,
          competitionTitle: `Battle Entry (${sub.battleId})`,
          juryFeedbacksList: juryList,
          priceTag: "Not For Sale",
          tags: [],
          genres: [],
          createdAt: sub.submittedAt,
        });
      }
    });

    // Sort by tier first (1 -> 2 -> 3 -> 4), then by rank, then chronological
    return mergedList.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      if (a.tier <= 3 && a.rank && b.rank && a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return (b.flames || 0) - (a.flames || 0);
    });
  }, [producer]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(producer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* SECTION 1: PRODUCER SHOWCASE HERO */}
      <div className="bg-[#181818] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
          
          {/* Large Avatar */}
          <div
            className="w-24 h-24 sm:w-32 sm:h-32 max-w-[128px] max-h-[128px] rounded-full overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl border border-white/5"
            style={{ width: "128px", height: "128px", position: "relative" }}
          >
            <Image
              src={producer.avatarUrl || "/avatars/default-avatar.png"}
              alt={producer.nickname}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
          </div>

          {/* Producer Info & Bio */}
          <div className="flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {producer.nickname}
              </h1>

              {/* Discord & Battle Badges */}
              {producer.discordRoles?.map((role) => (
                <span
                  key={role}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold ${
                    role.includes("Winner")
                      ? "bg-[#FF5E3A]/20 text-[#FF5E3A]"
                      : role.includes("Admin")
                      ? "bg-[#7B61FF] text-white"
                      : "bg-[#1E232A] text-[#94A3B8]"
                  }`}
                >
                  {role}
                </span>
              ))}
            </div>

            <p className="text-sm text-[#D1D1D1] leading-relaxed max-w-2xl font-normal">
              {producer.bio}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#888888] pt-0.5">
              {producer.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#7B61FF]" />
                  <span>{producer.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#888888]" />
                <span>Member since {new Date(producer.createdAt).getFullYear()}</span>
              </span>
            </div>
          </div>

          {/* Contact / Inquire Action Button */}
          <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-7 py-3.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Contact / License</span>
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 2: PRODUCER DISCOGRAPHY / BEATS SHOWCASE */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Discography & Battle Beats</h2>

        {prioritizedBeats.length > 0 ? (
          <div className="space-y-3.5">
            {prioritizedBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3 shadow-md"
              >
                {/* Row 1: Header (Title, Rank Badge, Meta) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Beat Title + Battle Source */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-snug truncate">
                          {beat.title}
                        </h3>

                        {/* Rank Badge */}
                        {beat.rank === 1 && (
                          <span className="h-6 px-3 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center leading-none">
                            1st Place Winner
                          </span>
                        )}
                        {beat.rank === 2 && (
                          <span className="h-6 px-3 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-bold inline-flex items-center justify-center leading-none">
                            2nd Place
                          </span>
                        )}
                        {beat.rank === 3 && (
                          <span className="h-6 px-3 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center leading-none">
                            3rd Place
                          </span>
                        )}
                      </div>

                      {beat.battleSource && (
                        <span className="text-xs text-[#888888] font-medium block mt-0.5">
                          {beat.battleSource}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: BPM, Price Tag, Flames */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#121212] text-[#888888]">
                      {beat.bpm} BPM
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        beat.priceTag === "Not For Sale"
                          ? "bg-[#121212] text-[#666666]"
                          : "bg-[#FF5E3A]/20 text-[#FF5E3A]"
                      }`}
                    >
                      {beat.priceTag || "For Sale"}
                    </span>

                    {beat.flames !== undefined && beat.flames > 0 && (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-2">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>{beat.flames.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Row 2: Full Waveform Player */}
                <AudioWaveformPlayer
                  id={`prod-beat-${beat.id}`}
                  title={beat.title}
                  audioUrl={beat.audioUrl}
                  duration={beat.duration}
                  bpm={beat.bpm}
                  compact={true}
                />

                {/* Row 3: Tags (only if tags exist) */}
                {((beat.genres && beat.genres.length > 0) || (beat.tags && beat.tags.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                    {beat.genres?.map((g) => (
                      <span key={g} className="px-3.5 py-1 rounded-full bg-[#121212] text-[#888888] font-medium inline-flex items-center justify-center text-center leading-none">
                        {g}
                      </span>
                    ))}
                    {beat.tags.filter((t) => !t.toLowerCase().includes("winner") && !t.includes("Place") && !t.includes("Finalist")).map((t) => (
                      <span key={t} className="px-3.5 py-1 rounded-full bg-[#121212] text-[#777777] font-medium inline-flex items-center justify-center text-center leading-none">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Row 4: 5-Second Cycling Judge Feedback (if available) */}
                {beat.juryFeedbacksList && beat.juryFeedbacksList.length > 0 && (
                  <JudgeFeedbackTicker feedbacks={beat.juryFeedbacksList} />
                )}

              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#181818] rounded-2xl p-10 text-center text-sm text-[#888888]">
            No public beats uploaded yet.
          </div>
        )}
      </div>

      {/* CONTACT MODAL DIALOG */}
      {showContactModal && (
        <div 
          onClick={() => setShowContactModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#181818] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default"
          >
            
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Contact {producer.nickname}</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="w-8 h-8 rounded-full bg-[#121212] text-[#888888] hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#A0A0A0] leading-relaxed">
              Inquire about beat licenses, custom production, or collabs directly with {producer.nickname}:
            </p>

            {/* Email Box */}
            <div className="bg-[#121212] rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[10px] text-[#777777] uppercase block">Direct Email</span>
                <span className="text-xs sm:text-sm text-white select-all">{producer.email}</span>
              </div>

              <button
                onClick={handleCopyEmail}
                className="px-3.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#7B61FF] text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedEmail ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Channels */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs text-[#888888] uppercase block">Producer Channels</span>
              <div className="grid grid-cols-2 gap-2.5">
                {producer.links?.instagram && (
                  <a
                    href={producer.links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-xs font-semibold text-white flex items-center justify-between transition-colors"
                  >
                    <span>Instagram</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </a>
                )}

                {producer.links?.beatstars && (
                  <a
                    href={producer.links.beatstars}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-xs font-semibold text-white flex items-center justify-between transition-colors"
                  >
                    <span>BeatStars</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
