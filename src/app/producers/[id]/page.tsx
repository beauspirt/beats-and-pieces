"use client";

import React, { useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleProducers, sampleDiscoveryBeats, sampleSubmissions, sampleCompetitions } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { 
  ArrowLeft, Flame, Trophy, Award, Mail, ExternalLink, 
  CheckCircle2, Copy, Sparkles, MapPin, Calendar, Star
} from "lucide-react";

export default function ProducerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const producer = sampleProducers[resolvedParams.id] || sampleProducers["usr-ortega"];

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // Find all beats uploaded by this producer
  const producerBeats = sampleDiscoveryBeats.filter(
    (b) => b.beatmaker.tag.toLowerCase() === producer.nickname.toLowerCase() || b.beatmaker.id === producer.id
  );

  // Find all battle submissions by this producer
  const producerSubmissions = sampleSubmissions.filter(
    (s) => s.beatmakerTag.toLowerCase() === producer.nickname.toLowerCase() || s.userId === producer.id
  );

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(producer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/beats"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#888888] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Beats Discovery</span>
        </Link>
      </div>

      {/* SECTION 1: PRODUCER SHOWCASE HERO (Flat #181818 card) */}
      <div className="bg-[#181818] rounded-2xl p-6 sm:p-10 space-y-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          
          {/* Large Avatar */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl border-2 border-[#262626]">
            <Image
              src={producer.avatarUrl}
              alt={producer.nickname}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Producer Info & Bio */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {producer.nickname}
              </h1>

              {/* Verified Discord Role Badges */}
              {producer.discordRoles?.map((role) => (
                <span
                  key={role}
                  className={`px-3 py-1 rounded-full text-xs font-semibold font-mono ${
                    role.includes("Winner")
                      ? "bg-[#251E14] text-[#E5A93C]"
                      : role.includes("Admin")
                      ? "bg-[#7B61FF]/20 text-[#7B61FF]"
                      : "bg-[#1E232A] text-[#94A3B8]"
                  }`}
                >
                  {role}
                </span>
              ))}
            </div>

            <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed max-w-2xl font-normal">
              {producer.bio}
            </p>

            <div className="flex flex-wrap items-center gap-5 text-xs text-[#888888] pt-1">
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
              className="px-8 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Contact / License</span>
            </button>
          </div>

        </div>

        {/* STATS STRIP & SOCIAL CHANNELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#242424]">
          
          {/* Battle Stats */}
          <div className="flex items-center gap-8 text-xs font-mono">
            <div>
              <span className="text-[#888888] uppercase block text-[10px] tracking-wider">Battles</span>
              <span className="text-xl font-bold text-white">{producer.stats?.battlesEntered || 0}</span>
            </div>

            <div>
              <span className="text-[#888888] uppercase block text-[10px] tracking-wider">Victories</span>
              <span className="text-xl font-bold text-[#E5A93C]">{producer.stats?.battlesWon || 0} 🏆</span>
            </div>

            <div>
              <span className="text-[#888888] uppercase block text-[10px] tracking-wider">Total Flames</span>
              <span className="text-xl font-bold text-[#FF5E3A] flex items-center gap-1">
                <Flame className="w-4 h-4 fill-current" />
                {producer.stats?.totalFlames || 0}
              </span>
            </div>
          </div>

          {/* Social Links Row */}
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 text-xs">
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

      {/* SECTION 2: PRODUCER'S BEATS SHOWCASE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Beats Showcase</span>
            <span className="px-2 py-0.5 rounded-full bg-[#181818] text-xs text-[#888888] font-mono">
              {producerBeats.length} Tracks
            </span>
          </h2>
        </div>

        {producerBeats.length > 0 ? (
          <div className="space-y-3.5">
            {producerBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-[#181818] rounded-2xl p-5 space-y-3 hover:bg-[#1C1C1C] transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-6">
                  
                  {/* Beat Info */}
                  <div className="min-w-[220px]">
                    <h3 className="text-base font-bold text-white">{beat.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-[#888888] mt-1">
                      <span className="font-mono">{beat.bpm} BPM</span>
                      <span>•</span>
                      <span className="text-[#7B61FF] font-medium">{beat.battleSource || "Uploaded Beat"}</span>
                    </div>
                  </div>

                  {/* Waveform Scrubber */}
                  <div className="flex-1 hidden sm:block">
                    <AudioWaveformPlayer
                      id={`prod-beat-${beat.id}`}
                      title={beat.title}
                      audioUrl={beat.audioUrl}
                      duration={beat.duration}
                      bpm={beat.bpm}
                      compact={true}
                    />
                  </div>

                  {/* Rating & Action */}
                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                    <div className="flex items-center gap-1 text-[#FF5E3A] font-bold">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{beat.flames ? beat.flames.toFixed(2) : "N/A"}</span>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-[#121212] text-[#888888] text-xs">
                      {beat.priceTag || "For Sale"}
                    </span>
                  </div>

                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {beat.genres.map((g) => (
                    <span key={g} className="px-3 py-1 rounded-full bg-[#121212] text-[#888888]">
                      {g}
                    </span>
                  ))}
                  {beat.tags.map((t) => (
                    <span
                      key={t}
                      className={`px-3 py-1 rounded-full ${
                        t.includes("Winner")
                          ? "bg-[#251E14] text-[#E5A93C]"
                          : "bg-[#121212] text-[#888888]"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#181818] rounded-2xl p-8 text-center text-xs text-[#888888]">
            No public beats uploaded yet.
          </div>
        )}
      </div>

      {/* SECTION 3: BATTLE TROPHY CASE & COMPETITION HISTORY */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#E5A93C]" />
            <span>Battle Entries & Trophy Case</span>
          </h2>
        </div>

        {producerSubmissions.length > 0 ? (
          <div className="space-y-3.5">
            {producerSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-[#181818] rounded-2xl p-5 space-y-3 hover:bg-[#1C1C1C] transition-all"
              >
                <div className="flex items-center justify-between gap-6">
                  
                  {/* Rank Badge + Submission Title */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    {sub.rank === 1 ? (
                      <span className="px-3 py-1.5 rounded-full bg-[#251E14] text-[#E5A93C] text-xs font-mono font-bold">
                        1st Place
                      </span>
                    ) : sub.rank === 2 ? (
                      <span className="px-3 py-1.5 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-mono font-bold">
                        2nd Place
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-full bg-[#121212] text-[#888888] text-xs font-mono font-bold">
                        Top Finalist
                      </span>
                    )}

                    <div>
                      <h3 className="text-base font-bold text-white">{sub.beatTitle}</h3>
                      <Link
                        href={`/battles/${sub.battleId}`}
                        className="text-xs text-[#7B61FF] hover:underline block mt-0.5"
                      >
                        Beat Battle #5 Entry
                      </Link>
                    </div>
                  </div>

                  {/* Waveform Scrubber */}
                  <div className="flex-1 hidden sm:block">
                    <AudioWaveformPlayer
                      id={`trophy-${sub.id}`}
                      title={sub.beatTitle}
                      audioUrl={sub.audioUrl}
                      duration={sub.duration}
                      compact={true}
                    />
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-5 shrink-0 font-mono text-xs font-bold">
                    <div className="flex items-center gap-1 text-[#FF5E3A]">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{sub.flameRating?.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[#7B61FF]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{sub.juryScore?.toFixed(2)}</span>
                    </div>
                  </div>

                </div>

                {/* Judge Feedback Snippet */}
                {sub.juryFeedback && (
                  <p className="text-xs text-[#888888] italic pt-1 border-t border-[#222222]/50">
                    "{sub.juryFeedback}" — <span className="text-[#7B61FF] not-italic font-semibold">Jury Note</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#181818] rounded-2xl p-8 text-center text-xs text-[#888888]">
            No competition entries recorded yet.
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
                className="w-8 h-8 rounded-full bg-[#121212] text-[#888888] hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A0A0A0] leading-relaxed">
              Inquire about exclusive beat licenses, custom production, mixing, or collaborations directly via verified contact channels:
            </p>

            {/* Email Box with Copy */}
            <div className="bg-[#121212] rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[10px] font-mono text-[#777777] uppercase block">Direct Email</span>
                <span className="text-xs font-mono text-white select-all">{producer.email}</span>
              </div>

              <button
                onClick={handleCopyEmail}
                className="px-3.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#7B61FF] text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
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

            {/* Social Buttons */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-mono text-[#888888] uppercase block">Social Profiles</span>
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

                {producer.links?.spotify && (
                  <a
                    href={producer.links.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-xs font-semibold text-white flex items-center justify-between transition-colors"
                  >
                    <span>Spotify</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </a>
                )}

                {producer.links?.soundcloud && (
                  <a
                    href={producer.links.soundcloud}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-[#121212] hover:bg-[#1E1E1E] text-xs font-semibold text-white flex items-center justify-between transition-colors"
                  >
                    <span>SoundCloud</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#666666]" />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-3 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-white text-xs font-bold transition-colors"
            >
              Close
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
