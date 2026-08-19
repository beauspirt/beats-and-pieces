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

    // 3. Merge submissions into discovery beats or add as showcase tracks
    const mergedList: (DiscoveryBeat & { tier: number; rank?: number; juryFeedbacksList?: JudgeFeedbackItem[] })[] = [];

    // Track processed titles to prevent duplication
    const processedTitles = new Set<string>();

    // Process discovery beats first
    baseBeats.forEach((beat) => {
      processedTitles.add(beat.title.toLowerCase());

      // Look for a matching battle submission
      const matchingSub = submissions.find(
        (s) => s.beatTitle.toLowerCase() === beat.title.toLowerCase()
      );

      // Determine rank & feedbacks
      const rank = matchingSub?.rank || beat.rank;
      const juryFeedbacksList: JudgeFeedbackItem[] = [];

      if (matchingSub?.juryFeedbacks && matchingSub.juryFeedbacks.length > 0) {
        juryFeedbacksList.push(...matchingSub.juryFeedbacks);
      } else if (matchingSub?.juryFeedback) {
        juryFeedbacksList.push({
          judgeName: matchingSub.judgeName || "Judge",
          feedback: matchingSub.juryFeedback,
        });
      } else if (beat.juryFeedbacks && beat.juryFeedbacks.length > 0) {
        juryFeedbacksList.push(...beat.juryFeedbacks);
      } else if (beat.juryFeedback) {
        juryFeedbacksList.push({
          judgeName: beat.judgeName || "Judge",
          feedback: beat.juryFeedback,
        });
      }

      // Determine Tier Hierarchy:
      // Tier 1: Won battles (Rank 1 / Winner)
      // Tier 2: Top 3 (Rank 2 or 3)
      // Tier 3: Reached Jury Phase (Rank 4-15 or has Jury Feedback)
      // Tier 4: Rest in chronological order
      let tier = 4;
      if (rank === 1 || beat.tags.some((t) => t.toLowerCase().includes("winner") || t.includes("1st"))) {
        tier = 1;
      } else if (rank === 2 || rank === 3 || beat.tags.some((t) => t.includes("2nd") || t.includes("3rd") || t.includes("Top 3"))) {
        tier = 2;
      } else if ((rank && rank > 3) || juryFeedbacksList.length > 0 || beat.tags.some((t) => t.toLowerCase().includes("finalist"))) {
        tier = 3;
      }

      mergedList.push({
        ...beat,
        tier,
        rank: rank || (tier === 1 ? 1 : tier === 2 ? 2 : undefined),
        juryFeedbacksList,
        flames: matchingSub?.flameRating || beat.flames,
        battleSource: matchingSub ? "Beat Battle #5" : beat.battleSource,
      });
    });

    // Process any submissions not already in discovery beats
    submissions.forEach((sub) => {
      if (!processedTitles.has(sub.beatTitle.toLowerCase())) {
        processedTitles.add(sub.beatTitle.toLowerCase());

        const juryFeedbacksList: JudgeFeedbackItem[] = [];
        if (sub.juryFeedbacks && sub.juryFeedbacks.length > 0) {
          juryFeedbacksList.push(...sub.juryFeedbacks);
        } else if (sub.juryFeedback) {
          juryFeedbacksList.push({
            judgeName: sub.judgeName || "Judge",
            feedback: sub.juryFeedback,
          });
        }

        let tier = 4;
        if (sub.rank === 1) tier = 1;
        else if (sub.rank === 2 || sub.rank === 3) tier = 2;
        else if ((sub.rank && sub.rank > 3) || juryFeedbacksList.length > 0) tier = 3;

        mergedList.push({
          id: `sub-disc-${sub.id}`,
          title: sub.beatTitle,
          beatmaker: {
            id: producer.id,
            tag: producer.nickname,
            avatarUrl: producer.avatarUrl,
          },
          audioUrl: sub.audioUrl,
          duration: sub.duration,
          bpm: sub.bpm || 90,
          priceTag: "For Sale",
          genres: ["Boom Bap"],
          tags: [sub.rank === 1 ? "1st Place Winner" : sub.rank === 2 ? "2nd Place" : sub.rank === 3 ? "3rd Place" : "Jury Finalist"],
          flames: sub.flameRating,
          battleSource: "Beat Battle #5",
          tier,
          rank: sub.rank,
          juryFeedbacksList,
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
      // For tier 4 (or ties), sort chronological (most recent first)
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
            className="w-24 h-24 sm:w-32 sm:h-32 max-w-[128px] max-h-[128px] rounded-full overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl"
            style={{ width: "128px", height: "128px", position: "relative" }}
          >
            <Image
              src={producer.avatarUrl}
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

              {/* Discord Badges */}
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

        {/* STATS STRIP & SOCIAL CHANNELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#222222]">
          
          {/* Battle Stats */}
          <div className="flex items-center gap-8 text-xs">
            <div>
              <span className="text-[#888888] uppercase block text-xs tracking-wider font-semibold">Battles</span>
              <span className="text-lg font-bold text-white">{producer.stats?.battlesEntered || 0}</span>
            </div>

            <div>
              <span className="text-[#888888] uppercase block text-xs tracking-wider font-semibold">Victories</span>
              <span className="text-lg font-bold text-[#FF5E3A] block">
                {producer.stats?.battlesWon || 0}
              </span>
            </div>

            <div>
              <span className="text-[#888888] uppercase block text-xs tracking-wider font-semibold">Total Flames</span>
              <span className="text-lg font-bold text-[#FF5E3A] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{producer.stats?.totalFlames || 0}</span>
              </span>
            </div>
          </div>

          {/* Social Links Row */}
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 text-xs">
            {producer.links?.instagram && (
              <a
                href={producer.links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#1E1E1E] text-[#D1D1D1] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>Instagram</span>
                <ExternalLink className="w-3 h-3 text-[#666666]" />
              </a>
            )}

            {producer.links?.beatstars && (
              <a
                href={producer.links.beatstars}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#1E1E1E] text-[#D1D1D1] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>BeatStars</span>
                <ExternalLink className="w-3 h-3 text-[#666666]" />
              </a>
            )}

            {producer.links?.spotify && (
              <a
                href={producer.links.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#1E1E1E] text-[#D1D1D1] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>Spotify</span>
                <ExternalLink className="w-3 h-3 text-[#666666]" />
              </a>
            )}

            {producer.links?.soundcloud && (
              <a
                href={producer.links.soundcloud}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-full bg-[#121212] hover:bg-[#1E1E1E] text-[#D1D1D1] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>SoundCloud</span>
                <ExternalLink className="w-3 h-3 text-[#666666]" />
              </a>
            )}
          </div>

        </div>
      </div>

      {/* SECTION 2: UNIFIED PRIORITIZED BEATS DISCOGRAPHY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>Beats Showcase</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#181818] text-xs text-[#888888]">
              {prioritizedBeats.length} Tracks
            </span>
          </h2>
        </div>

        {prioritizedBeats.length > 0 ? (
          <div className="space-y-3.5">
            {prioritizedBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md"
              >
                {/* Row 1: Header (Title, Placement Badge, BPM, License Pill, Flames) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Beat Title + Battle Placement Pill */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                      {beat.title}
                    </h3>

                    {/* Tier 1: Winner Badge */}
                    {beat.tier === 1 && (
                      <span className="px-3 py-1 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>1st Place</span>
                      </span>
                    )}

                    {/* Tier 2: Top 3 Badges */}
                    {beat.tier === 2 && (
                      <span className="px-3 py-1 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-bold flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>{beat.rank === 2 ? "2nd Place" : "3rd Place"}</span>
                      </span>
                    )}

                    {/* Tier 3: Jury Finalist Badge */}
                    {beat.tier === 3 && (
                      <span className="px-3 py-1 rounded-full bg-[#7B61FF]/15 text-[#7B61FF] text-xs font-bold flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Finalist</span>
                      </span>
                    )}

                    {beat.battleSource && (
                      <span className="text-xs text-[#888888]">
                        • {beat.battleSource}
                      </span>
                    )}
                  </div>

                  {/* Right: Meta Badges (BPM, Price, Flames) */}
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

                    <div className="flex items-center gap-1 text-xs sm:text-sm text-[#FF5E3A] font-bold px-2">
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{beat.flames ? beat.flames.toFixed(2) : "3.00"}</span>
                    </div>
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

                {/* Row 3: Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                  {beat.genres?.map((g) => (
                    <span key={g} className="px-3.5 py-1.5 rounded-full bg-[#121212] text-[#888888] font-medium">
                      {g}
                    </span>
                  ))}
                  {beat.tags.filter((t) => !t.toLowerCase().includes("winner") && !t.includes("Place") && !t.includes("Finalist")).map((t) => (
                    <span key={t} className="px-3.5 py-1.5 rounded-full bg-[#121212] text-[#777777] font-medium">
                      {t}
                    </span>
                  ))}
                </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#181818] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            
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
