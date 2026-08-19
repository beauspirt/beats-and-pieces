"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  sampleCompetitions,
  sampleSubmissions,
  sampleProducers,
} from "@/lib/mock-data";
import { AudioWaveformPlayer } from "./AudioWaveformPlayer";
import { FlameRating } from "./FlameRating";
import {
  ArrowLeft, Download, Upload, CheckCircle2,
  Lock, ShieldCheck, Flame, Star, Disc, Trophy, Award, Check, FileCheck, CassetteTape,
  ExternalLink
} from "lucide-react";
import confetti from "canvas-confetti";
import { submitRating } from "@/lib/api";
import { BattlePhase } from "@/lib/types";
import { useAudioPlayer } from "@/lib/audio-context";

export function BattleDetailClient({ battleId }: { battleId: string }) {
  const { pauseTrack } = useAudioPlayer();
  const battle = sampleCompetitions.find((c) => c.id === battleId) || sampleCompetitions[0];
  const [activeTab, setActiveTab] = useState<BattlePhase>(battle.phase);

  const battleSubmissions = sampleSubmissions.filter((sub) => sub.battleId === battle.id);
  const currentSubmissions = battleSubmissions.length > 0 ? battleSubmissions : sampleSubmissions;

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

  // Stage 3: Clean Single-Score Jury evaluation state (slider 0.00 to 5.00)
  const [juryScores, setJuryScores] = useState<Record<string, string>>({});
  const [juryFeedback, setJuryFeedback] = useState<Record<string, string>>({});
  const [hasPublishedBallot, setHasPublishedBallot] = useState(false);

  // Dynamic Percentage-based Ballot Validation (min 50% of total entries)
  const minPercentage = 50;
  const requiredVotes = Math.ceil(battle.totalSubmissions * (minPercentage / 100));
  const currentVotesCount = Object.keys(ratings).length;
  const isBallotQualified = currentVotesCount >= requiredVotes;

  // Complete Anonymized track queue for all 15 master battle entries
  const blindTracks = [
    { id: "blind-01", placeholder: "Beat 01", bpm: 92, audioUrl: "/audio/01 Ortega - Bonita Applebong.mp3", duration: 67 },
    { id: "blind-02", placeholder: "Beat 02", bpm: 88, audioUrl: "/audio/02 C.S.T - ThunderClouds.mp3", duration: 119 },
    { id: "blind-03", placeholder: "Beat 03", bpm: 90, audioUrl: "/audio/03 flg - bule temporale.mp3", duration: 201 },
    { id: "blind-04", placeholder: "Beat 04", bpm: 94, audioUrl: "/audio/04 Egris - Triburi.mp3", duration: 104 },
    { id: "blind-05", placeholder: "Beat 05", bpm: 86, audioUrl: "/audio/05 Nerub - Butterflies in my lungs.mp3", duration: 124 },
    { id: "blind-06", placeholder: "Beat 06", bpm: 91, audioUrl: "/audio/06 DFB - Apollo's Lyre.mp3", duration: 87 },
    { id: "blind-07", placeholder: "Beat 07", bpm: 93, audioUrl: "/audio/07 Ripp - Beyond.mp3", duration: 130 },
    { id: "blind-08", placeholder: "Beat 08", bpm: 89, audioUrl: "/audio/08 Mr Tweaks - Dmzl 4.mp3", duration: 136 },
    { id: "blind-09", placeholder: "Beat 09", bpm: 95, audioUrl: "/audio/09 Fane Stelaru - Late to the party.mp3", duration: 94 },
    { id: "blind-10", placeholder: "Beat 10", bpm: 98, audioUrl: "/audio/10 Fu - Malibu.mp3", duration: 102 },
    { id: "blind-11", placeholder: "Beat 11", bpm: 91, audioUrl: "/audio/11 Todica Vlad - Unfound.mp3", duration: 126 },
    { id: "blind-12", placeholder: "Beat 12", bpm: 87, audioUrl: "/audio/12 Jena - Paper Wasp.mp3", duration: 154 },
    { id: "blind-13", placeholder: "Beat 13", bpm: 87, audioUrl: "/audio/13 Raven - Sacred.mp3", duration: 100 },
    { id: "blind-14", placeholder: "Beat 14", bpm: 92, audioUrl: "/audio/14 Flat Beats - Time.mp3", duration: 121 },
    { id: "blind-15", placeholder: "Beat 15", bpm: 94, audioUrl: "/audio/15 Eastern Hypocrites - Rudaj.mp3", duration: 115 },
  ];

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const processUploadedFile = (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setMyEntry({
        id: "sub-user-entry",
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: "/audio/05 Nerub - Butterflies in my lungs.mp3",
        duration: 124,
        bpm: 90,
        submittedAt: new Date().toISOString(),
      });
      setIsUploading(false);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }, 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Compact Samples Audio Player State
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [sampleProgress, setSampleProgress] = useState<Record<string, number>>({});
  const sampleAudioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});

  const togglePlaySample = (sampleId: string, audioUrl: string) => {
    if (playingSampleId === sampleId) {
      sampleAudioRefs.current[sampleId]?.pause();
      setPlayingSampleId(null);
    } else {
      if (playingSampleId && sampleAudioRefs.current[playingSampleId]) {
        sampleAudioRefs.current[playingSampleId]?.pause();
      }
      let audio = sampleAudioRefs.current[sampleId];
      if (!audio) {
        const newAudio = new Audio(audioUrl);
        sampleAudioRefs.current[sampleId] = newAudio;
        newAudio.ontimeupdate = () => {
          if (newAudio.duration) {
            setSampleProgress((prev) => ({
              ...prev,
              [sampleId]: (newAudio.currentTime / newAudio.duration) * 100,
            }));
          }
        };
        newAudio.onended = () => {
          setPlayingSampleId(null);
          setSampleProgress((prev) => ({ ...prev, [sampleId]: 0 }));
        };
        audio = newAudio;
      }
      audio.play().catch(() => {});
      setPlayingSampleId(sampleId);
    }
  };

  const [isRatingsSubmitted, setIsRatingsSubmitted] = useState(false);
  const [showSubmitWarningModal, setShowSubmitWarningModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSubmitError(null);
        setShowSubmitWarningModal(false);
      }
    };
    if (submitError || showSubmitWarningModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [submitError, showSubmitWarningModal]);

  // Stop any playing audio whenever phase changes
  useEffect(() => {
    pauseTrack();
    if (playingSampleId && sampleAudioRefs.current[playingSampleId]) {
      sampleAudioRefs.current[playingSampleId]?.pause();
      setPlayingSampleId(null);
    }
  }, [activeTab]);

  // Clear any old test lockouts from localStorage on mount
  useEffect(() => {
    try {
      localStorage.removeItem(`bnp_submitted_${battle.id}`);
    } catch {
      // ignore
    }
  }, [battle.id]);

  const handleRateBeat = async (trackId: string, flames: number) => {
    if (isRatingsSubmitted) return; // Locked once submitted
    setRatings((prev) => ({ ...prev, [trackId]: flames }));
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    await submitRating(trackId, battle.id, flames);
  };

  const handleClickSubmitRatings = () => {
    if (currentVotesCount < requiredVotes) {
      setSubmitError(
        `You must rate at least ${requiredVotes} beats before submitting. You have rated ${currentVotesCount} so far. Please rate ${requiredVotes - currentVotesCount} more beats.`
      );
      return;
    }
    setSubmitError(null);
    setShowSubmitWarningModal(true);
  };

  const handleConfirmSubmitRatings = () => {
    setIsRatingsSubmitted(true);
    setShowSubmitWarningModal(false);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const [isJurySubmitted, setIsJurySubmitted] = useState(false);
  const [juryViewerRole, setJuryViewerRole] = useState<"judge" | "regular">("judge");

  const handlePublishJuryBallot = () => {
    setIsJurySubmitted(true);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const isTrackUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevTrack = blindTracks[index - 1];
    return !!ratings[prevTrack.id];
  };

  const phasesList: { key: BattlePhase; label: string; number: string }[] = [
    { key: "submission", label: "Submissions", number: "01" },
    { key: "rating", label: "Public Rating", number: "02" },
    { key: "judging", label: "Jury Evaluation", number: "03" },
    { key: "completed", label: "Results", number: "04" },
  ];

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      
      {/* SECTION 1: HERO & STAGE SWITCHER */}
      <section className="space-y-4">
        {/* Top Breadcrumb & Competition Phase Timeline */}
        <div className="flex items-center justify-between h-9">
          <Link
            href="/battles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Competitions</span>
          </Link>

          {/* Competition Process Timeline & Interactive Stage Switcher (only for active/mock competitions) */}
          {battle.phase !== "completed" && (
            <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl">
              {phasesList.map((p) => {
                const isActive = activeTab === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setActiveTab(p.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-[#7B61FF] text-white shadow-md"
                        : "text-[#777777] hover:text-[#D1D1D1] hover:bg-[#202020]"
                    }`}
                  >
                    <span className={`text-xs ${isActive ? "text-white/80" : "text-[#555555]"}`}>
                      {p.number}
                    </span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hero Header */}
        <div className="bg-[#181818] rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row gap-7 items-start relative overflow-hidden shadow-xl">
          
          {/* Cover Art Thumbnail (Grand 320px Square) */}
          <div
            className="w-full md:w-80 h-80 max-w-[320px] max-h-[320px] rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl"
            style={{ width: "320px", height: "320px", position: "relative" }}
          >
            <Image
              src={battle.coverImage}
              alt={battle.title}
              width={320}
              height={320}
              className="w-full h-full object-cover"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              priority
            />
          </div>

        {/* Meta Info (identical natural flow and position to battles listing page) */}
        <div className="flex-1 w-full min-w-0 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
              {battle.title}
            </h1>
            <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs sm:text-sm text-[#A0A0A0] shrink-0 self-start sm:self-center">
              {battle.totalSubmissions} Total Entries
            </span>
          </div>

          <div className="space-y-1 text-sm sm:text-base text-[#A0A0A0]">
            <p>Hosted by: <span className="text-white font-medium">{battle.hosts.join(", ")}</span></p>
            <p>Judged by: <span className="text-white font-medium">{battle.judges.join(", ")}</span></p>
          </div>

          <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed">
            {battle.description}
          </p>

          {battle.phase === "completed" ? (
            battle.endedAt && (
              <div className="text-xs sm:text-sm text-[#888888] pt-2">
                Ended on {new Date(battle.endedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            )
          ) : (
            <div className="text-xs sm:text-sm text-[#888888] pt-2">
              Submissions close Aug 15 • Public rating open until Aug 22
            </div>
          )}
        </div>
      </div>
      </section>

      {/* ========================================================================= */}
      {/* STAGE 1: SUBMISSIONS OPEN (RULES & COMPACT SAMPLES ON LEFT, SUBMIT ON RIGHT) */}
      {/* ========================================================================= */}
      {activeTab === "submission" && (
        <div className="space-y-6">
          
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${myEntry ? "items-start" : "items-stretch"}`}>
            
            {/* Left Column: Rules on Top, Compact Samples Below */}
            <div className="lg:col-span-6 space-y-6 flex flex-col">
              
              {/* 1. Rules (Directly on website background) */}
              <div className="space-y-3.5">
                <h3 className="text-xl font-bold text-white">
                  Rules
                </h3>

                <div className="space-y-2.5 pt-1">
                  <div className="bg-[#181818] p-3.5 rounded-xl">
                    <p className="text-xs sm:text-sm text-[#D1D1D1]">1. Maximum 1 entry per producer.</p>
                  </div>

                  <div className="bg-[#181818] p-3.5 rounded-xl">
                    <p className="text-xs sm:text-sm text-[#D1D1D1]">2. Track length must not exceed 2 minutes.</p>
                  </div>

                  <div className="bg-[#181818] p-3.5 rounded-xl">
                    <p className="text-xs sm:text-sm text-[#D1D1D1]">3. File type must be WAV or MP3.</p>
                  </div>

                  <div className="bg-[#181818] p-3.5 rounded-xl">
                    <p className="text-xs sm:text-sm text-[#D1D1D1]">4. Use at least 1 of the samples (if) provided.</p>
                  </div>
                </div>
              </div>

              {/* 2. Sample(s) (Directly on website background) */}
              {battle.samples && battle.samples.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold text-white">
                      Sample(s)
                    </h3>

                    <a
                      href={battle.samples[0]?.audioUrl || "/sample-packs/battle-5-samples.zip"}
                      download
                      className="px-4 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all w-fit shrink-0 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {battle.samples.map((sample) => {
                      const isPlaying = playingSampleId === sample.id;
                      const progress = sampleProgress[sample.id] || 0;

                      return (
                        <div
                          key={sample.id}
                          className="relative overflow-hidden rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-all bg-[#181818] border-0"
                        >
                          {/* Live playback progress fill overlay */}
                          {isPlaying && (
                            <div
                              className="absolute inset-0 bg-[#4D4696]/60 pointer-events-none transition-all duration-100 ease-linear"
                              style={{ width: `${progress}%` }}
                            />
                          )}

                          {/* Left: Play / Pause button + Title */}
                          <div className="flex items-center gap-3 relative z-10 min-w-0">
                            <button
                              type="button"
                              onClick={() => togglePlaySample(sample.id, sample.audioUrl)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
                                isPlaying
                                  ? "bg-[#7B61FF] text-white hover:scale-105 active:scale-95"
                                  : "bg-white text-black hover:scale-105 active:scale-95"
                              }`}
                              aria-label={isPlaying ? `Pause ${sample.title}` : `Play ${sample.title}`}
                            >
                              {isPlaying ? (
                                <span className="flex items-center justify-center gap-0.5">
                                  <span className="w-1 h-3 bg-white rounded-full" />
                                  <span className="w-1 h-3 bg-white rounded-full" />
                                </span>
                              ) : (
                                <span className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-black ml-0.5" />
                              )}
                            </button>

                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {sample.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Submit Your Entry Container (Reduces in size when submitted) */}
            <div className={`lg:col-span-6 bg-[#181818] rounded-3xl p-5 sm:p-7 space-y-4 flex flex-col ${myEntry ? "h-auto" : "h-full justify-between"}`}>
              <div className="space-y-4 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#FF5E3A]" />
                  <span>Submit your entry</span>
                </h3>

                {!myEntry ? (
                  <label
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex-1 min-h-[300px] rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group ${
                      isDraggingOver
                        ? "bg-[#7B61FF]/15 border-2 border-solid border-[#7B61FF] scale-[1.01]"
                        : "bg-[#121212]/70 hover:bg-[#121212] border-2 border-dashed border-[#7B61FF]"
                    }`}
                  >
                    <input
                      type="file"
                      accept="audio/wav,audio/mp3,audio/mpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isUploading ? (
                        <div className="w-7 h-7 border-2 border-[#7B61FF] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-7 h-7 text-[#7B61FF]" />
                      )}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm sm:text-base font-bold text-white">
                        {isUploading ? "Uploading entry..." : "Click to select or drag your entry here"}
                      </p>
                      <p className="text-xs text-[#888888]">WAV or MP3 (Max 2 minutes)</p>
                    </div>
                  </label>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`bg-[#121212] p-5 sm:p-7 rounded-2xl space-y-5 transition-all ${
                      isDraggingOver ? "ring-2 ring-[#7B61FF] bg-[#7B61FF]/10" : ""
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm sm:text-base">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submission Received</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <label className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#7B61FF] text-white hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Replace File</span>
                            <input
                              type="file"
                              accept="audio/wav,audio/mp3,audio/mpeg"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={isUploading}
                            />
                          </label>

                          <button
                            onClick={() => setMyEntry(null)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-red-500/20 text-[#888888] hover:text-red-400 transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <p className="text-white font-bold text-lg sm:text-xl truncate">{myEntry.title}</p>
                    </div>

                    <div className="pt-1">
                      <AudioWaveformPlayer
                        id={myEntry.id}
                        title={myEntry.title}
                        audioUrl={myEntry.audioUrl}
                        duration={myEntry.duration}
                        bpm={myEntry.bpm}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: PUBLIC RATING PHASE (ALL 15 BEATS WITH FLAME-ONLY RATING) */}
      {/* ========================================================================= */}
      {activeTab === "rating" && (
        <div className="space-y-6">
          
          {/* Anti-Bias Info (Directly on website background) */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Public Rating Phase
            </h3>
            <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed">
              Beats are randomly shuffled. Rate each beat with 1 to 5 flames (
              <Flame className="w-4 h-4 text-[#FF5E3A] fill-current inline-block ml-0.5 mr-0.5 -mt-0.5" />
              ) to unlock the next track.
            </p>
          </div>

          {/* Blind Rating Track Queue (All 15 Beats) */}
          <div className="space-y-3.5">
            {blindTracks.map((track, idx) => {
              const unlocked = isTrackUnlocked(idx);
              const currentFlames = ratings[track.id] || 0;

              return (
                <div
                  key={track.id}
                  className={`bg-[#181818] rounded-2xl p-4 sm:p-5 ${
                    unlocked ? "" : "opacity-40"
                  }`}
                >
                  {unlocked ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-base sm:text-lg">{track.placeholder}</span>
                        </div>

                        {/* 5 Flames Only */}
                        <div className="flex items-center gap-2">
                          <FlameRating
                            value={currentFlames}
                            onChange={isRatingsSubmitted ? undefined : (val) => handleRateBeat(track.id, val)}
                            readOnly={isRatingsSubmitted}
                            size="md"
                            showValue={false}
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
                    <div className="flex items-center justify-between py-2 text-xs sm:text-sm text-[#666666]">
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

          {/* Bottom Submit Action (No scrolling required after finishing) */}
          <div className="flex flex-col items-center justify-center gap-3 pt-6 pb-6">
            {isRatingsSubmitted ? (
              <div className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-500/15 text-emerald-300 font-bold text-sm sm:text-base border border-emerald-500/20 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Ratings Submitted & Locked ✓</span>
              </div>
            ) : (
              <button
                onClick={handleClickSubmitRatings}
                className="px-8 py-3.5 rounded-2xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-sm sm:text-base shadow-xl transition-all active:scale-95 cursor-pointer"
              >
                <span>Submit Ratings</span>
              </button>
            )}
          </div>

          {/* INSUFFICIENT RATINGS ERROR MODAL */}
          {submitError && (
            <div 
              onClick={() => setSubmitError(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-[#181818] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative border border-[#2A2A2A] cursor-default"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#FF5E3A] flex items-center gap-2">
                    <span>More Ratings Required</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#D1D1D1] leading-relaxed">
                    {submitError}
                  </p>
                </div>

                <div className="bg-[#121212] p-4 rounded-xl space-y-1.5 text-xs text-[#A0A0A0]">
                  <div className="flex items-center justify-between">
                    <span>Beats Rated So Far:</span>
                    <strong className="text-white">{currentVotesCount} / {battle.totalSubmissions}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Minimum Required to Submit:</span>
                    <strong className="text-white">{requiredVotes} beats ({minPercentage}%)</strong>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSubmitError(null)}
                    className="px-6 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Got it, continue rating
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT RATINGS FINAL LOCK WARNING & CONFIRMATION MODAL */}
          {showSubmitWarningModal && (
            <div 
              onClick={() => setShowSubmitWarningModal(false)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-[#181818] rounded-2xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-[#2A2A2A] cursor-default"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#7B61FF]" />
                    <span>Submit & Lock Your Ratings</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#D1D1D1] leading-relaxed">
                    Once submitted, your ratings will be <strong className="text-white font-bold">final and permanently locked</strong>. You will not be able to edit them afterwards.
                  </p>
                </div>

                <div className="bg-[#121212] p-4 rounded-xl space-y-1.5 text-xs text-[#A0A0A0]">
                  <div className="flex items-center justify-between">
                    <span>Total Beats Rated:</span>
                    <strong className="text-white">{currentVotesCount} / {blindTracks.length}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Qualification Status:</span>
                    <span className="text-emerald-400 font-bold">Verified & Counted ✓</span>
                  </div>
                </div>

                <p className="text-xs text-[#888888]">
                  Are you ready to lock in your votes towards the Top 15 Finalists?
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowSubmitWarningModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#A0A0A0] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Keep Reviewing
                  </button>

                  <button
                    onClick={handleConfirmSubmitRatings}
                    className="px-6 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Lock Ratings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: BLIND JURY EVALUATION */}
      {/* ========================================================================= */}
      {activeTab === "judging" && (
        <div className="space-y-6">
          
          {/* Jury Portal Top Header & Controls (Directly on website background) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Title, Subtitle, Action Button, Perspective Switcher */}
            <div className="lg:col-span-7 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {juryViewerRole === "judge" ? "Jury Evaluation Portal" : "Jury Evaluation"}
                  </h3>

                  {/* Simulation Role Switcher (Preview Judge vs Regular User View) */}
                  <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setJuryViewerRole("judge")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        juryViewerRole === "judge"
                          ? "bg-[#7B61FF] text-white"
                          : "text-[#888888] hover:text-white"
                      }`}
                    >
                      Judge View
                    </button>
                    <button
                      onClick={() => setJuryViewerRole("regular")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        juryViewerRole === "regular"
                          ? "bg-[#7B61FF] text-white"
                          : "text-[#888888] hover:text-white"
                      }`}
                    >
                      Regular User View
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#888888] mt-1">
                  {juryViewerRole === "judge"
                    ? "Logged in as judge (Ortega)."
                    : "The judges are currently evaluating the finalists' beats."}
                </p>
              </div>

              {juryViewerRole === "judge" && (
                <div className="pt-2">
                  {isJurySubmitted ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 font-bold text-xs sm:text-sm border border-emerald-500/20 shadow-sm">
                        Scores Submitted ✓
                      </div>
                      <button
                        onClick={() => setIsJurySubmitted(false)}
                        className="px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-[#D1D1D1] hover:text-white font-semibold text-xs sm:text-sm border border-[#333333] transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        Unlock & Edit Scores
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublishJuryBallot}
                      className="px-7 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Submit Scores
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Assigned Judges stacked in a Column (Only actual judges, no hosts) */}
            <div className="lg:col-span-5 bg-[#181818] p-4 sm:p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-white">Assigned Judges</span>
              </div>

              <div className="space-y-2">
                <div className="bg-[#121212] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${isJurySubmitted ? "bg-emerald-500" : "bg-[#FF5E3A] animate-pulse"}`} />
                    <span className="text-xs sm:text-sm font-bold text-white">Ortega{juryViewerRole === "judge" ? " (You)" : ""}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${isJurySubmitted ? "bg-emerald-500/20 text-emerald-400" : "bg-[#FF5E3A]/20 text-[#FF5E3A]"}`}>
                    {isJurySubmitted ? "Submitted ✓" : "In Progress"}
                  </span>
                </div>

                <div className="bg-[#121212] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs sm:text-sm font-bold text-white">Silent Strike</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Submitted ✓
                  </span>
                </div>

                <div className="bg-[#121212] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF5E3A] animate-pulse" />
                    <span className="text-xs sm:text-sm font-bold text-white">K-Lu</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#FF5E3A]/20 text-[#FF5E3A]">
                    In Progress
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Anonymized Finalists list (Top 15 Blind) */}
          <div className="space-y-3.5">
            {sampleSubmissions.slice(0, 15).map((sub, idx) => {
              const scoreVal = juryScores[sub.id] !== undefined ? juryScores[sub.id] : "";
              const feedbackVal = juryFeedback[sub.id] !== undefined ? juryFeedback[sub.id] : "";
              const blindTitle = `Finalist ${idx < 9 ? "0" + (idx + 1) : idx + 1}`;

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-base sm:text-lg">{blindTitle}</h4>
                    </div>

                    {/* Clearly labeled Public Rating Average */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-sm sm:text-base text-[#FF5E3A] font-bold">
                        <Flame className="w-4 h-4 fill-current" />
                        <span>{sub.flameRating?.toFixed(2)}</span>
                      </div>
                      <span className="text-xs text-[#777777] font-medium">Public Rating Avg</span>
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

                  {/* Judge Evaluation Controls (Only visible for Judges, disabled once submitted) */}
                  {juryViewerRole === "judge" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1 items-center">
                      {/* Score Slider */}
                      <div className="md:col-span-5 flex items-center gap-3 bg-[#121212] px-4 py-2.5 rounded-xl">
                        <span className="text-xs text-[#888888] font-semibold shrink-0">Score:</span>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.05"
                          disabled={isJurySubmitted}
                          value={typeof scoreVal === "number" || (typeof scoreVal === "string" && scoreVal !== "") ? Number(scoreVal) : 0}
                          onChange={(e) => {
                            if (isJurySubmitted) return;
                            const val = parseFloat(e.target.value).toFixed(2);
                            setJuryScores((prev) => ({ ...prev, [sub.id]: val }));
                          }}
                          className={`w-full h-2 bg-[#252525] rounded-lg appearance-none accent-[#7B61FF] ${isJurySubmitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        />
                        <div className="flex items-center gap-1 text-[#7B61FF] shrink-0">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-xs sm:text-sm font-bold min-w-[32px] text-right">
                            {typeof scoreVal === "number" || (typeof scoreVal === "string" && scoreVal !== "") ? Number(scoreVal).toFixed(2) : "0.00"}
                          </span>
                        </div>
                      </div>

                      {/* Feedback input */}
                      <div className="md:col-span-7">
                        <input
                          type="text"
                          disabled={isJurySubmitted}
                          placeholder={isJurySubmitted ? "Feedback submitted and locked" : "Leave feedback note for the beatmaker (optional)"}
                          value={feedbackVal}
                          onChange={(e) => {
                            if (isJurySubmitted) return;
                            setJuryFeedback((prev) => ({ ...prev, [sub.id]: e.target.value }));
                          }}
                          className={`w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-[#555555] focus:outline-none ${isJurySubmitted ? "opacity-70 cursor-not-allowed" : ""}`}
                        />
                      </div>
                    </div>
                  )}
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
        <div className="space-y-6">
          
          {/* Leaderboard Cards */}
          <div className="space-y-3.5">
            {currentSubmissions.map((sub, idx) => {
              const isTop1 = idx === 0 || sub.rank === 1;
              const isTop2 = idx === 1 || sub.rank === 2;
              const isTop3 = idx === 2 || sub.rank === 3;
              const judgeName = sub.judgeName || "Judge";
              const hasScores = sub.flameRating !== undefined || sub.juryScore !== undefined;

              return (
                <div
                  key={sub.id}
                  className="bg-[#181818] rounded-2xl p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Rank Badge + Producer Info */}
                    <div className="flex items-center gap-4 min-w-[240px]">
                      {isTop1 ? (
                        <span className="h-7 px-3.5 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                          1st Place
                        </span>
                      ) : isTop2 ? (
                        <span className="h-7 px-3.5 rounded-full bg-[#1E232A] text-[#94A3B8] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                          2nd Place
                        </span>
                      ) : isTop3 ? (
                        <span className="h-7 px-3.5 rounded-full bg-[#FF5E3A]/10 text-[#FF8A65] text-xs font-bold inline-flex items-center justify-center text-center leading-none select-none shrink-0">
                          3rd Place
                        </span>
                      ) : (
                        <span className="h-7 w-8 text-center text-xs font-bold text-[#666666] inline-flex items-center justify-center leading-none select-none shrink-0">
                          #{sub.rank || (idx + 1)}
                        </span>
                      )}

                      <div>
                        {sub.beatTitle && sub.beatTitle !== battle.title && !sub.beatTitle.startsWith("Beat Battle #") && (
                          <span className="text-xs sm:text-sm text-[#888888] leading-tight block">
                            {sub.beatTitle}
                          </span>
                        )}
                        <Link
                          href={`/producers/${sub.userId}`}
                          className="text-base sm:text-lg font-bold text-white hover:text-[#7B61FF] transition-colors leading-snug"
                        >
                          {sub.beatmakerTag}
                        </Link>
                      </div>
                    </div>

                    {/* Scores (only if scores exist) */}
                    {hasScores && (
                      <div className="flex items-center gap-5 shrink-0 text-sm sm:text-base font-bold">
                        {sub.flameRating !== undefined && (
                          <div className="flex items-center gap-1.5 text-[#FF5E3A]">
                            <Flame className="w-4 h-4 fill-current" />
                            <span>{sub.flameRating.toFixed(2)}</span>
                          </div>
                        )}

                        {sub.juryScore !== undefined && (
                          <div className="flex items-center gap-1.5 text-[#7B61FF]">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{sub.juryScore.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}

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
                    <div className="bg-[#121212] px-4 py-2.5 rounded-xl text-xs sm:text-sm text-[#D1D1D1] italic">
                      "{sub.juryFeedback}" - <span className="text-[#888888] not-italic font-semibold">{judgeName}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* YouTube Live Jury Evaluation Session Embed below Leaderboard */}
          {battle.youtubeVodUrl && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-[#121212] shadow-2xl">
              <iframe
                src={
                  battle.youtubeVodUrl.includes("watch?v=")
                    ? `https://www.youtube-nocookie.com/embed/${battle.youtubeVodUrl.split("watch?v=")[1].split("&")[0]}`
                    : battle.youtubeVodUrl.includes("/embed/")
                    ? battle.youtubeVodUrl
                    : `https://www.youtube-nocookie.com/embed/${battle.youtubeVodUrl.split("/").pop()}`
                }
                title={`${battle.title} Live Jury Evaluation`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

        </div>
      )}

    </div>
  );
}
