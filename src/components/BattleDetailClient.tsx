"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { sampleCompetitions, sampleSubmissions, currentUser } from "@/lib/mock-data";
import { AudioWaveformPlayer } from "@/components/AudioWaveformPlayer";
import { FlameRating } from "@/components/FlameRating";
import { BattlePhase, BattleSubmission } from "@/lib/types";
import { 
  ArrowLeft, Upload, Trash2, Edit3, CheckCircle2, 
  Lock, ShieldCheck, Flame, Star, Disc, Trophy, Award
} from "lucide-react";
import confetti from "canvas-confetti";
import { submitRating } from "@/lib/api";

export function BattleDetailClient({ battleId }: { battleId: string }) {
  const battle = sampleCompetitions.find((c) => c.id === battleId) || sampleCompetitions[0];

  const [activeTab, setActiveTab] = useState<BattlePhase>(battle.phase);
  
  const [myEntry, setMyEntry] = useState<BattleSubmission | null>(null);
  const [beatTitleInput, setBeatTitleInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [ratings, setRatings] = useState<Record<string, number>>({
    "blind-01": 4,
    "blind-02": 4,
    "blind-03": 3,
  });

  const [juryScores, setJuryScores] = useState<Record<string, number>>({
    "sub-1": 4.89,
    "sub-2": 4.75,
    "sub-3": 4.60,
  });
  const [juryFeedback, setJuryFeedback] = useState<Record<string, string>>({});
  const [jurySaved, setJurySaved] = useState<Record<string, boolean>>({});

  // Dynamic Percentage-based Ballot Validation (min 50% of total entries)
  const minPercentage = 50;
  const requiredVotes = Math.ceil(battle.totalSubmissions * (minPercentage / 100));
  const currentVotesCount = Object.keys(ratings).length;
  const isBallotQualified = currentVotesCount >= requiredVotes;

  // Anonymized track queue with exact full original durations
  const blindTracks = [
    { id: "blind-01", placeholder: "Beat 01", bpm: 92, audioUrl: "/audio/01 Ortega - Bonita Applebong.wav", duration: 67 },
    { id: "blind-02", placeholder: "Beat 02", bpm: 88, audioUrl: "/audio/02 C.S.T - ThunderClouds.wav", duration: 119 },
    { id: "blind-03", placeholder: "Beat 03", bpm: 90, audioUrl: "/audio/03 flg - bule temporale.wav", duration: 201 },
    { id: "blind-04", placeholder: "Beat 04", bpm: 94, audioUrl: "/audio/04 Egris - Triburi.wav", duration: 104 },
    { id: "blind-05", placeholder: "Beat 05", bpm: 86, audioUrl: "/audio/05 Nerub - Butterflies in my lungs.wav", duration: 124 },
    { id: "blind-06", placeholder: "Beat 06", bpm: 91, audioUrl: "/audio/06 DFB - Apollo's Lyre.wav", duration: 87 },
    { id: "blind-07", placeholder: "Beat 07", bpm: 93, audioUrl: "/audio/07 Ripp - Beyond.wav", duration: 130 },
    { id: "blind-08", placeholder: "Beat 08", bpm: 89, audioUrl: "/audio/08 Mr Tweaks - Dmzl 4.wav", duration: 136 },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setTimeout(() => {
      setMyEntry({
        id: "sub-user-entry",
        battleId: battle.id,
        userId: currentUser.id,
        beatmakerTag: currentUser.nickname,
        beatTitle: beatTitleInput || file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: "/audio/05 Nerub - Butterflies in my lungs.wav",
        duration: 38,
        bpm: 90,
        submittedAt: new Date().toISOString(),
      });
      setIsUploading(false);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }, 1000);
  };

  const handleRateBeat = async (trackId: string, flames: number) => {
    setRatings((prev) => ({ ...prev, [trackId]: flames }));
    await submitRating(trackId, battle.id, flames);
  };

  const handleSaveJuryScore = (subId: string) => {
    setJurySaved((prev) => ({ ...prev, [subId]: true }));
    setTimeout(() => {
      setJurySaved((prev) => ({ ...prev, [subId]: false }));
    }, 2500);
  };

  const isTrackUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevTrack = blindTracks[index - 1];
    return !!ratings[prevTrack.id];
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb & Phase Demo Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/battles"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#888888] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Competitions</span>
        </Link>

        {/* Phase Switcher Simulation */}
        <div className="flex items-center gap-2 bg-[#181818] p-1.5 rounded-xl">
          <span className="text-xs font-mono text-[#888888] uppercase px-2">Phase Demo:</span>
          {(["submission", "rating", "judging", "completed"] as BattlePhase[]).map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                activeTab === p
                  ? "bg-[#7B61FF] text-white shadow"
                  : "text-[#888888] hover:text-white"
              }`}
            >
              {p === "completed" ? "Results" : p}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: COMPETITION OVERVIEW CARD */}
      <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start gap-8">
          
          {/* Cover Art - Identical w-64 h-64 */}
          <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl">
            <Image
              src={battle.coverImage}
              alt={battle.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-3 left-3 bg-[#121212]/85 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-[#FF5E3A]">
              #{battle.number}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3.5 py-1.5 rounded-full bg-[#7B61FF] text-white text-xs font-semibold">
                Beat Battle #{battle.number}
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs text-[#888888] font-mono">
                {battle.totalSubmissions} Entries
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {battle.title}
            </h1>

            <div className="space-y-1 text-sm text-[#A0A0A0]">
              <p>Hosted by: <span className="text-white font-medium">{battle.hosts.join(", ")}</span></p>
              <p>Judged by: <span className="text-white font-medium">{battle.judges.join(", ")}</span></p>
            </div>

            <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed pt-1">
              {battle.description}
            </p>
          </div>
        </div>

        {/* PRIZES & SAMPLE PACK SECTION (SINGLE COLUMN PRIZES) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[#262626]">
          
          {/* SINGLE COLUMN PRIZES */}
          <div className="space-y-3">
            <span className="text-xs font-mono text-[#888888] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#E5A93C]" />
              <span>Competition Prizes</span>
            </span>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#251E14] text-[#E5A93C] text-sm font-medium">
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#382B1B] text-[#E5A93C] text-xs">
                  1st
                </span>
                <span>{battle.prizes.first}</span>
              </div>

              <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#1E232A] text-[#94A3B8] text-sm font-medium">
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#2A313C] text-[#94A3B8] text-xs">
                  2nd
                </span>
                <span>{battle.prizes.second}</span>
              </div>

              <div className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-[#261814] text-[#D97706] text-sm font-medium">
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#3B251F] text-[#D97706] text-xs">
                  3rd
                </span>
                <span>{battle.prizes.third}</span>
              </div>
            </div>
          </div>

          {/* Sample Pack Downloaders */}
          {battle.samples.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-[#888888] font-bold uppercase tracking-wider block">
                Sample Pack (WAVs)
              </span>
              <div className="space-y-2">
                {battle.samples.map((sample) => (
                  <div
                    key={sample.id}
                    className="bg-[#121212] rounded-xl p-3 flex items-center gap-3"
                  >
                    <AudioWaveformPlayer
                      id={sample.id}
                      title={sample.title}
                      audioUrl={sample.audioUrl}
                      duration={sample.duration}
                      showDownload={true}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* SECTION 2: PHASE NAVIGATION TABS */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {[
          { id: "submission", label: "1. Submissions", icon: Disc },
          { id: "rating", label: "2. Public Preselection", icon: Flame },
          { id: "judging", label: "3. Jury Finalists", icon: Trophy },
          { id: "completed", label: "4. Results", icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as BattlePhase)}
              className={`px-5 py-3 rounded-full text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#7B61FF] text-white shadow-md"
                  : "bg-[#181818] text-[#888888] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: SUBMISSIONS */}
      {/* ========================================================================= */}
      {activeTab === "submission" && (
        <div className="space-y-4">
          {!myEntry ? (
            <div className="bg-[#181818] rounded-2xl p-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#121212] flex items-center justify-center text-[#7B61FF] mx-auto">
                <Upload className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-bold text-white">Upload your battle beat</h3>
                <p className="text-sm text-[#888888]">
                  WAV or MP3 file (up to 100MB). Flip the official sample pack!
                </p>
              </div>

              <div className="w-full max-w-md mx-auto space-y-3.5">
                <input
                  type="text"
                  placeholder="Beat Title (e.g. Dristor Flip)"
                  value={beatTitleInput}
                  onChange={(e) => setBeatTitleInput(e.target.value)}
                  className="w-full bg-[#121212] rounded-xl px-4 py-3 text-sm text-white placeholder-[#666666] focus:outline-none focus:ring-1 focus:ring-[#7B61FF] text-center"
                />

                <label className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-sm cursor-pointer transition-all shadow-md active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? "Uploading..." : "Browse Audio File"}</span>
                  <input
                    type="file"
                    accept="audio/wav,audio/mp3,audio/mpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-[#181818] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Your Submission Active</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingTitle(!isEditingTitle)}
                    className="p-2 rounded-lg bg-[#121212] text-zinc-400 hover:text-white"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete your submission?")) setMyEntry(null);
                    }}
                    className="p-2 rounded-lg bg-[#121212] text-zinc-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 pt-1">
                <div className="min-w-[240px]">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={myEntry.beatTitle}
                        onChange={(e) => setMyEntry({ ...myEntry, beatTitle: e.target.value })}
                        className="bg-[#121212] rounded px-3 py-1.5 text-sm text-white focus:outline-none"
                      />
                      <button
                        onClick={() => setIsEditingTitle(false)}
                        className="text-xs bg-[#7B61FF] text-white px-3 py-1.5 rounded"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <h4 className="font-bold text-white text-lg">{myEntry.beatTitle}</h4>
                  )}
                  <p className="text-sm text-[#7B61FF] font-semibold">{myEntry.beatmakerTag}</p>
                </div>

                <div className="flex-1">
                  <AudioWaveformPlayer
                    id={myEntry.id}
                    title={myEntry.beatTitle}
                    audioUrl={myEntry.audioUrl}
                    duration={myEntry.duration}
                    compact={true}
                  />
                </div>
              </div>

              <div className="bg-[#121212] rounded-xl p-3.5 text-center text-xs text-[#888888] flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>134 other beats entered (hidden until public preselection)</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: PUBLIC PRESELECTION */}
      {/* ========================================================================= */}
      {activeTab === "rating" && (
        <div className="space-y-4">
          
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-[#7B61FF] shrink-0 mt-0.5" />
              <div className="text-sm text-[#D1D1D1] leading-relaxed flex-1">
                <span className="font-bold text-white block mb-0.5 text-base">
                  Blind Anonymized Preselection
                </span>
                Beats are randomly shuffled with all producer tags, filenames, and metadata stripped to prevent vote brigading.
                Rate each beat with 1 to 5 flames (🔥) to unlock the next track.
              </div>
            </div>

            {/* Live Percentage Ballot Qualification Bar */}
            <div className="bg-[#121212] rounded-xl p-4 space-y-2.5 border border-[#242424]">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-mono text-[#888888]">
                  Ballot Qualification (Min {minPercentage}% of {battle.totalSubmissions} beats = {requiredVotes} required)
                </span>
                <span className={`font-mono font-bold ${isBallotQualified ? "text-emerald-400" : "text-[#FF5E3A]"}`}>
                  {currentVotesCount} / {requiredVotes} Rated ({Math.min(100, Math.round((currentVotesCount / requiredVotes) * 100))}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 rounded-full bg-[#202020] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isBallotQualified ? "bg-emerald-500" : "bg-[#7B61FF]"
                  }`}
                  style={{ width: `${Math.min(100, (currentVotesCount / requiredVotes) * 100)}%` }}
                />
              </div>

              <div className="text-xs text-[#888888] flex items-center justify-between pt-0.5">
                <span>
                  {isBallotQualified ? "✓ Your ballot is verified and will count towards the Top 10 finalists." : "⚠ Rate more tracks to validate your ballot."}
                </span>
                {isBallotQualified && (
                  <span className="text-emerald-400 font-medium font-mono">Ballot Verified ✓</span>
                )}
              </div>
            </div>
          </div>

          {/* Blind Rating Track Queue */}
          <div className="space-y-3.5">
            {blindTracks.map((track, idx) => {
              const unlocked = isTrackUnlocked(idx);
              const currentFlames = ratings[track.id] || 0;

              return (
                <div
                  key={track.id}
                  className={`bg-[#181818] rounded-2xl p-5 transition-all ${
                    unlocked ? "hover:bg-[#1C1C1C]" : "opacity-40"
                  }`}
                >
                  {unlocked ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-[#888888]">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white text-base">{track.placeholder}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-xs text-[#888888] font-mono">Rate:</span>
                          <FlameRating
                            value={currentFlames}
                            onChange={(val) => handleRateBeat(track.id, val)}
                            size="md"
                            showValue={currentFlames > 0}
                          />
                        </div>
                      </div>

                      <AudioWaveformPlayer
                        id={track.id}
                        title={track.placeholder}
                        audioUrl={track.audioUrl}
                        duration={track.duration}
                        bpm={track.bpm}
                        compact={true}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 text-xs text-[#666666]">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>{track.placeholder}</span>
                      </div>
                      <span>Rate previous beats to unlock</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: JURY FINALISTS */}
      {/* ========================================================================= */}
      {activeTab === "judging" && (
        <div className="space-y-4">
          
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#7B61FF]" />
                <span>Jury Evaluation Portal — Top 10 Finalists</span>
              </h3>
              <p className="text-sm text-[#888888] mt-1">
                Logged in as Judge (<span className="text-white font-medium">{currentUser.nickname}</span>). Listen and submit your score (1.00 – 5.00).
              </p>
            </div>

            <button
              onClick={() => {
                alert("Jury scores finalized!");
                setActiveTab("completed");
              }}
              className="px-7 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs shadow-md active:scale-95 whitespace-nowrap"
            >
              Publish Results
            </button>
          </div>

          {/* Finalists list with Clickable Producer Link */}
          <div className="space-y-3.5">
            {sampleSubmissions.slice(0, 10).map((sub, idx) => {
              const currentScore = juryScores[sub.id] || sub.juryScore || 4.0;
              const isSaved = jurySaved[sub.id];

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-5 space-y-3.5 hover:bg-[#1C1C1C] transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-lg bg-[#121212] font-mono text-xs font-bold text-[#888888] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-base">{sub.beatTitle}</h4>
                        <Link
                          href={`/producers/${sub.userId}`}
                          className="text-sm text-[#7B61FF] hover:underline font-medium"
                        >
                          {sub.beatmakerTag}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-sm text-[#FF5E3A] font-bold">
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{sub.flameRating?.toFixed(2)}</span>
                    </div>
                  </div>

                  <AudioWaveformPlayer
                    id={sub.id}
                    title={sub.beatTitle}
                    audioUrl={sub.audioUrl}
                    duration={sub.duration}
                    bpm={sub.bpm}
                    compact={true}
                  />

                  {/* Inline Score & Feedback */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1 items-center">
                    <div className="sm:col-span-4 flex items-center gap-2.5">
                      <label className="text-xs font-semibold text-[#888888]">Score:</label>
                      <input
                        type="number"
                        min="1.0"
                        max="5.0"
                        step="0.05"
                        value={currentScore}
                        onChange={(e) =>
                          setJuryScores({
                            ...juryScores,
                            [sub.id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24 bg-[#121212] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#7B61FF] focus:outline-none focus:ring-1 focus:ring-[#7B61FF] text-center"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        placeholder="Feedback note..."
                        value={juryFeedback[sub.id] || sub.juryFeedback || ""}
                        onChange={(e) =>
                          setJuryFeedback({ ...juryFeedback, [sub.id]: e.target.value })
                        }
                        className="w-full bg-[#121212] rounded-xl px-4 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <button
                        onClick={() => handleSaveJuryScore(sub.id)}
                        className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                          isSaved
                            ? "bg-emerald-600 text-white"
                            : "bg-[#121212] text-[#D1D1D1] hover:bg-[#7B61FF] hover:text-white"
                        }`}
                      >
                        {isSaved ? "Saved ✓" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: RESULTS & LEADERBOARD */}
      {/* ========================================================================= */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white">Leaderboard & Rankings</h3>
            <div className="flex items-center gap-5 text-sm font-mono text-[#888888]">
              <span className="flex items-center gap-1.5 text-[#FF5E3A] font-bold">
                <Flame className="w-4 h-4 fill-current" /> Community
              </span>
              <span className="flex items-center gap-1.5 text-[#7B61FF] font-bold">
                <Star className="w-4 h-4 fill-current" /> Jury Score
              </span>
            </div>
          </div>

          {/* Leaderboard Cards with Producer Profile Links */}
          <div className="space-y-3.5">
            {sampleSubmissions.map((sub, idx) => {
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-5 space-y-3 hover:bg-[#1C1C1C] transition-all"
                >
                  <div className="flex items-center justify-between gap-6">
                    
                    {/* Rank Badge + Producer Info */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                      {isTop1 ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#251E14] text-[#E5A93C] text-xs font-mono font-bold">
                          1st
                        </span>
                      ) : isTop2 ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-mono font-bold">
                          2nd
                        </span>
                      ) : isTop3 ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#261814] text-[#D97706] text-xs font-mono font-bold">
                          3rd
                        </span>
                      ) : (
                        <span className="w-8 text-center text-xs font-mono font-bold text-[#666666]">
                          #{idx + 1}
                        </span>
                      )}

                      <div>
                        <span className="text-xs text-[#888888] leading-tight block">{sub.beatTitle}</span>
                        <Link
                          href={`/producers/${sub.userId}`}
                          className="text-base font-bold text-white hover:text-[#7B61FF] transition-colors leading-snug"
                        >
                          {sub.beatmakerTag}
                        </Link>
                      </div>
                    </div>

                    {/* Waveform Scrubber with real audio */}
                    <div className="flex-1 hidden sm:block">
                      <AudioWaveformPlayer
                        id={`res-${sub.id}`}
                        title={sub.beatTitle}
                        audioUrl={sub.audioUrl}
                        duration={sub.duration}
                        bpm={sub.bpm}
                        compact={true}
                      />
                    </div>

                    {/* Scores */}
                    <div className="flex items-center gap-5 shrink-0 font-mono text-sm font-bold">
                      <div className="flex items-center gap-1.5 text-[#FF5E3A]">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>{sub.flameRating?.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[#7B61FF]">
                        <Star className="w-4 h-4 fill-current" />
                        <span>{sub.juryScore?.toFixed(2)}</span>
                      </div>
                    </div>

                  </div>

                  {/* Judge note */}
                  {sub.juryFeedback && (
                    <p className="text-sm text-[#A0A0A0] italic pt-1">
                      "{sub.juryFeedback}" — <span className="text-[#7B61FF] not-italic font-semibold">Jury Note</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
