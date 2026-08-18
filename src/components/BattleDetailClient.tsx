"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  sampleCompetitions,
  sampleSubmissions,
  sampleProducers,
} from "@/lib/mock-data";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";
import {
  ArrowLeft, Download, Upload, CheckCircle2,
  Lock, ShieldCheck, Flame, Star, Disc, Trophy, Award, Check
} from "lucide-react";
import confetti from "canvas-confetti";
import { submitRating } from "@/lib/api";
import { BattlePhase } from "@/lib/types";

export function BattleDetailClient({ battleId }: { battleId: string }) {
  const battle = sampleCompetitions.find((c) => c.id === battleId) || sampleCompetitions[0];
  const [activeTab, setActiveTab] = useState<BattlePhase>(battle.phase);

  // Current logged in user simulation (Judge / Producer)
  const currentUser = sampleProducers["usr-nerub"];

  // Stage 1: Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [myEntry, setMyEntry] = useState<{
    id: string;
    title: string;
    audioUrl: string;
    duration: number;
    bpm: number;
    submittedAt: string;
  } | null>(null);

  // Stage 2: Rating state (Track ratings)
  const [ratings, setRatings] = useState<Record<string, number>>({
    "blind-01": 5,
    "blind-02": 4,
    "blind-03": 4,
  });

  // Stage 3: Clean Single-Score Jury evaluation state (1.00 - 5.00)
  const [juryScores, setJuryScores] = useState<Record<string, number>>({
    "sub-1": 4.89,
    "sub-2": 4.75,
    "sub-3": 4.60,
    "sub-4": 4.55,
    "sub-5": 4.52,
    "sub-6": 4.48,
    "sub-7": 4.45,
    "sub-8": 4.30,
    "sub-9": 4.22,
    "sub-10": 4.16,
    "sub-11": 4.10,
    "sub-12": 4.05,
    "sub-13": 4.00,
    "sub-14": 3.95,
    "sub-15": 3.90,
  });

  const [juryFeedback, setJuryFeedback] = useState<Record<string, string>>({
    "sub-1": "Flawless drum swing and incredible tape warmth on the horns. Instant favorite.",
    "sub-2": "Heavy bassline and great texture on the snare. Very clean mix.",
    "sub-3": "Super creative chop technique on the main loop.",
  });
  
  const [jurySaved, setJurySaved] = useState<Record<string, boolean>>({});
  const [hasPublishedBallot, setHasPublishedBallot] = useState(false);

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
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: "/audio/05 Nerub - Butterflies in my lungs.wav",
        duration: 124,
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
    }, 2000);
  };

  const handlePublishJuryBallot = () => {
    setHasPublishedBallot(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      alert("All Judge Ballots are now Published! Advancing battle to Results.");
      setActiveTab("completed");
    }, 1200);
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === p
                  ? "bg-[#7B61FF] text-white shadow-sm"
                  : "text-[#888888] hover:text-white hover:bg-[#222222]"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-[#181818] rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden border border-[#222222]">
        
        {/* Cover Art Thumbnail (explicit width/height constraints) */}
        <div
          className="w-full md:w-64 h-64 max-w-[256px] max-h-[256px] rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl"
          style={{ width: "256px", height: "256px", position: "relative" }}
        >
          <Image
            src={battle.coverImage}
            alt={battle.title}
            width={256}
            height={256}
            className="w-full h-full object-cover"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            priority
          />
          <div
            className="absolute top-3 left-3 bg-[#121212]/85 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black text-[#FF5E3A]"
            style={{ position: "absolute", top: "12px", left: "12px" }}
          >
            #{battle.number}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              activeTab === "submission" ? "bg-[#7B61FF] text-white" :
              activeTab === "rating" ? "bg-[#FF5E3A] text-white" :
              activeTab === "judging" ? "bg-[#7B61FF]/30 text-[#7B61FF]" : "bg-[#222222] text-[#888888]"
            }`}>
              {activeTab === "submission" && "Stage 1: Submissions Open"}
              {activeTab === "rating" && "Stage 2: Public Preselection"}
              {activeTab === "judging" && "Stage 3: Jury Evaluation"}
              {activeTab === "completed" && "Stage 4: Battle Results"}
            </span>

            <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs text-[#A0A0A0] font-mono">
              {battle.totalSubmissions} Total Entries
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {battle.title}
          </h1>

          <div className="space-y-1 text-sm text-[#A0A0A0]">
            <p>Hosted by: <span className="text-white font-medium">{battle.hosts.join(", ")}</span></p>
            <p>Judged by: <span className="text-white font-medium">{battle.judges.join(", ")}</span></p>
          </div>

          <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed">
            {battle.description}
          </p>

          {/* SINGLE COLUMN PRIZES SECTION */}
          <div className="pt-4 border-t border-[#262626] space-y-2">
            <span className="text-xs font-mono text-[#888888] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-[#E5A93C]" />
              <span>Battle Prizes</span>
            </span>

            <div className="flex flex-col gap-2 max-w-xl">
              <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#251E14] text-[#E5A93C] text-xs sm:text-sm font-medium">
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#382B1B] text-[#E5A93C] text-xs">
                  1st
                </span>
                <span>{battle.prizes.first}</span>
              </div>

              <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#1E232A] text-[#94A3B8] text-xs sm:text-sm font-medium">
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#2A3441] text-[#94A3B8] text-xs">
                  2nd
                </span>
                <span>{battle.prizes.second}</span>
              </div>

              <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#261814] text-[#D97706] text-xs sm:text-sm font-medium">
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-[#3D251D] text-[#D97706] text-xs">
                  3rd
                </span>
                <span>{battle.prizes.third}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: SUBMISSIONS & SAMPLE PACK */}
      {/* ========================================================================= */}
      {activeTab === "submission" && (
        <div className="space-y-6">
          {/* Sample Pack & Rules */}
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#262626]">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Disc className="w-5 h-5 text-[#7B61FF]" />
                  <span>Official Sample Pack & Stems</span>
                </h3>
                <p className="text-sm text-[#888888] mt-1">
                  Download the official archive. You must use at least 1 provided sample in your beat.
                </p>
              </div>

              <a
                href={battle.samples[0]?.audioUrl || "/sample-packs/battle-5-samples.zip"}
                download
                className="px-6 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all w-fit"
              >
                <Download className="w-4 h-4" />
                <span>Download Sample Pack (ZIP)</span>
              </a>
            </div>

            {/* Embedded Sample Waveform Previews */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#888888] uppercase tracking-wider">
                Sample Previews Included in Pack
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {battle.samples.map((sample) => (
                  <div key={sample.id} className="bg-[#121212] p-4 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-white block truncate">{sample.title}</span>
                    <AudioWaveformPlayer
                      id={`sample-${sample.id}`}
                      title={sample.title}
                      audioUrl={sample.audioUrl}
                      duration={sample.duration}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Rules Checklist */}
            <div className="pt-4 border-t border-[#262626] space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#888888] uppercase tracking-wider">
                Competition Rules & Limits
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#D1D1D1]">
                <li className="flex items-center gap-2 bg-[#121212] p-3 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-[#7B61FF]" />
                  <span>Max 1 submission per producer</span>
                </li>
                <li className="flex items-center gap-2 bg-[#121212] p-3 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-[#7B61FF]" />
                  <span>Max length: 3 minutes 30 seconds</span>
                </li>
                <li className="flex items-center gap-2 bg-[#121212] p-3 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-[#7B61FF]" />
                  <span>Format: 24/32-bit Master WAV</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Submission Dropzone */}
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#FF5E3A]" />
              <span>Submit Your Master WAV</span>
            </h3>

            {!myEntry ? (
              <label className="border-2 border-dashed border-[#333333] hover:border-[#7B61FF] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-[#121212]/50 hover:bg-[#121212] transition-all group">
                <input
                  type="file"
                  accept="audio/wav"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center group-hover:scale-110 transition-transform">
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-[#7B61FF]" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">
                    {isUploading ? "Uploading & Analyzing Audio..." : "Click to select or drag your WAV entry here"}
                  </p>
                  <p className="text-xs text-[#888888] mt-1">Uncompressed 16/24/32-bit WAV up to 100MB</p>
                </div>
              </label>
            ) : (
              <div className="bg-[#121212] p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submission Received & Locked</span>
                  </div>
                  <span className="text-xs font-mono text-[#888888]">
                    {new Date(myEntry.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white font-bold text-base">{myEntry.title}</p>
                <AudioWaveformPlayer
                  id={myEntry.id}
                  title={myEntry.title}
                  audioUrl={myEntry.audioUrl}
                  duration={myEntry.duration}
                  bpm={myEntry.bpm}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: PUBLIC RATING (BLIND PRESELECTION) */}
      {/* ========================================================================= */}
      {activeTab === "rating" && (
        <div className="space-y-6">
          
          {/* Anti-Bias Ballot Header */}
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#FF5E3A]" />
                  <span>Blind Community Preselection Queue</span>
                </h3>
                <p className="text-sm text-[#888888] mt-1">
                  Producer names and cover art are completely anonymized to ensure 100% fair, unbiased listening.
                </p>
              </div>

              {/* Qualified Ballot Status Pill */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                  isBallotQualified
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-[#251E14] text-[#E5A93C] border border-[#E5A93C]/30"
                }`}>
                  {isBallotQualified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ballot Qualified (Counted)</span>
                    </>
                  ) : (
                    <>
                      <span>Unqualified Ballot ({currentVotesCount}/{requiredVotes} required)</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Ballot Progress Bar (50% Threshold) */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-mono text-[#888888]">
                <span>Ballot Completion (Min 50% = {requiredVotes} beats required)</span>
                <span>{currentVotesCount} / {requiredVotes} Rated</span>
              </div>
              <div className="w-full h-2 bg-[#121212] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isBallotQualified ? "bg-emerald-500" : "bg-[#FF5E3A]"
                  }`}
                  style={{ width: `${Math.min(100, (currentVotesCount / requiredVotes) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Anonymized Blind Track List */}
          <div className="space-y-3.5">
            {blindTracks.map((track, idx) => {
              const isUnlocked = isTrackUnlocked(idx);
              const trackFlame = ratings[track.id] || 0;

              return (
                <div
                  key={track.id}
                  className={`bg-[#181818] rounded-2xl p-5 space-y-3.5 transition-all ${
                    !isUnlocked ? "opacity-40 grayscale pointer-events-none" : "hover:bg-[#1C1C1C]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#121212] font-mono text-xs font-bold text-[#888888] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white text-base">{track.placeholder}</span>
                    </div>

                    {/* Flame Rating Buttons */}
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((flame) => (
                        <button
                          key={flame}
                          onClick={() => handleRateBeat(track.id, flame)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            trackFlame >= flame
                              ? "bg-[#FF5E3A] text-white scale-105 shadow-md shadow-[#FF5E3A]/20"
                              : "bg-[#121212] text-[#444444] hover:text-[#FF5E3A] hover:bg-[#1E1E1E]"
                          }`}
                        >
                          <Flame className="w-4 h-4 fill-current" />
                        </button>
                      ))}
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
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: BLIND JURY EVALUATION (ANONYMIZED FINALISTS FOR FAIR JUDGING) */}
      {/* ========================================================================= */}
      {activeTab === "judging" && (
        <div className="space-y-6">
          
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5 border border-[#262626]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#7B61FF]" />
                  <span>Jury Evaluation Portal - Top 15 Finalists</span>
                </h3>
                <p className="text-sm text-[#888888] mt-1">
                  Logged in as Judge (<span className="text-white font-medium">{currentUser.nickname}</span>). All entries are anonymized to ensure fair evaluation. Submit your score (1.00 - 5.00).
                </p>
              </div>

              <button
                onClick={handlePublishJuryBallot}
                className="px-6 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs shadow-lg active:scale-95 transition-all whitespace-nowrap flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Publish Final Results</span>
              </button>
            </div>

            {/* Assigned Judges Publication Tracker */}
            <div className="pt-4 border-t border-[#262626] space-y-3">
              <div className="flex justify-between text-xs font-mono text-[#888888]">
                <span>Assigned Judge Ballots (2 of 3 Published)</span>
                <span>Results unlock automatically when all judges publish</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#121212] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white">Nerub (Host)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Published ✓
                  </span>
                </div>

                <div className="bg-[#121212] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white">Ortega (Judge)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Published ✓
                  </span>
                </div>

                <div className="bg-[#121212] p-3.5 rounded-xl flex items-center justify-between border border-[#7B61FF]/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#E5A93C] animate-pulse" />
                    <span className="text-xs font-bold text-white">Guest Judge (You)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#251E14] text-[#E5A93C]">
                    {hasPublishedBallot ? "Published ✓" : "In Progress"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Anonymized Finalists list (Top 15 Blind) */}
          <div className="space-y-3.5">
            {sampleSubmissions.slice(0, 15).map((sub, idx) => {
              const currentScore = juryScores[sub.id] || sub.juryScore || 4.0;
              const isSaved = jurySaved[sub.id];
              const blindTitle = `Finalist ${idx < 9 ? "0" + (idx + 1) : idx + 1}`;

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
                        {/* Blind Finalist Title (No artist/beat name) */}
                        <h4 className="font-bold text-white text-base">{blindTitle}</h4>
                        <span className="text-xs text-[#888888] font-mono">Blind Finalist Entry</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-sm text-[#FF5E3A] font-bold">
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{sub.flameRating?.toFixed(2)}</span>
                    </div>
                  </div>

                  <AudioWaveformPlayer
                    id={`jury-${sub.id}`}
                    title={blindTitle}
                    audioUrl={sub.audioUrl}
                    duration={sub.duration}
                    bpm={sub.bpm}
                    compact={true}
                  />

                  {/* Inline Clean Score & Feedback */}
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
                        placeholder="Feedback note for the producer..."
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
      {/* STAGE 4: RESULTS & LEADERBOARD (FULL 15 BEATS WITH JUDGE NAME FEEDBACK) */}
      {/* ========================================================================= */}
      {activeTab === "completed" && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white">Leaderboard & Rankings (Top 15)</h3>
            <div className="flex items-center gap-5 text-sm font-mono text-[#888888]">
              <span className="flex items-center gap-1.5 text-[#FF5E3A] font-bold">
                <Flame className="w-4 h-4 fill-current" /> Community
              </span>
              <span className="flex items-center gap-1.5 text-[#7B61FF] font-bold">
                <Star className="w-4 h-4 fill-current" /> Jury Score
              </span>
            </div>
          </div>

          {/* Leaderboard Cards with 15 Beats */}
          <div className="space-y-3.5">
            {sampleSubmissions.slice(0, 15).map((sub, idx) => {
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;
              const judgeName = sub.judgeName || "Judge";

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-5 space-y-3.5 hover:bg-[#1C1C1C] transition-all border border-[#222222]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Rank Badge + Producer Info */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                      {isTop1 ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#251E14] text-[#E5A93C] text-xs font-mono font-bold">
                          1st Place Winner 🏆
                        </span>
                      ) : isTop2 ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-mono font-bold">
                          2nd Place
                        </span>
                      ) : isTop3 ? (
                        <span className="px-3.5 py-1.5 rounded-full bg-[#261814] text-[#D97706] text-xs font-mono font-bold">
                          3rd Place
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

                  {/* Waveform Scrubber with real audio */}
                  <AudioWaveformPlayer
                    id={`res-${sub.id}`}
                    title={sub.beatTitle}
                    audioUrl={sub.audioUrl}
                    duration={sub.duration}
                    bpm={sub.bpm}
                    compact={true}
                  />

                  {/* Clean Judge Feedback Box with Judge Name */}
                  {sub.juryFeedback && (
                    <div className="bg-[#121212] px-4 py-2.5 rounded-xl text-xs text-[#D1D1D1] italic">
                      "{sub.juryFeedback}" - <span className="text-[#888888] not-italic font-semibold font-mono">{judgeName}</span>
                    </div>
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
