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
  Lock, ShieldCheck, Flame, Star, Disc, Trophy, Award, Sliders, Check
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

  // Stage 3: Asynchronous Jury evaluation state
  const [juryCategories, setJuryCategories] = useState<Record<string, {
    originality: number;
    mix: number;
    groove: number;
    sampleFlip: number;
  }>>({
    "sub-1": { originality: 4.8, mix: 4.9, groove: 4.7, sampleFlip: 4.9 },
    "sub-2": { originality: 4.6, mix: 4.7, groove: 4.8, sampleFlip: 4.5 },
    "sub-3": { originality: 4.5, mix: 4.5, groove: 4.6, sampleFlip: 4.4 },
  });

  const [juryFeedback, setJuryFeedback] = useState<Record<string, string>>({
    "sub-1": "Incredible vinyl chop on the intro and punchy 90s snare snap. Mix is super clean.",
    "sub-2": "Atmospheric lo-fi chops with warm low-end saturation. Drums groove heavily.",
    "sub-3": "Experimental tempo switches and raw analog textures. Very unique take on the sample.",
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

  // Helper to compute weighted jury score: Originality (30%), Mix (30%), Groove (20%), Sample (20%)
  const computeCompositeScore = (subId: string): number => {
    const cats = juryCategories[subId] || { originality: 4.5, mix: 4.5, groove: 4.5, sampleFlip: 4.5 };
    const weighted = cats.originality * 0.30 + cats.mix * 0.30 + cats.groove * 0.20 + cats.sampleFlip * 0.20;
    return Math.round(weighted * 100) / 100;
  };

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

  const handleUpdateCategory = (subId: string, category: "originality" | "mix" | "groove" | "sampleFlip", val: number) => {
    setJuryCategories((prev) => {
      const current = prev[subId] || { originality: 4.5, mix: 4.5, groove: 4.5, sampleFlip: 4.5 };
      return {
        ...prev,
        [subId]: { ...current, [category]: val },
      };
    });
  };

  const handleSaveJuryDraft = (subId: string) => {
    setJurySaved((prev) => ({ ...prev, [subId]: true }));
    setTimeout(() => {
      setJurySaved((prev) => ({ ...prev, [subId]: false }));
    }, 2000);
  };

  const handlePublishJuryBallot = () => {
    setHasPublishedBallot(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      alert("All 3 Judge Ballots are now Published! Advancing battle to Results.");
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
        
        {/* Cover Art Thumbnail */}
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
              {activeTab === "judging" && "Stage 3: Asynchronous Jury Session"}
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
      {/* STAGE 3: ASYNCHRONOUS JURY EVALUATION SUITE (NO LIVESTREAMS) */}
      {/* ========================================================================= */}
      {activeTab === "judging" && (
        <div className="space-y-6">
          
          {/* Asynchronous Jury Overview & Live Ballot Progress */}
          <div className="bg-[#181818] rounded-2xl p-6 sm:p-8 space-y-5 border border-[#262626]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#7B61FF]" />
                  <span>Asynchronous Jury Evaluation Portal</span>
                </h3>
                <p className="text-sm text-[#888888] mt-1">
                  Logged in as Judge (<span className="text-white font-medium">{currentUser.nickname}</span>). Evaluate finalists across weighted criteria at your own pace.
                </p>
              </div>

              <button
                onClick={handlePublishJuryBallot}
                className="px-6 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs shadow-lg active:scale-95 transition-all whitespace-nowrap flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Publish My Final Ballot</span>
              </button>
            </div>

            {/* Assigned Judges Publication Tracker */}
            <div className="pt-4 border-t border-[#262626] space-y-3">
              <div className="flex justify-between text-xs font-mono text-[#888888]">
                <span>Assigned Judge Ballots (2 of 3 Published)</span>
                <span>Results unlock automatically when all 3 publish</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Judge 1: Nerub */}
                <div className="bg-[#121212] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white">Nerub (Host)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Published ✓
                  </span>
                </div>

                {/* Judge 2: Ortega */}
                <div className="bg-[#121212] p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-white">Ortega (Judge)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Published ✓
                  </span>
                </div>

                {/* Judge 3: Special Guest */}
                <div className="bg-[#121212] p-3.5 rounded-xl flex items-center justify-between border border-[#7B61FF]/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#E5A93C] animate-pulse" />
                    <span className="text-xs font-bold text-white">Guest Judge (You)</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#251E14] text-[#E5A93C]">
                    {hasPublishedBallot ? "Published ✓" : "In Progress (3/3 Rated)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Finalists Detailed Evaluation Cards */}
          <div className="space-y-4">
            {sampleSubmissions.slice(0, 3).map((sub, idx) => {
              const cats = juryCategories[sub.id] || { originality: 4.5, mix: 4.5, groove: 4.5, sampleFlip: 4.5 };
              const composite = computeCompositeScore(sub.id);
              const isSaved = jurySaved[sub.id];

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-6 space-y-4 border border-[#222222] hover:border-[#333333] transition-all"
                >
                  {/* Top Bar: Finalist Rank & Composite Score */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#262626]">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-lg bg-[#121212] font-mono text-xs font-bold text-[#888888] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-base">{sub.beatTitle}</h4>
                        <Link
                          href={`/producers/${sub.userId}`}
                          className="text-xs text-[#7B61FF] hover:underline font-medium"
                        >
                          by {sub.beatmakerTag}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-[#FF5E3A] font-bold bg-[#121212] px-3 py-1.5 rounded-xl">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>Public: {sub.flameRating?.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs text-[#7B61FF] font-bold bg-[#7B61FF]/15 px-3 py-1.5 rounded-xl border border-[#7B61FF]/30">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Your Score: {composite.toFixed(2)} / 5.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Audio Waveform Player */}
                  <AudioWaveformPlayer
                    id={`jury-${sub.id}`}
                    title={sub.beatTitle}
                    audioUrl={sub.audioUrl}
                    duration={sub.duration}
                    bpm={sub.bpm}
                    compact={true}
                  />

                  {/* Multi-Criteria Scoring Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#121212] p-4 rounded-xl">
                    {/* 1. Originality (30%) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#888888] font-medium">Originality (30%)</span>
                        <span className="font-mono font-bold text-white">{cats.originality.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={cats.originality}
                        onChange={(e) => handleUpdateCategory(sub.id, "originality", parseFloat(e.target.value))}
                        className="w-full accent-[#7B61FF] cursor-pointer"
                      />
                    </div>

                    {/* 2. Mix Quality (30%) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#888888] font-medium">Mix & Sound (30%)</span>
                        <span className="font-mono font-bold text-white">{cats.mix.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={cats.mix}
                        onChange={(e) => handleUpdateCategory(sub.id, "mix", parseFloat(e.target.value))}
                        className="w-full accent-[#7B61FF] cursor-pointer"
                      />
                    </div>

                    {/* 3. Groove & Drums (20%) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#888888] font-medium">Groove & Drums (20%)</span>
                        <span className="font-mono font-bold text-white">{cats.groove.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={cats.groove}
                        onChange={(e) => handleUpdateCategory(sub.id, "groove", parseFloat(e.target.value))}
                        className="w-full accent-[#7B61FF] cursor-pointer"
                      />
                    </div>

                    {/* 4. Sample Flip (20%) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#888888] font-medium">Sample Chops (20%)</span>
                        <span className="font-mono font-bold text-white">{cats.sampleFlip.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={cats.sampleFlip}
                        onChange={(e) => handleUpdateCategory(sub.id, "sampleFlip", parseFloat(e.target.value))}
                        className="w-full accent-[#7B61FF] cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Feedback Textarea & Save Draft */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <textarea
                      rows={2}
                      placeholder="Write constructive judge feedback for the producer (mix clarity, chops, groove)..."
                      value={juryFeedback[sub.id] || ""}
                      onChange={(e) => setJuryFeedback({ ...juryFeedback, [sub.id]: e.target.value })}
                      className="w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none focus:ring-1 focus:ring-[#7B61FF] resize-none"
                    />

                    <button
                      onClick={() => handleSaveJuryDraft(sub.id)}
                      className={`sm:shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all w-full sm:w-auto ${
                        isSaved
                          ? "bg-emerald-600 text-white"
                          : "bg-[#121212] text-[#D1D1D1] hover:bg-[#7B61FF] hover:text-white"
                      }`}
                    >
                      {isSaved ? "Saved ✓" : "Save Draft"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Publish CTA */}
          <div className="bg-[#181818] p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#262626]">
            <div>
              <p className="text-sm font-bold text-white">Ready to finalize your evaluations?</p>
              <p className="text-xs text-[#888888] mt-0.5">Publishing your ballot locks in your scores and advances the battle once all judges have published.</p>
            </div>
            <button
              onClick={handlePublishJuryBallot}
              className="px-8 py-3.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
            >
              Publish Final Ballot
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: RESULTS & PODIUM */}
      {/* ========================================================================= */}
      {activeTab === "completed" && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white">Final Battle Standings & Podium</h3>
            <div className="flex items-center gap-5 text-sm font-mono text-[#888888]">
              <span className="flex items-center gap-1.5 text-[#FF5E3A] font-bold">
                <Flame className="w-4 h-4 fill-current" /> Community
              </span>
              <span className="flex items-center gap-1.5 text-[#7B61FF] font-bold">
                <Star className="w-4 h-4 fill-current" /> Composite Jury Score
              </span>
            </div>
          </div>

          {/* Leaderboard Cards with Producer Profile Links & Judge Feedback */}
          <div className="space-y-4">
            {sampleSubmissions.slice(0, 3).map((sub, idx) => {
              const isTop1 = idx === 0;
              const isTop2 = idx === 1;
              const isTop3 = idx === 2;

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-6 space-y-4 hover:bg-[#1C1C1C] transition-all border border-[#222222]"
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

                  {/* Judge Feedback Quote */}
                  {sub.juryFeedback && (
                    <div className="bg-[#121212] p-3.5 rounded-xl text-xs text-[#D1D1D1] italic border-l-2 border-[#7B61FF]">
                      "{sub.juryFeedback}" — <span className="text-[#7B61FF] not-italic font-semibold font-mono">Judge Feedback</span>
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
