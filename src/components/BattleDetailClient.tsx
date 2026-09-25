"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { battleService, storageService, producerService } from "@/services";
import {
  AudioWaveformPlayer,
  extractRealAudioBufferWaveform,
  globalWaveformCache,
  WaveformData,
} from "./AudioWaveformPlayer";
import { FlameRating } from "./FlameRating";
import {
  ArrowLeft, Download, Upload, CheckCircle2,
  Lock, ShieldCheck, Flame, Star, Disc, Trophy, Award, Check, FileCheck, CassetteTape,
  ExternalLink, Pencil
} from "lucide-react";
import { BattlePhase, Competition, BattleSubmission } from "@/lib/types";
import { useAudioPlayer } from "@/lib/audio-context";
import { useAuth } from "@/lib/auth-context";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ClientPortal } from "./ClientPortal";
import { Tooltip } from "./Tooltip";
import { formatTime } from "@/lib/utils";

// Deterministic pseudo-random seeded shuffle (Mulberry32 PRNG)
function seededShuffle<T>(array: T[], seedStr: string): T[] {
  const arr = [...array];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  let s = seed >>> 0;
  const random = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getYouTubeId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.includes("watch?v=")) {
    return trimmed.split("watch?v=")[1].split("&")[0];
  }
  if (trimmed.includes("youtu.be/")) {
    return trimmed.split("youtu.be/")[1].split("?")[0];
  }
  if (trimmed.includes("/embed/")) {
    return trimmed.split("/embed/")[1].split("?")[0];
  }
  const parts = trimmed.split("/").pop();
  return parts ? parts.split("?")[0] : null;
}

export function BattleDetailClient({ battleId }: { battleId: string }) {
  const router = useRouter();
  const { pauseTrack } = useAudioPlayer();
  const { user: currentUser, isLoggedIn, isLoading: isAuthLoading } = useAuth();
  
  const [battle, setBattle] = useState<Competition | null>(() => {
    const found = battleService.getCompetitionById(battleId);
    return found && found.id === battleId ? found : null;
  });

  const [submissions, setSubmissions] = useState<BattleSubmission[]>(() => {
    return battleService.getSubmissionsByBattleId(battleId);
  });

  const [hasChecked, setHasChecked] = useState(false);

  const refreshBattleData = useCallback(() => {
    const freshBattle = battleService.getCompetitionById(battleId);
    if (freshBattle && freshBattle.id === battleId) {
      setBattle(freshBattle);
    }
    setSubmissions(battleService.getSubmissionsByBattleId(battleId));
  }, [battleId]);

  useEffect(() => {
    refreshBattleData();

    Promise.all([
      battleService.syncFromSupabase(),
      producerService.syncFromSupabase(),
    ]).then(() => {
      refreshBattleData();
      setHasChecked(true);
    });

    const handleUpdate = () => {
      refreshBattleData();
    };

    window.addEventListener("bnp_battles_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("bnp_battles_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [battleId, refreshBattleData]);

  // Route Guard: Require login for ongoing active battles
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn && battle && battle.phase !== "completed") {
      router.replace(`/signin?redirect=/battles/${battleId}`);
    }
  }, [isAuthLoading, isLoggedIn, battle, router, battleId]);

  // Determine if the currently logged in user is explicitly assigned as a judge for THIS battle
  const isUserJudge = Boolean(
    currentUser && battle && (
      battle.judgeDetails?.some((j) => 
        (j.email && j.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (j.name && j.name.toLowerCase() === currentUser.nickname.toLowerCase())
      ) ||
      battle.judges?.some((j) => 
        typeof j === "string" && (
          j.toLowerCase() === currentUser.nickname.toLowerCase() || 
          j.toLowerCase() === currentUser.email.toLowerCase()
        )
      )
    )
  );

  const [isDownloadingSamples, setIsDownloadingSamples] = useState(false);
  const [downloadingSampleId, setDownloadingSampleId] = useState<string | null>(null);

  // Helper for cross-origin audio downloads preserving clean filenames
  const downloadAudioFile = async (url: string, desiredFilename: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = url.split("?")[0].split(".").pop() || "wav";
      const cleanExt = ["wav", "mp3", "zip", "aif", "aiff", "flac"].includes(ext.toLowerCase()) ? ext : "wav";
      const finalName = desiredFilename.toLowerCase().endsWith(`.${cleanExt.toLowerCase()}`)
        ? desiredFilename
        : `${desiredFilename}.${cleanExt}`;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.download = desiredFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadSingleSample = async (sampleId: string, url: string, title: string) => {
    setDownloadingSampleId(sampleId);
    try {
      await downloadAudioFile(url, title);
    } finally {
      setDownloadingSampleId(null);
    }
  };

  // Helper for downloading sample(s): single file or zipped bundle if multiple
  const downloadSamples = async () => {
    if (!battle?.samples || battle.samples.length === 0) return;
    if (battle.samples.length === 1) {
      const sample = battle.samples[0];
      await downloadAudioFile(sample.audioUrl, sample.title);
      return;
    }

    setIsDownloadingSamples(true);
    try {
      const JSZipModule = await import("jszip");
      const JSZip = JSZipModule.default || JSZipModule;
      const zip = new JSZip();
      const folderName = `${(battle.title || "Battle").replace(/[^a-z0-9_-]/gi, "_")}_Samples`;
      const folder = zip.folder(folderName) || zip;

      const fetchPromises = battle.samples.map(async (s) => {
        try {
          const res = await fetch(s.audioUrl);
          const blob = await res.blob();
          const ext = s.audioUrl.split("?")[0].split(".").pop() || "wav";
          const cleanExt = ["wav", "mp3", "zip", "aif", "aiff", "flac"].includes(ext.toLowerCase()) ? ext : "wav";
          const filename = s.title.toLowerCase().endsWith(`.${cleanExt}`) ? s.title : `${s.title}.${cleanExt}`;
          folder.file(filename, blob);
        } catch (err) {
          // console.warn(`Failed to add sample ${s.title} to zip:`, err);
        }
      });

      await Promise.all(fetchPromises);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${(battle.title || "Battle").replace(/[^a-z0-9_-]/gi, "_")}_Samples.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // console.error("Failed to generate zip:", err);
      // Fallback: download first sample
      if (battle?.samples?.[0]) {
        downloadAudioFile(battle.samples[0].audioUrl, battle.samples[0].title);
      }
    } finally {
      setIsDownloadingSamples(false);
    }
  };

  // Phase 1: Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [myEntry, setMyEntry] = useState<{
    id: string;
    title: string;
    audioUrl: string;
    duration: number;
    waveformPeaks?: number[];
    bpm?: number;
    submittedAt: string;
  } | null>(null);

  // Restore current user's existing submission for Phase 1
  useEffect(() => {
    if (currentUser) {
      const cleanName = currentUser.nickname.toLowerCase().trim();
      const existing = submissions.find(
        (s) =>
          (s.userId && s.userId.toLowerCase().trim() === currentUser.id.toLowerCase().trim()) ||
          (s.beatmakerTag && s.beatmakerTag.toLowerCase().trim() === cleanName)
      );
      if (existing) {
        setMyEntry({
          id: existing.id,
          title: existing.beatTitle,
          audioUrl: existing.audioUrl,
          duration: existing.duration || 120,
          waveformPeaks: existing.waveform,
          bpm: existing.bpm,
          submittedAt: existing.submittedAt,
        });
      } else {
        setMyEntry(null);
      }
    }
  }, [currentUser, submissions]);

  // Phase 2: Rating state (Track ratings) with localStorage & database persistence
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isRatingsSubmitted, setIsRatingsSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const uId = localStorage.getItem("bnp_active_user_id");
        if (uId && uId !== "logged_out") {
          return localStorage.getItem(`bnp_ratings_locked_${battleId}_${uId.toLowerCase().trim()}`) === "true";
        }
      } catch {}
    }
    return false;
  });

  // Unique visitor seed for device-level guest randomizer
  const [visitorSeed, setVisitorSeed] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        let stored = localStorage.getItem("bnp_visitor_id");
        if (!stored) {
          stored = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem("bnp_visitor_id", stored);
        }
        return stored;
      } catch {}
    }
    return "guest";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      let stored = localStorage.getItem("bnp_visitor_id");
      if (!stored) {
        stored = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        try {
          localStorage.setItem("bnp_visitor_id", stored);
        } catch {}
      }
      setVisitorSeed(stored);
    }
  }, []);

  // Sync user's existing ratings from database and local draft on mount / auth change
  useEffect(() => {
    const targetBattleId = battle?.id || battleId;
    const effectiveUserId = (currentUser?.id || (typeof window !== "undefined" ? localStorage.getItem("bnp_active_user_id") : null) || "").toLowerCase().trim();
    const uId = effectiveUserId || visitorSeed;

    if (!targetBattleId) return;

    let draftRatings: Record<string, number> = {};
    try {
      const stored = localStorage.getItem(`bnp_draft_ratings_${targetBattleId}_${uId}`) ||
                     localStorage.getItem(`bnp_submitted_ratings_${targetBattleId}_${uId}`);
      if (stored) draftRatings = JSON.parse(stored);
    } catch {}

    const isLockedLocally = typeof window !== "undefined" && Boolean(
      uId && uId !== "guest" && localStorage.getItem(`bnp_ratings_locked_${targetBattleId}_${uId}`) === "true"
    );

    if (isLockedLocally) {
      setIsRatingsSubmitted(true);
    }

    if (!effectiveUserId) {
      setRatings(draftRatings);
      setIsRatingsSubmitted(isLockedLocally);
      return;
    }

    battleService.getUserRatingsForBattle(targetBattleId, effectiveUserId).then(({ ratings: userRatings, isSubmitted }) => {
      const merged = { ...draftRatings, ...userRatings };
      setRatings(merged);
      setIsRatingsSubmitted(isSubmitted || isLockedLocally);
    });
  }, [battle?.id, battleId, currentUser?.id, visitorSeed]);

  // Phase 3: Clean Single-Score Jury evaluation state (slider 0.00 to 5.00)
  const [juryScores, setJuryScores] = useState<Record<string, string>>({});
  const [juryFeedback, setJuryFeedback] = useState<Record<string, string>>({});
  const [isJurySubmitted, setIsJurySubmitted] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  useBodyScrollLock(isVideoModalOpen);

  // Dynamic Percentage-based Ballot Validation (min 50% of total entries)
  const minPercentage = 50;
  const totalEntries = submissions.length;
  const requiredVotes = totalEntries > 0 ? Math.max(1, Math.ceil(totalEntries * (minPercentage / 100))) : 0;
  const currentVotesCount = Object.keys(ratings).filter((tId) => submissions.some((s) => s.id === tId)).length;
  const isBallotQualified = totalEntries > 0 && currentVotesCount >= requiredVotes;

  // Deterministic user-seeded randomized queue for Phase 2 public rating
  const effectiveUserId = (currentUser?.id || (typeof window !== "undefined" ? localStorage.getItem("bnp_active_user_id") : null) || "").toLowerCase().trim();
  const queueUserId = effectiveUserId && effectiveUserId !== "logged_out" ? effectiveUserId : visitorSeed;
  const currentBattleId = battle?.id || battleId;
  const userSeed = `${queueUserId}_${currentBattleId}`;

  const shuffledSubmissions = React.useMemo(() => {
    if (submissions.length === 0) return [];

    // Always sort canonically first to guarantee deterministic input to the shuffle algorithm
    const canonicalSubs = [...submissions].sort((a, b) =>
      (a.submittedAt || "").localeCompare(b.submittedAt || "") || a.id.localeCompare(b.id)
    );

    const storageKey = `bnp_track_order_${currentBattleId}_${queueUserId}`;

    // Check if we already have a fixed randomized order for this user & battle in localStorage
    if (typeof window !== "undefined") {
      try {
        const storedOrder = localStorage.getItem(storageKey);
        if (storedOrder) {
          const orderedIds: string[] = JSON.parse(storedOrder);
          const subsMap = new Map(canonicalSubs.map((s) => [s.id, s]));
          const result: BattleSubmission[] = [];

          // Add existing tracks in their saved order
          orderedIds.forEach((id) => {
            const sub = subsMap.get(id);
            if (sub) {
              result.push(sub);
              subsMap.delete(id);
            }
          });

          // If any new submissions were added since order was saved, append them cleanly
          if (subsMap.size > 0) {
            Array.from(subsMap.values()).forEach((sub) => result.push(sub));
            localStorage.setItem(storageKey, JSON.stringify(result.map((s) => s.id)));
          }

          if (result.length > 0) return result;
        }
      } catch {}
    }

    // Otherwise generate the deterministic shuffle from the canonical order
    const shuffled = seededShuffle(canonicalSubs, userSeed);

    // Save this order so refreshing the page ALWAYS maintains the exact same sequence for this user
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(shuffled.map((s) => s.id)));
      } catch {}
    }

    return shuffled;
  }, [submissions, userSeed, currentBattleId, queueUserId]);

  // Anonymized track queue derived from user-seeded randomized submissions
  const blindTracks = shuffledSubmissions.map((sub, idx) => ({
    id: sub.id,
    placeholder: `Beat ${idx < 9 ? "0" + (idx + 1) : idx + 1}`,
    bpm: sub.bpm,
    audioUrl: sub.audioUrl,
    duration: sub.duration || 120,
    waveformPeaks: sub.waveform,
    flameRating: sub.flameRating,
  }));

  // Top 10 finalists triaged by Phase 2 public flame rating, randomized presentation order for judges
  const cutoff = battle?.topFinalistsCutoff || 10;
  const finalistSubmissions = React.useMemo(() => {
    if (submissions.length === 0) return [];
    const topFinalists = [...submissions]
      .sort((a, b) => (b.flameRating || 0) - (a.flameRating || 0) || a.id.localeCompare(b.id))
      .slice(0, cutoff);

    const storageKey = `bnp_jury_finalist_order_${currentBattleId}_${queueUserId}`;

    if (typeof window !== "undefined") {
      try {
        const storedOrder = localStorage.getItem(storageKey);
        if (storedOrder) {
          const orderedIds: string[] = JSON.parse(storedOrder);
          const subsMap = new Map(topFinalists.map((s) => [s.id, s]));
          const result: BattleSubmission[] = [];

          orderedIds.forEach((id) => {
            const sub = subsMap.get(id);
            if (sub) {
              result.push(sub);
              subsMap.delete(id);
            }
          });

          if (subsMap.size > 0) {
            Array.from(subsMap.values()).forEach((sub) => result.push(sub));
            localStorage.setItem(storageKey, JSON.stringify(result.map((s) => s.id)));
          }

          if (result.length > 0) return result;
        }
      } catch {}
    }

    const shuffled = seededShuffle(topFinalists, `${userSeed}_jury_finalists`);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(shuffled.map((s) => s.id)));
      } catch {}
    }
    return shuffled;
  }, [submissions, cutoff, userSeed, currentBattleId, queueUserId]);

  // Restore judge's drafted scores and check submission status purely from database
  useEffect(() => {
    if (!currentUser || !battle) return;
    const cleanName = currentUser.nickname.toLowerCase().trim();
    const cleanEmail = currentUser.email.toLowerCase().trim();
    const cleanId = currentUser.id.toLowerCase().trim();

    const uId = currentUser.id;
    let draftScores: Record<string, string> = {};
    let draftFeedback: Record<string, string> = {};
    try {
      const s = localStorage.getItem(`bnp_draft_jury_scores_${battle.id}_${uId}`);
      if (s) draftScores = JSON.parse(s);
      const f = localStorage.getItem(`bnp_draft_jury_feedback_${battle.id}_${uId}`);
      if (f) draftFeedback = JSON.parse(f);
    } catch {}

    const loadedScores: Record<string, string> = {};
    const loadedFeedbacks: Record<string, string> = {};
    let scoredFinalistsCount = 0;

    finalistSubmissions.forEach((sub) => {
      const match = sub.juryFeedbacks?.find(
        (f) =>
          (f.judgeName && f.judgeName.toLowerCase().trim() === cleanName) ||
          (f.judgeId && f.judgeId.toLowerCase().trim() === cleanId) ||
          (f.judgeId && f.judgeId.toLowerCase().trim() === cleanEmail)
      );
      if (match) {
        if (typeof match.score === "number" && !isNaN(match.score)) {
          loadedScores[sub.id] = match.score.toFixed(2);
          scoredFinalistsCount++;
        }
        if (match.feedback) {
          loadedFeedbacks[sub.id] = match.feedback;
        }
      }
    });

    setJuryScores((prev) => ({ ...draftScores, ...loadedScores, ...prev }));
    setJuryFeedback((prev) => ({ ...draftFeedback, ...loadedFeedbacks, ...prev }));

    // Only submitted if every finalist has a submitted score in the database
    const isSubmitted = finalistSubmissions.length > 0 && scoredFinalistsCount === finalistSubmissions.length;
    setIsJurySubmitted(isSubmitted);
  }, [finalistSubmissions, currentUser, battle?.id]);

  // Set of judges who have submitted scores
  const submittedJudgeNames = React.useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      s.juryFeedbacks?.forEach((f) => {
        if (typeof f.score === "number" && f.judgeName) {
          set.add(f.judgeName.toLowerCase().trim());
          if (f.judgeId) set.add(f.judgeId.toLowerCase().trim());
        }
      });
    });
    return set;
  }, [submissions]);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [stagedBeat, setStagedBeat] = useState<{
    file: File;
    title: string;
    audioUrl: string;
    duration: number;
    waveformPeaks: number[];
  } | null>(null);

  const processUploadedFile = async (file: File) => {
    if (!file) return;
    if (isUserJudge) {
      alert("You are assigned as a judge for this battle and cannot submit an entry.");
      return;
    }

    const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB limit (compressed automatically to ~2-3MB Opus)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`File is too large (${sizeMB} MB). Maximum source audio size is 250 MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "");

      // Instantly decode arrayBuffer in memory for exact waveform & duration preview
      let extractedWaveform: WaveformData | null = null;
      let realDuration = 120;
      try {
        const arrayBuf = await file.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
          extractedWaveform = extractRealAudioBufferWaveform(decoded, 800);
          realDuration = Math.round(decoded.duration);
          ctx.close();
        }
      } catch (decodeErr) {
        // console.warn("In-memory audio decode warning:", decodeErr);
      }

      const tempAudioUrl = URL.createObjectURL(file);
      if (extractedWaveform) {
        globalWaveformCache.set(tempAudioUrl, extractedWaveform);
      }

      setStagedBeat({
        file,
        title: defaultTitle,
        audioUrl: tempAudioUrl,
        duration: realDuration,
        waveformPeaks: extractedWaveform ? extractedWaveform.peaks : [],
      });
    } catch (err: unknown) {
      // console.error("File staging error:", err);
      alert(err instanceof Error ? err.message : String(err) || "Failed to load audio file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmSubmitStagedEntry = async () => {
    if (!stagedBeat || !stagedBeat.title.trim() || !battle) return;
    setIsUploading(true);
    try {
      const uploaderId = currentUser?.id || "guest";
      const uploaderTag = currentUser?.nickname || "Producer";
      const finalTitle = stagedBeat.title.trim();

      // If user had a previous submission, delete it first to ensure maximum 1 entry per producer
      const existing = submissions.find((s) => s.userId === uploaderId);
      if (existing) {
        await battleService.deleteSubmission(existing.id, battle.id, currentUser?.id);
      }

      // Upload to Supabase Storage
      const { url, error: uploadErr } = await storageService.uploadAudio(
        stagedBeat.file,
        "submissions",
        `${battle.id}-${uploaderId}-${Date.now()}`
      );

      if (!url) {
        throw new Error(uploadErr || "Failed to upload audio to cloud storage. Please ensure your file is under 50 MB.");
      }

      const finalAudioUrl = url;
      if (stagedBeat.waveformPeaks && stagedBeat.waveformPeaks.length > 0) {
        globalWaveformCache.set(finalAudioUrl, {
          peaks: stagedBeat.waveformPeaks,
          duration: stagedBeat.duration,
        });
      }

      // Register submission in database service
      const newSub = battleService.submitEntry({
        id: `sub-${battle.id}-${uploaderId}-${Date.now()}`,
        battleId: battle.id,
        userId: uploaderId,
        beatmakerTag: uploaderTag,
        beatTitle: finalTitle,
        audioUrl: finalAudioUrl,
        waveform: stagedBeat.waveformPeaks,
        duration: stagedBeat.duration,
        submittedAt: new Date().toISOString(),
      });

      setMyEntry({
        id: newSub.id,
        title: newSub.beatTitle,
        audioUrl: newSub.audioUrl,
        duration: newSub.duration,
        waveformPeaks: newSub.waveform,
        bpm: newSub.bpm,
        submittedAt: newSub.submittedAt,
      });

      setStagedBeat(null);
      refreshBattleData();
    } catch (err: unknown) {
      // console.error("Submission failed:", err);
      alert(err instanceof Error ? err.message : String(err) || "Submission failed");
    } finally {
      setIsUploading(false);
    }
  };

  const [isEditingMyEntryTitle, setIsEditingMyEntryTitle] = useState(false);
  const [editingMyEntryTitle, setEditingMyEntryTitle] = useState("");

  const handleStartEditTitle = () => {
    if (!myEntry) return;
    setEditingMyEntryTitle(myEntry.title);
    setIsEditingMyEntryTitle(true);
  };

  const handleSaveEditedTitle = async () => {
    if (!myEntry || !editingMyEntryTitle.trim() || !battle) return;
    const newTitle = editingMyEntryTitle.trim();
    setIsUploading(true);
    try {
      await battleService.updateSubmissionTitle(myEntry.id, battle.id, newTitle);
      setMyEntry({
        ...myEntry,
        title: newTitle,
      });
      setIsEditingMyEntryTitle(false);
      refreshBattleData();
    } catch (err) {
      // console.error("Failed to update title:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMyEntry = async () => {
    if (!myEntry || !battle) return;
    pauseTrack();
    setIsUploading(true);
    try {
      await battleService.deleteSubmission(myEntry.id, battle.id, currentUser?.id);
      setMyEntry(null);
      setStagedBeat(null);
      refreshBattleData();
    } catch (err) {
      // console.error("Failed to remove entry:", err);
    } finally {
      setIsUploading(false);
    }
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
  const [sampleCurrentTimes, setSampleCurrentTimes] = useState<Record<string, number>>({});
  const [sampleDurations, setSampleDurations] = useState<Record<string, number>>({});
  const [scrubbingSample, setScrubbingSample] = useState<{ id: string; fraction: number } | null>(null);
  const isPointerDownSample = useRef<string | null>(null);
  const sampleAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Preload sample metadata so durations are immediately known
  useEffect(() => {
    if (battle?.samples && battle.samples.length > 0) {
      battle.samples.forEach((sample) => {
        if (sample.duration && sample.duration > 0) {
          setSampleDurations((prev) => ({ ...prev, [sample.id]: sample.duration }));
        }
        if (sample.audioUrl) {
          try {
            const probe = new Audio();
            probe.preload = "metadata";
            probe.src = sample.audioUrl;
            probe.onloadedmetadata = () => {
              if (probe.duration && isFinite(probe.duration) && probe.duration > 0) {
                setSampleDurations((prev) => ({ ...prev, [sample.id]: probe.duration }));
              }
            };
          } catch {}
        }
      });
    }
  }, [battle?.samples]);

  // Clean up all sample audio instances on unmount
  useEffect(() => {
    return () => {
      Object.values(sampleAudioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);

  const ensureSampleAudio = useCallback((sampleId: string, audioUrl: string): HTMLAudioElement => {
    let audio = sampleAudioRefs.current[sampleId];
    if (!audio) {
      const newAudio = new Audio(audioUrl);
      newAudio.preload = "auto";
      sampleAudioRefs.current[sampleId] = newAudio;

      newAudio.ontimeupdate = () => {
        if (isPointerDownSample.current !== sampleId) {
          const cur = newAudio.currentTime;
          const dur = (newAudio.duration && isFinite(newAudio.duration) && newAudio.duration > 0)
            ? newAudio.duration
            : (sampleDurations[sampleId] || 0);

          setSampleCurrentTimes((prev) => ({ ...prev, [sampleId]: cur }));
          if (dur > 0) {
            setSampleProgress((prev) => ({
              ...prev,
              [sampleId]: (cur / dur) * 100,
            }));
          }
        }
      };

      newAudio.onloadedmetadata = () => {
        if (newAudio.duration && isFinite(newAudio.duration) && newAudio.duration > 0) {
          setSampleDurations((prev) => ({ ...prev, [sampleId]: newAudio.duration }));
        }
      };

      newAudio.onended = () => {
        setPlayingSampleId(null);
        setSampleProgress((prev) => ({ ...prev, [sampleId]: 0 }));
        setSampleCurrentTimes((prev) => ({ ...prev, [sampleId]: 0 }));
      };

      audio = newAudio;
    }
    return audio;
  }, [sampleDurations]);

  const handleToggleSample = (sampleId: string, audioUrl: string) => {
    if (typeof navigator !== "undefined" && "audioSession" in navigator) {
      try {
        (navigator as any).audioSession.type = "playback";
      } catch {}
    }
    if (playingSampleId === sampleId) {
      const audio = sampleAudioRefs.current[sampleId];
      if (audio) {
        audio.pause();
      }
      setPlayingSampleId(null);
    } else {
      pauseTrack();
      if (playingSampleId && sampleAudioRefs.current[playingSampleId]) {
        sampleAudioRefs.current[playingSampleId]?.pause();
      }
      const audio = ensureSampleAudio(sampleId, audioUrl);
      audio.play().catch(() => {});
      setPlayingSampleId(sampleId);
    }
  };

  const getSampleFraction = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  };

  const handleSampleScrubberPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    sampleId: string,
    audioUrl: string,
    fallbackDuration: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    isPointerDownSample.current = sampleId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const frac = getSampleFraction(e);
    setScrubbingSample({ id: sampleId, fraction: frac });
    ensureSampleAudio(sampleId, audioUrl);
  };

  const handleSampleScrubberPointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    sampleId: string
  ) => {
    if (isPointerDownSample.current !== sampleId) return;
    const frac = getSampleFraction(e);
    setScrubbingSample({ id: sampleId, fraction: frac });
  };

  const handleSampleScrubberPointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    sampleId: string,
    audioUrl: string,
    fallbackDuration: number
  ) => {
    if (isPointerDownSample.current !== sampleId) return;
    isPointerDownSample.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const frac = getSampleFraction(e);
    setScrubbingSample(null);

    const audio = ensureSampleAudio(sampleId, audioUrl);
    const dur = (audio.duration && isFinite(audio.duration) && audio.duration > 0)
      ? audio.duration
      : (sampleDurations[sampleId] || fallbackDuration || 0);

    if (dur > 0) {
      const targetTime = frac * dur;
      audio.currentTime = targetTime;
      setSampleCurrentTimes((prev) => ({ ...prev, [sampleId]: targetTime }));
      setSampleProgress((prev) => ({ ...prev, [sampleId]: frac * 100 }));
    } else {
      const onLoaded = () => {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = frac * audio.duration;
          setSampleCurrentTimes((prev) => ({ ...prev, [sampleId]: frac * audio.duration }));
          setSampleProgress((prev) => ({ ...prev, [sampleId]: frac * 100 }));
        }
        audio.removeEventListener("loadedmetadata", onLoaded);
      };
      audio.addEventListener("loadedmetadata", onLoaded);
    }

    if (playingSampleId !== sampleId) {
      if (typeof navigator !== "undefined" && "audioSession" in navigator) {
        try {
          (navigator as any).audioSession.type = "playback";
        } catch {}
      }
      pauseTrack();
      if (playingSampleId && sampleAudioRefs.current[playingSampleId]) {
        sampleAudioRefs.current[playingSampleId]?.pause();
      }
      audio.play().catch(() => {});
      setPlayingSampleId(sampleId);
    }
  };

  const [showSubmitWarningModal, setShowSubmitWarningModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Lock page scrolling when any modal is open
  useBodyScrollLock(Boolean(submitError || showSubmitWarningModal));

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
  }, [battle?.phase]);

  const handleRateBeat = async (trackId: string, flames: number) => {
    if (isRatingsSubmitted || !battle) return; // Locked once submitted
    const updated = { ...ratings, [trackId]: flames };
    setRatings(updated);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const uId = currentUser?.id || visitorSeed;
    try {
      localStorage.setItem(`bnp_draft_ratings_${battle.id}_${uId}`, JSON.stringify(updated));
    } catch {}
    if (currentUser?.id) {
      await battleService.voteSubmission(trackId, battle.id, currentUser.id, flames);
    }
  };

  const handleJuryScoreChange = (subId: string, val: string) => {
    if (isJurySubmitted || !battle) return;
    setJuryScores((prev) => {
      const updated = { ...prev, [subId]: val };
      const uId = currentUser?.id || "judge";
      try {
        localStorage.setItem(`bnp_draft_jury_scores_${battle.id}_${uId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleJuryFeedbackChange = (subId: string, val: string) => {
    if (isJurySubmitted || !battle) return;
    setJuryFeedback((prev) => {
      const updated = { ...prev, [subId]: val };
      const uId = currentUser?.id || "judge";
      try {
        localStorage.setItem(`bnp_draft_jury_feedback_${battle.id}_${uId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClickSubmitRatings = () => {
    if (isRatingsSubmitted) return;
    if (currentVotesCount < requiredVotes) {
      setSubmitError(
        `You must rate at least ${requiredVotes} beats before submitting. You have rated ${currentVotesCount} so far. Please rate ${requiredVotes - currentVotesCount} more beats.`
      );
      return;
    }
    setSubmitError(null);
    setShowSubmitWarningModal(true);
  };

  const handleConfirmSubmitRatings = async () => {
    const targetBattleId = battle?.id || battleId;
    const effectiveUserId = currentUser?.id || (typeof window !== "undefined" ? localStorage.getItem("bnp_active_user_id") : null);
    if (!effectiveUserId || !targetBattleId) return;
    const cleanId = effectiveUserId.toLowerCase().trim();

    // Filter to only submissions that actually belong to this battle
    const validRatings: Record<string, number> = {};
    submissions.forEach((s) => {
      if (typeof ratings[s.id] === "number" && ratings[s.id] > 0) {
        validRatings[s.id] = ratings[s.id];
      }
    });

    setIsRatingsSubmitted(true);
    setShowSubmitWarningModal(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`bnp_ratings_locked_${targetBattleId}_${cleanId}`, "true");
        localStorage.setItem(`bnp_submitted_ratings_${targetBattleId}_${cleanId}`, JSON.stringify(validRatings));
      } catch {}
    }
    await battleService.submitUserRatings(targetBattleId, cleanId, validRatings);
    refreshBattleData();
  };

  const handleUnlockRatings = async () => {
    const targetBattleId = battle?.id || battleId;
    const effectiveUserId = currentUser?.id || (typeof window !== "undefined" ? localStorage.getItem("bnp_active_user_id") : null);
    if (!effectiveUserId || !targetBattleId) return;
    const cleanId = effectiveUserId.toLowerCase().trim();
    setIsRatingsSubmitted(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`bnp_ratings_locked_${targetBattleId}_${cleanId}`);
      } catch {}
    }
    await battleService.unlockUserRatings(targetBattleId, cleanId);
    refreshBattleData();
  };

  const handlePublishJuryBallot = async () => {
    if (!battle) return;
    const judgeId = currentUser?.id || "judge";
    const judgeName = currentUser?.nickname || "Judge";

    // Ensure all finalist tracks have a numerical score assigned (default to 0.00 if unadjusted)
    const finalizedScores: Record<string, string> = { ...juryScores };
    finalistSubmissions.forEach((sub) => {
      if (finalizedScores[sub.id] === undefined || finalizedScores[sub.id] === "") {
        finalizedScores[sub.id] = "0.00";
      }
    });

    await battleService.submitJuryBallot(battle.id, judgeId, judgeName, finalizedScores, juryFeedback);
    setIsJurySubmitted(true);
    refreshBattleData();
  };

  const handleUnlockJuryBallot = async () => {
    if (!battle) return;
    const judgeId = currentUser?.id || "judge";
    const judgeName = currentUser?.nickname || "Judge";
    setIsJurySubmitted(false);
    await battleService.unsubmitJuryBallot(battle.id, judgeId, judgeName);
    refreshBattleData();
  };

  const isTrackUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevTrack = blindTracks[index - 1];
    return !!ratings[prevTrack.id];
  };

  if (!battle || battle.id !== battleId) {
    if (!hasChecked) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      );
    }
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4 animate-in fade-in duration-200">
        <h1 className="text-3xl font-black text-brand">404</h1>
        <h2 className="text-xl font-bold text-white">Battle Not Found</h2>
        <p className="text-sm text-neutral-400 max-w-md">
          The battle you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/battles"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-black rounded-lg font-bold text-sm hover:bg-brand/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Battles
        </Link>
      </div>
    );
  }

  const hasJudges = Boolean(
    (Array.isArray(battle.judges) && battle.judges.length > 0) ||
    (Array.isArray(battle.judgeDetails) && battle.judgeDetails.length > 0)
  );

  const phasesList: { key: BattlePhase; label: string; number: string }[] = hasJudges
    ? [
        { key: "submission", label: "Submissions", number: "01" },
        { key: "rating", label: "Public Rating", number: "02" },
        { key: "judging", label: "Jury Evaluation", number: "03" },
        { key: "completed", label: "Results", number: "04" },
      ]
    : [
        { key: "submission", label: "Submissions", number: "01" },
        { key: "rating", label: "Public Rating", number: "02" },
        { key: "completed", label: "Results", number: "03" },
      ];

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300">
      
      {/* SECTION 1: HERO & PHASE HEADER */}
      <section className="space-y-4">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between h-9">
          <Link
            href="/battles"
            className="inline-flex items-center gap-2 text-sm text-[#888888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Battles</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="bg-[#181818] rounded-[28px] p-4 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden shadow-xl">
          
          {/* Cover Art Thumbnail (Matches Archive Card Dimensions Across All Breakpoints) */}
          <div className="battle-hero-cover aspect-square rounded-xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl mx-auto md:mx-0">
            <Image
              src={battle.coverImage || "/covers/default-battle.png"}
              alt={battle.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Middle: Content + Bottom date */}
          <div className="flex-1 w-full min-w-0 space-y-3.5 flex flex-col justify-between self-stretch">
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                  {battle.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs text-[#A0A0A0] inline-flex items-center justify-center text-center leading-none">
                    {battle.totalSubmissions} Total Entries
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-sm text-[#A0A0A0]">
                <p>Hosted by: <span className="text-white">{Array.isArray(battle.hosts) && battle.hosts.length > 0 ? battle.hosts.join(", ") : "Nerub"}</span></p>
                {hasJudges && Array.isArray(battle.judges) && battle.judges.length > 0 && (
                  <p>Judged by: <span className="text-white">{battle.judges.join(", ")}</span></p>
                )}
              </div>

              {battle.description && (
                <p className="text-sm text-[#D1D1D1] leading-relaxed">
                  {battle.description}
                </p>
              )}
            </div>

            {/* Bottom Row inside Main Battle Card */}
            <div className="pt-2">
              {battle.phase === "completed" ? (
                battle.endedAt ? (
                  <div className="text-xs text-[#888888]">
                    Ended on {new Date(battle.endedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </div>
                ) : null
              ) : (
                <div className="text-xs text-[#888888]">
                  Submissions close {battle.submissionEndsAt ? new Date(battle.submissionEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"} • Public rating open until {battle.ratingEndsAt ? new Date(battle.ratingEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Stream Jury Session Card */}
          {battle.youtubeVodUrl && battle.youtubeVodUrl.trim() && (
            <div className="w-full sm:w-auto md:w-56 shrink-0 flex flex-col items-start sm:items-end justify-end self-stretch gap-3.5 mt-auto">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(true)}
                className="flex flex-col gap-2.5 p-3 rounded-[24px] bg-[#121212] hover:bg-[#1A1A1A] text-zinc-300 hover:text-white transition-all select-none cursor-pointer w-full sm:w-56 shrink-0 shadow-md group text-left mt-auto"
                title="Watch Live Stream Jury Session"
              >
                {/* Text Header Above Thumbnail */}
                <div className="flex items-center justify-between gap-1.5 px-0.5 w-full">
                  <span className="text-xs font-bold leading-none text-zinc-300 group-hover:text-white transition-colors">
                    Live Stream Jury Session
                  </span>
                  <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">↗</span>
                </div>

                {/* 16:9 Video Thumbnail Preview (Concentric R=24px, p=12px, r=12px) */}
                {(() => {
                  const ytId = getYouTubeId(battle.youtubeVodUrl);
                  const thumbnailUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
                  return thumbnailUrl ? (
                    <div className="w-full aspect-video rounded-xl overflow-hidden relative shrink-0 bg-black/50">
                      <Image
                        src={thumbnailUrl}
                        alt="Live Stream Thumbnail"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : null;
                })()}
              </button>
            </div>
          )}
        </div>

        {/* Battle Phases Timeline Indicator - Full Width between Hero Card and Beats */}
        <div className="w-full bg-[#181818] p-1.5 rounded-2xl sm:rounded-3xl flex items-center gap-1 sm:gap-1.5 select-none overflow-hidden">
          {phasesList.map((p) => {
            const isCurrent = battle.phase === p.key;
            return (
              <div
                key={p.key}
                className={`py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  isCurrent
                    ? "flex-1 bg-[#7B61FF] text-white shadow-md"
                    : "shrink-0 sm:flex-1 text-[#555555] opacity-50 cursor-default"
                }`}
              >
                <span className={`text-xs ${isCurrent ? "text-white/80" : "text-[#444444]"}`}>
                  {p.number}
                </span>
                <span className={`whitespace-nowrap ${isCurrent ? "inline" : "hidden sm:inline"}`}>
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PHASE 1: SUBMISSIONS OPEN (RULES & COMPACT SAMPLES ON LEFT, SUBMIT ON RIGHT) */}
      {/* ========================================================================= */}
      {battle.phase === "submission" && (
        <div className="space-y-4">
          
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${myEntry ? "items-start" : "items-stretch"}`}>
            
            {/* Left Column: Rules on Top, Compact Samples Below */}
            <div className="lg:col-span-6 space-y-4 flex flex-col">
              
              {/* 1. Rules (Directly on website background) */}
              <div className="space-y-3.5">
                <h3 className="text-2xl font-bold text-white">
                  Rules
                </h3>

                <div className="space-y-2.5 pt-1">
                  {[
                    "Maximum 1 entry per producer.",
                    "Track length must not exceed 3 minutes.",
                    "File type must be WAV or MP3.",
                    "Use at least 1 of the samples (if) provided.",
                    ...(battle.rules || []).map((r) => r.replace(/^\d+\.\s*/, "")),
                  ].map((rule, idx) => (
                    <div key={idx} className="bg-[#181818] p-3.5 rounded-xl">
                      <p className="text-xs text-[#D1D1D1]">{idx + 1}. {rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Sample(s) (Directly on website background) */}
              {battle.samples && battle.samples.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-bold text-white">
                      Sample(s)
                    </h3>

                    <button
                      type="button"
                      onClick={downloadSamples}
                      disabled={isDownloadingSamples}
                      className="px-4 py-2 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all w-fit shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      {isDownloadingSamples ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>{isDownloadingSamples ? "Zipping..." : "Download All"}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {battle.samples.map((sample) => {
                      const isPlaying = playingSampleId === sample.id;
                      const isScrubbingThis = scrubbingSample?.id === sample.id;
                      const duration = sampleDurations[sample.id] || sample.duration || 0;
                      const currentTime = sampleCurrentTimes[sample.id] || 0;

                      const displayProgress = isScrubbingThis
                        ? scrubbingSample.fraction
                        : duration > 0
                        ? (currentTime / duration)
                        : 0;

                      const displayCurrentTime = isScrubbingThis
                        ? scrubbingSample.fraction * duration
                        : currentTime;

                      return (
                        <div
                          key={sample.id}
                          className="relative overflow-hidden rounded-xl p-3 sm:p-3.5 transition-all bg-[#181818]"
                        >
                          <div className="flex items-center gap-3 w-full">
                            {/* Play / Pause button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSample(sample.id, sample.audioUrl)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-md ${
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

                            {/* Middle: Title & Live Time + Interactive Scrubber */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs sm:text-sm font-bold text-white truncate" title={sample.title}>
                                  {sample.title}
                                </span>
                                <span className="text-[11px] font-medium text-[#A7A7A7] tabular-nums shrink-0 select-none">
                                  {formatTime(displayCurrentTime)} / {formatTime(duration)}
                                </span>
                              </div>

                              {/* Interactive Scrubber Bar */}
                              <div
                                onPointerDown={(e) => handleSampleScrubberPointerDown(e, sample.id, sample.audioUrl, sample.duration)}
                                onPointerMove={(e) => handleSampleScrubberPointerMove(e, sample.id)}
                                onPointerUp={(e) => handleSampleScrubberPointerUp(e, sample.id, sample.audioUrl, sample.duration)}
                                onPointerCancel={(e) => handleSampleScrubberPointerUp(e, sample.id, sample.audioUrl, sample.duration)}
                                className="py-1.5 -my-1.5 flex items-center relative cursor-pointer group select-none touch-none"
                                role="slider"
                                aria-label={`${sample.title} playback scrubber`}
                                aria-valuemin={0}
                                aria-valuemax={duration}
                                aria-valuenow={Math.round(displayCurrentTime)}
                              >
                                {/* Track Bar */}
                                <div className="w-full h-1.5 bg-[#2E2E2E] rounded-full overflow-hidden relative">
                                  <div
                                    className="h-full bg-[#7B61FF] rounded-full transition-none"
                                    style={{ width: `${Math.max(0, Math.min(100, displayProgress * 100))}%` }}
                                  />
                                </div>

                                {/* Scrubber Thumb */}
                                <div
                                  className={`w-3 h-3 bg-white rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-md pointer-events-none transition-transform duration-100 ${
                                    isScrubbingThis ? "scale-125" : "group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                  }`}
                                  style={{
                                    left: `${Math.max(0, Math.min(100, displayProgress * 100))}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Download Button for individual sample (Icon only, purple container matching Download All) */}
                            <button
                              type="button"
                              onClick={() => handleDownloadSingleSample(sample.id, sample.audioUrl, sample.title)}
                              disabled={downloadingSampleId === sample.id}
                              className="w-8 h-8 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                              title={`Download ${sample.title}`}
                              aria-label={`Download ${sample.title}`}
                            >
                              {downloadingSampleId === sample.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Submit Your Entry Container (Reduces in size when submitted or staged) */}
            <div className={`lg:col-span-6 bg-[#181818] rounded-[28px] p-4 space-y-4 flex flex-col ${(myEntry || stagedBeat) ? "h-auto" : "h-full justify-between"}`}>
              <div className="space-y-4 flex-1 flex flex-col">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#FF5E3A]" />
                  <span>Submit your entry</span>
                </h3>

                {isUserJudge ? (
                  <div className="flex-1 min-h-[260px] rounded-xl p-6 bg-[#121212]/70 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#7B61FF]/15 flex items-center justify-center text-[#7B61FF]">
                      <Star className="w-6 h-6 fill-current" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-white">Assigned as Judge</p>
                      <p className="text-xs text-[#888888] max-w-sm">
                        You are assigned as an official judge for this battle and cannot submit an entry. You will evaluate the finalists in Phase 03.
                      </p>
                    </div>
                  </div>
                ) : !myEntry && stagedBeat ? (
                  <div className="bg-[#121212] p-5 sm:p-7 rounded-xl space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[#7B61FF] text-lg font-bold">
                        <Upload className="w-4 h-4" />
                        <span>Confirm Beat Details</span>
                      </div>

                      <button
                        onClick={() => setStagedBeat(null)}
                        className="text-xs font-bold px-3 py-1.5 rounded-3xl bg-[#1A1A1A] hover:bg-zinc-800 text-[#888888] hover:text-white transition-all cursor-pointer"
                      >
                        Change File
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <span>Beat Name</span>
                        <span className="text-[#FF5E3A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={stagedBeat.title}
                        onChange={(e) => setStagedBeat({ ...stagedBeat, title: e.target.value })}
                        placeholder="Enter your beat title..."
                        className="w-full px-4 py-3 rounded-xl bg-[#1A1A1A] border border-[#333333] focus:border-[#7B61FF] text-white text-sm outline-none transition-all"
                        autoFocus
                      />
                      <p className="text-xs text-[#888888]">
                        Note: You don&apos;t have to add your beatmaker / producer name in the beat title.
                      </p>
                    </div>

                    <div className="pt-1">
                      <AudioWaveformPlayer
                        id="staged-preview"
                        title={stagedBeat.title || "Preview"}
                        artist={currentUser?.nickname || "Your Entry"}
                        audioUrl={stagedBeat.audioUrl}
                        duration={stagedBeat.duration}
                        waveformPeaks={stagedBeat.waveformPeaks}
                        compact={true}
                      />
                    </div>

                    <button
                      onClick={handleConfirmSubmitStagedEntry}
                      disabled={isUploading || !stagedBeat.title.trim()}
                      className="w-full py-3.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold shadow-xl active:scale-98 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Uploading & Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Submit Entry</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : !myEntry ? (
                  <label
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex-1 min-h-[300px] rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group ${
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
                      <p className="text-lg font-bold text-white">
                        {isUploading ? "Loading audio..." : "Drag & drop your beat audio file here"}
                      </p>
                      {!isUploading && (
                        <p className="text-xs text-zinc-400">
                          or <span className="text-[#7B61FF] underline underline-offset-2">browse files</span> from your device
                        </p>
                      )}
                    </div>
                  </label>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`bg-[#121212] p-5 sm:p-7 rounded-xl space-y-5 transition-all ${
                      isDraggingOver ? "ring-2 ring-[#7B61FF] bg-[#7B61FF]/10" : ""
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-lg font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Submission Received</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {!isEditingMyEntryTitle && (
                            <button
                              onClick={handleStartEditTitle}
                              disabled={isUploading}
                              className="text-xs font-bold px-3.5 py-1.5 rounded-3xl bg-[#1A1A1A] hover:bg-[#7B61FF] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Title</span>
                            </button>
                          )}

                          <button
                            onClick={handleRemoveMyEntry}
                            disabled={isUploading}
                            className="text-xs font-bold px-3 py-1.5 rounded-3xl bg-[#1A1A1A] hover:bg-red-500/20 text-[#888888] hover:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isUploading ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </div>

                      {isEditingMyEntryTitle ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={editingMyEntryTitle}
                            onChange={(e) => setEditingMyEntryTitle(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-3xl bg-[#1A1A1A] border border-[#333333] focus:border-[#7B61FF] text-white text-sm outline-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveEditedTitle}
                              disabled={!editingMyEntryTitle.trim() || isUploading}
                              className="px-4 py-1.5 rounded-3xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingMyEntryTitle(false)}
                              className="px-3 py-1.5 rounded-3xl bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white font-bold text-2xl truncate">{myEntry.title}</p>
                      )}
                    </div>

                    <div className="pt-1">
                      <AudioWaveformPlayer
                        id={myEntry.id}
                        title={myEntry.title}
                        artist={currentUser?.nickname || "Your Entry"}
                        audioUrl={myEntry.audioUrl}
                        duration={myEntry.duration}
                        waveformPeaks={myEntry.waveformPeaks}
                        bpm={myEntry.bpm}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}      {/* ========================================================================= */}
      {/* PHASE 2: PUBLIC RATING PHASE (ACTUAL BATTLE SUBMISSIONS WITH FLAME-ONLY RATING) */}
      {/* ========================================================================= */}
      {battle.phase === "rating" && (
        <div className="space-y-4">
          
          {/* Anti-Bias Info (Directly on website background) */}
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Public Rating Phase
            </h3>
            <p className="text-xs text-[#888888]">
              All producer names and avatars are hidden during this phase to ensure 100% fair and unbiased listening.
            </p>
          </div>

          {blindTracks.length === 0 ? (
            <div className="bg-[#181818] rounded-[28px] p-8 text-center space-y-2">
              <p className="text-white text-lg font-bold">No Submissions Yet</p>
              <p className="text-xs text-[#888888]">
                No beats have been submitted for this battle yet. When beats are entered, they will appear here anonymized for fair public rating.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {blindTracks.map((track, idx) => {
                const unlocked = isTrackUnlocked(idx);
                const currentFlames = ratings[track.id] || 0;

                return (
                  <div
                    key={track.id}
                    className={`bg-[#181818] rounded-[28px] p-4 ${
                      unlocked ? "" : "opacity-40"
                    }`}
                  >
                    {unlocked ? (
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-lg">{track.placeholder}</span>
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
                          artist="Blind Battle Entry"
                          audioUrl={track.audioUrl}
                          waveformPeaks={track.waveformPeaks}
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
          )}

          {/* Bottom Submit Action */}
          {blindTracks.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-3 pt-6 pb-6">
              {isRatingsSubmitted ? (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="flex items-center gap-2.5 px-6 py-3.5 rounded-3xl bg-emerald-500/15 text-emerald-300 text-lg font-bold shadow-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Ratings Submitted & Locked ✓</span>
                  </div>
                  <button
                    onClick={handleUnlockRatings}
                    className="px-5 py-3.5 rounded-3xl bg-[#202020] hover:bg-[#282828] text-[#D1D1D1] hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    Unlock & Edit Ratings
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleClickSubmitRatings}
                  className="px-8 py-3.5 rounded-3xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold shadow-xl transition-all active:scale-95 cursor-pointer"
                >
                  <span>Submit Ratings</span>
                </button>
              )}
            </div>
          )}

          {/* INSUFFICIENT RATINGS ERROR MODAL */}
          <ClientPortal>
            {submitError && (
              <div 
                onClick={() => setSubmitError(null)}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#181818] rounded-[28px] max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl relative cursor-default"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-[#FF5E3A] flex items-center gap-2">
                      <span>More Ratings Required</span>
                    </h3>
                    <p className="text-xs text-[#D1D1D1] leading-relaxed">
                      {submitError}
                    </p>
                  </div>

                  <div className="bg-[#121212] p-4 rounded-3xl space-y-1.5 text-xs text-[#A0A0A0]">
                    <div className="flex items-center justify-between">
                      <span>Beats Rated So Far:</span>
                      <strong className="text-white">{currentVotesCount} / {totalEntries}</strong>
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
          </ClientPortal>

          {/* SUBMIT RATINGS FINAL LOCK WARNING & CONFIRMATION MODAL */}
          <ClientPortal>
            {showSubmitWarningModal && (
              <div 
                onClick={() => setShowSubmitWarningModal(false)}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#181818] rounded-[28px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative cursor-default"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#7B61FF]" />
                      <span>Submit & Lock Your Ratings</span>
                    </h3>
                    <p className="text-xs text-[#D1D1D1] leading-relaxed">
                      Once submitted, your ratings will be <strong className="text-white font-bold">final and permanently locked</strong>. You will not be able to edit them afterwards.
                    </p>
                  </div>

                  <div className="bg-[#121212] p-4 rounded-3xl space-y-1.5 text-xs text-[#A0A0A0]">
                    <div className="flex items-center justify-between">
                      <span>Total Beats Rated:</span>
                      <strong className="text-white">{currentVotesCount} / {totalEntries}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Qualification Status:</span>
                      <span className="text-emerald-400 font-bold">Verified & Counted ✓</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowSubmitWarningModal(false)}
                      className="px-5 py-2.5 rounded-xl bg-[#121212] hover:bg-[#202020] text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      onClick={handleConfirmSubmitRatings}
                      className="px-6 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <span>Confirm & Lock Ratings</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </ClientPortal>

        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: BLIND JURY EVALUATION */}
      {/* ========================================================================= */}
      {battle.phase === "judging" && (
        <div className="space-y-6">
          
          {/* Jury Portal Top Header & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* Left Column: Title, Subtitle, Action Button */}
            <div className="lg:col-span-7 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {isUserJudge ? "Jury Evaluation Portal" : "Jury Evaluation"}
                </h3>

                <p className="text-xs text-[#888888] mt-1">
                  {isUserJudge
                    ? `Logged in as authorized judge (${currentUser?.nickname || "Judge"}). Score the finalists below.`
                    : "The assigned judges are currently reviewing and scoring the finalist submissions."}
                </p>
              </div>

              {isUserJudge && (
                <div className="pt-2">
                  {isJurySubmitted ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 font-bold text-xs shadow-sm">
                        Scores Submitted ✓
                      </div>
                      <button
                        onClick={handleUnlockJuryBallot}
                        className="px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] text-[#D1D1D1] hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                      >
                        Unlock & Edit Scores
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublishJuryBallot}
                      className="px-7 py-3 rounded-xl bg-[#7B61FF] hover:bg-[#684DE6] text-white font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Submit Scores
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Assigned Judges stacked in a Column */}
            {(() => {
              const assignedJudgesList = (
                battle.judgeDetails && battle.judgeDetails.length > 0
                  ? battle.judgeDetails
                  : (battle.judges || []).map((j) => ({ name: typeof j === "string" ? j : "", email: "" }))
              ).filter((j) => (j.name && j.name.trim()) || (j.email && j.email.trim()));

              const completedJudgesCount = assignedJudgesList.filter(
                (j) =>
                  (j.name && submittedJudgeNames.has(j.name.toLowerCase().trim())) ||
                  (j.email && submittedJudgeNames.has(j.email.toLowerCase().trim()))
              ).length;

              return (
                <div className="lg:col-span-5 bg-[#181818] p-4 rounded-[28px] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Assigned Judges</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {completedJudgesCount} / {assignedJudgesList.length} Judges Submitted
                    </span>
                  </div>

                  <div className="space-y-2">
                    {assignedJudgesList.map((j) => {
                      const isMe = Boolean(
                        currentUser && (
                          (j.email && j.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                          (j.name && j.name.toLowerCase() === currentUser.nickname.toLowerCase())
                        )
                      );
                      const isDone = Boolean(
                        (j.name && submittedJudgeNames.has(j.name.toLowerCase().trim())) ||
                        (j.email && submittedJudgeNames.has(j.email.toLowerCase().trim())) ||
                        (isJurySubmitted && isMe)
                      );

                      return (
                        <div key={j.email || j.name} className="bg-[#121212] p-3 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${isDone ? "bg-emerald-500" : "bg-[#FF5E3A] animate-pulse"}`} />
                            <span className="text-xs font-bold text-white">
                              {j.name || j.email}{isMe ? " (You)" : ""}
                            </span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-[#FF5E3A]/20 text-[#FF5E3A]"}`}>
                            {isDone ? "Submitted ✓" : "In Progress"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Anonymized Top Finalists list (triaged from Phase 2 public rating) */}
          {finalistSubmissions.length === 0 ? (
            <div className="bg-[#181818] rounded-3xl p-8 text-center space-y-2">
              <p className="text-white text-lg font-bold">No Finalists Yet</p>
              <p className="text-xs text-[#888888]">
                There are currently no finalist submissions to evaluate for this battle.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {finalistSubmissions.map((sub, idx) => {
                const scoreVal = juryScores[sub.id] !== undefined ? juryScores[sub.id] : "";
                const feedbackVal = juryFeedback[sub.id] !== undefined ? juryFeedback[sub.id] : "";
                const blindTitle = `Finalist ${idx < 9 ? "0" + (idx + 1) : idx + 1}`;

                return (
                  <div
                    key={sub.id}
                    className="bg-[#181818] rounded-[28px] p-4 space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-white text-lg">{blindTitle}</h4>
                      </div>
                    </div>

                    <AudioWaveformPlayer
                      id={`jury-${sub.id}`}
                      title={blindTitle}
                      artist="Anonymous Finalist"
                      audioUrl={sub.audioUrl}
                      duration={sub.duration}
                      waveformPeaks={sub.waveform}
                      bpm={sub.bpm}
                      compact={true}
                    />

                    {/* Judge Evaluation Controls (Only visible for Judges, disabled once submitted) */}
                    {isUserJudge && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-1 items-center">
                        {/* Score Slider */}
                        <div className="md:col-span-5 flex items-center gap-3 bg-[#121212] px-4 py-2.5 rounded-xl">
                          <span className="text-xs text-[#888888] font-bold shrink-0">Score:</span>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.05"
                            disabled={isJurySubmitted}
                            value={typeof scoreVal === "number" || (typeof scoreVal === "string" && scoreVal !== "") ? Number(scoreVal) : 0}
                            onChange={(e) => handleJuryScoreChange(sub.id, parseFloat(e.target.value).toFixed(2))}
                            className={`w-full h-2 bg-[#252525] rounded-3xl appearance-none accent-[#7B61FF] ${isJurySubmitted ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                          />
                          <div className="flex items-center gap-1 text-[#7B61FF] shrink-0">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-bold min-w-[32px] text-right">
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
                            onChange={(e) => handleJuryFeedbackChange(sub.id, e.target.value)}
                            className={`w-full bg-[#121212] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#555555] focus:outline-none ${isJurySubmitted ? "opacity-70 cursor-not-allowed" : ""}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4: RESULTS & LEADERBOARD */}
      {/* ========================================================================= */}
      {battle.phase === "completed" && (
        <div className="space-y-4">
          
          {/* Leaderboard Cards */}
          {submissions.length === 0 ? (
            <div className="bg-[#181818] rounded-3xl p-8 text-center space-y-2">
              <p className="text-white text-lg font-bold">No Results Recorded</p>
              <p className="text-xs text-[#888888]">
                No submissions or rankings have been published for this battle yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...submissions]
                .sort((a, b) => {
                  if (hasJudges) {
                    const aScore = typeof a.juryScore === "number" ? a.juryScore : -1;
                    const bScore = typeof b.juryScore === "number" ? b.juryScore : -1;
                    if (bScore !== aScore) return bScore - aScore;
                    const aFlame = typeof a.flameRating === "number" ? a.flameRating : -1;
                    const bFlame = typeof b.flameRating === "number" ? b.flameRating : -1;
                    if (bFlame !== aFlame) return bFlame - aFlame;
                    return (a.rank || 999) - (b.rank || 999);
                  } else {
                    const aFlame = typeof a.flameRating === "number" ? a.flameRating : -1;
                    const bFlame = typeof b.flameRating === "number" ? b.flameRating : -1;
                    if (bFlame !== aFlame) return bFlame - aFlame;
                    const aVotes = typeof a.totalVotes === "number" ? a.totalVotes : 0;
                    const bVotes = typeof b.totalVotes === "number" ? b.totalVotes : 0;
                    if (bVotes !== aVotes) return bVotes - aVotes;
                    return (a.rank || 999) - (b.rank || 999);
                  }
                })
                .map((sub, idx) => {
                  const rank = sub.rank || (idx + 1);
                  const hasFlame = typeof sub.flameRating === "number" && !isNaN(sub.flameRating) && sub.flameRating >= 1;
                  const hasJury = typeof sub.juryScore === "number" && !isNaN(sub.juryScore) && sub.juryScore > 0;

                  const prod = producerService.getProducerById(sub.userId) || producerService.getProducerByTag(sub.beatmakerTag);
                  const displayTag = prod?.nickname || sub.beatmakerTag || "Producer";
                  const displayAvatar =
                    (prod?.avatarUrl && !prod.avatarUrl.includes("supabase.co/storage"))
                      ? prod.avatarUrl
                      : "/avatars/default-avatar.png";
                  const profileId = sub.userId || prod?.id || "guest";
                  const displayTitle =
                    sub.beatTitle && sub.beatTitle !== battle.title && !sub.beatTitle.startsWith("Beat Battle #")
                      ? sub.beatTitle
                      : (sub.beatTitle || `${displayTag}'s Beat`);

                  return (
                    <div
                      key={sub.id}
                      className="bg-[#181818] rounded-[28px] p-4 space-y-3.5 shadow-md relative"
                    >
                      {/* Header Row: [Badge] [Avatar] [Title + Producer] on Left, [Scores/BPM] on Right */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                        
                        {/* Left: Beatmaker Avatar (with Corner Medal Badge) + Info (Title & Beatmaker Name) */}
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 pr-14 sm:pr-0">
                          {/* Beatmaker Avatar with Corner Medal */}
                          <div className="relative shrink-0">
                            <Link
                              href={`/${profileId}`}
                              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden relative block hover:opacity-80 transition-opacity bg-[#121212]"
                              title={rank <= 3 ? `${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} Place: ${displayTag}` : displayTag}
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

                            {/* Corner Medal Badge */}
                            <div
                              className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full text-center leading-[18px] font-black ring-[1.5px] ring-[#181818] select-none pointer-events-none ${
                                rank === 1
                                  ? "bg-[#FFC837] text-[#9A5800]"
                                  : rank === 2
                                  ? "bg-[#DDE3EA] text-[#5A6B82]"
                                  : rank === 3
                                  ? "bg-[#D97736] text-[#8A3712]"
                                  : "bg-[#242424] text-zinc-300"
                              } ${rank >= 10 ? "text-[9px] tracking-tight" : "text-[11px]"}`}
                              title={rank <= 3 ? `${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} Place` : `Place #${rank}`}
                            >
                              {rank}
                            </div>
                          </div>

                          {/* Beat Name & Beatmaker Name */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-white text-lg leading-snug break-words [overflow-wrap:anywhere]">
                              {displayTitle}
                            </h3>
                            <Link
                              href={`/${profileId}`}
                              className="text-xs text-[#7B61FF] hover:underline font-bold block truncate mt-0.5"
                            >
                              {displayTag}
                            </Link>
                          </div>
                        </div>

                        {/* Right: Scores & BPM */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-xs font-bold flex-wrap select-none self-start sm:self-center">
                          {sub.bpm ? (
                            <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#121212] text-[#888888] select-none inline-flex items-center justify-center text-center leading-none">
                              {sub.bpm} BPM
                            </span>
                          ) : null}

                          {hasJury && (
                            <div
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#7B61FF]/15 text-[#7B61FF] font-bold text-xs inline-flex items-center justify-center leading-none"
                              title="Jury Score Average"
                            >
                              <Star className="w-3.5 h-3.5 fill-current text-[#7B61FF]" />
                              <span>{Number(sub.juryScore).toFixed(2)}</span>
                              <span className="text-[11px] text-[#A0A0A0]">Jury Avg</span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Public Rating Average — pinned top-right corner */}
                      {hasFlame && (
                        <Tooltip content="Public Rating Average">
                          <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-[#FF5E3A] font-bold select-none cursor-default leading-none z-10">
                            <Flame className="w-4 h-4 fill-current" />
                            <span>{Number(sub.flameRating).toFixed(2)}</span>
                          </div>
                        </Tooltip>
                      )}

                      {/* Waveform Scrubber with real audio */}
                      <AudioWaveformPlayer
                        id={`res-${sub.id}`}
                        title={displayTitle}
                        artist={displayTag}
                        artistId={profileId}
                        coverUrl={battle.coverImage}
                        audioUrl={sub.audioUrl}
                        duration={sub.duration}
                        waveformPeaks={sub.waveform}
                        bpm={sub.bpm}
                        compact={true}
                      />

                      {/* Judge Feedbacks (Multi-judge support: only display if written feedback was provided) */}
                      {(() => {
                        const writtenFeedbacks = (sub.juryFeedbacks || [])
                          .filter((f) => f.feedback && f.feedback.trim().length > 0)
                          .map((f) => ({
                            feedback: f.feedback!.trim(),
                            judgeName: f.judgeName || "Judge",
                          }));

                        const fallbackFeedback =
                          sub.juryFeedback && sub.juryFeedback.trim().length > 0
                            ? [{ feedback: sub.juryFeedback.trim(), judgeName: sub.judgeName || "Judge" }]
                            : [];

                        const finalFeedbacks = writtenFeedbacks.length > 0 ? writtenFeedbacks : fallbackFeedback;

                        if (finalFeedbacks.length === 0) return null;

                        return (
                          <div className="space-y-1.5 pt-1">
                            {finalFeedbacks.map((f, fIdx) => (
                              <div
                                key={fIdx}
                                className="bg-[#121212] px-4 py-2.5 rounded-xl text-xs text-[#D1D1D1] italic"
                              >
                                "{f.feedback}" - <span className="text-[#888888] not-italic font-bold">{f.judgeName}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* Live Stream Jury Session Video Modal */}
      <ClientPortal>
        {isVideoModalOpen && battle.youtubeVodUrl && (
          <div
            onClick={() => setIsVideoModalOpen(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#181818] rounded-[28px] max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-4 sm:p-6 relative cursor-default"
            >
              {/* Modal Close Button */}
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setIsVideoModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#121212] text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer shrink-0 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Embedded 16:9 YouTube Player */}
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black relative shadow-inner">
                <iframe
                  src={
                    battle.youtubeVodUrl.includes("watch?v=")
                      ? `https://www.youtube-nocookie.com/embed/${battle.youtubeVodUrl.split("watch?v=")[1].split("&")[0]}?autoplay=1`
                      : battle.youtubeVodUrl.includes("/embed/")
                      ? `${battle.youtubeVodUrl}${battle.youtubeVodUrl.includes("?") ? "&" : "?"}autoplay=1`
                      : `https://www.youtube-nocookie.com/embed/${battle.youtubeVodUrl.split("/").pop()}?autoplay=1`
                  }
                  title={`${battle.title} Live Stream Jury Session`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end pt-1 text-xs">
                <a
                  href={battle.youtubeVodUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-bold flex items-center gap-2 shrink-0 transition-colors leading-none"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                </a>
              </div>
            </div>
          </div>
        )}
      </ClientPortal>

    </div>
  );
}
