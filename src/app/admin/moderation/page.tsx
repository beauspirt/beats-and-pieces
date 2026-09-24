"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Battle, ModerationFlag, UserProfile } from "@/lib/types";
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, Ban, AlertTriangle, 
  Flame, RefreshCw, Trophy, Swords, Zap, Check, ChevronDown, Clock, RotateCcw
} from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";
import { battleService, producerService, activityLogService } from "@/services";
import { supabase } from "@/lib/supabase";

interface ExtendedModerationFlag extends ModerationFlag {
  battleTitle: string;
  voterAvatar?: string;
}

export default function VotingModerationPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [selectedBattleId, setSelectedBattleId] = useState<string>("all");
  const [flags, setFlags] = useState<ExtendedModerationFlag[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "discarded">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [scanStats, setScanStats] = useState<{ totalVoters: number; totalBattles: number; lastScannedAt: string } | null>(null);

  // Load decision overrides from localStorage
  const loadDecisionOverrides = (): Record<string, "approved" | "discarded"> => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("bnp_moderation_decisions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const saveDecisionOverride = (flagId: string, status: "approved" | "discarded") => {
    if (typeof window === "undefined") return;
    try {
      const existing = loadDecisionOverrides();
      existing[flagId] = status;
      localStorage.setItem("bnp_moderation_decisions", JSON.stringify(existing));
    } catch {}
  };

  const clearAllDecisions = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("bnp_moderation_decisions");
    } catch {}
    setFlags((prev) => prev.map((f) => ({ ...f, status: "pending" })));
  };

  const resetFlagDecision = (flagId: string) => {
    if (typeof window === "undefined") return;
    try {
      const existing = loadDecisionOverrides();
      delete existing[flagId];
      localStorage.setItem("bnp_moderation_decisions", JSON.stringify(existing));
    } catch {}
    setFlags((prev) => prev.map((f) => (f.id === flagId ? { ...f, status: "pending" } : f)));
  };

  // Anomaly Scanner across battles
  const scanAnomalies = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      // 1. Sync fresh battles, submissions & producers
      await Promise.all([
        battleService.syncFromSupabase(),
        producerService.syncFromSupabase(),
      ]);
      const allBattles = battleService.getAllBattles();
      setBattles(allBattles);

      // 2. Fetch all ratings from Supabase
      const { data: dbRatings, error: rError } = await supabase
        .from("ratings")
        .select("id, battle_id, submission_id, voter_id, score, created_at");

      if (rError) {
        console.error("Error fetching ratings from Supabase:", rError);
        setErrorBanner(`Failed to load ratings: ${rError.message}`);
        setFlags([]);
        setIsLoading(false);
        return;
      }

      if (!dbRatings || dbRatings.length === 0) {
        console.warn("No ratings found in Supabase.");
        setFlags([]);
        setScanStats({ totalVoters: 0, totalBattles: 0, lastScannedAt: new Date().toLocaleTimeString() });
        setIsLoading(false);
        return;
      }

      const decisions = loadDecisionOverrides();
      const detectedFlags: ExtendedModerationFlag[] = [];

      // Group ratings by battle_id -> voter_id
      const battleVoterGroups: Record<string, Record<string, Array<{ id: string; submission_id: string; score: number; created_at?: string }>>> = {};

      dbRatings.forEach((r: { id: string; battle_id: string; submission_id: string; voter_id: string; score: number; created_at?: string }) => {
        if (!r.battle_id || !r.voter_id) return;
        if (!battleVoterGroups[r.battle_id]) {
          battleVoterGroups[r.battle_id] = {};
        }
        if (!battleVoterGroups[r.battle_id][r.voter_id]) {
          battleVoterGroups[r.battle_id][r.voter_id] = [];
        }
        battleVoterGroups[r.battle_id][r.voter_id].push(r);
      });

      // Scan each battle's voter activity
      Object.entries(battleVoterGroups).forEach(([bId, voters]) => {
        const battle = allBattles.find((b) => b.id === bId) || battleService.getBattleById(bId);
        const battleTitle = battle?.title || `Beat Battle #${bId.replace("battle-", "")}`;
        const minRequired = battle?.minVotesRequired || 5;

        // Submissions count in this battle
        const battleSubs = battleService.getSubmissionsByBattleId(bId);
        const totalSubsCount = battleSubs.length;

        Object.entries(voters).forEach(([voterId, userVotes]) => {
          const voterProfile: UserProfile | undefined = 
            producerService.getProducerById(voterId) || 
            producerService.getProducerByTag(voterId);

          const voterNickname = voterProfile?.nickname || voterId;
          const voterEmail = voterProfile?.email || `${voterId}@user.bnp`;
          const voterAvatar = voterProfile?.avatarUrl || "/avatars/default-avatar.png";
          const votesCast = userVotes.length;
          const totalScore = userVotes.reduce((sum, v) => sum + (Number(v.score) || 0), 0);
          const averageRatingGiven = votesCast > 0 ? Number((totalScore / votesCast).toFixed(2)) : 0;

          // Check 1: Incomplete voter threshold (voted on fewer than required while battle has enough submissions)
          if (totalSubsCount >= minRequired && votesCast < minRequired) {
            const flagId = `flag-incomplete-${bId}-${voterId}`;
            detectedFlags.push({
              id: flagId,
              battleId: bId,
              battleTitle,
              voterUserId: voterId,
              voterNickname,
              voterEmail,
              voterAvatar,
              flagType: "incomplete_votes",
              details: `Voted on only ${votesCast}/${totalSubsCount} tracks (minimum requirement is ${minRequired} votes to be counted).`,
              timestamp: userVotes[0]?.created_at || new Date().toISOString(),
              status: decisions[flagId] || "pending",
              votesCast,
              averageRatingGiven,
            });
          }

          // Check 2: Torpedo / Favoritism Bias (giving 1 star to almost all tracks while isolating 1 or 2 tracks with high scores)
          const onesCount = userVotes.filter((v) => Number(v.score) === 1).length;
          const maxScore = Math.max(...userVotes.map((v) => Number(v.score) || 0));
          const highScoresCount = userVotes.filter((v) => Number(v.score) >= 4).length;
          let hasTorpedoFlag = false;

          if (votesCast >= 5 && (onesCount / votesCast) >= 0.75 && highScoresCount <= 2 && maxScore >= 4) {
            hasTorpedoFlag = true;
            const flagId = `flag-torpedo-${bId}-${voterId}`;
            detectedFlags.push({
              id: flagId,
              battleId: bId,
              battleTitle,
              voterUserId: voterId,
              voterNickname,
              voterEmail,
              voterAvatar,
              flagType: "torpedo_voting",
              details: `Torpedo pattern: gave 1 flame to ${onesCount}/${votesCast} tracks (${Math.round((onesCount / votesCast) * 100)}%) while isolating ${highScoresCount} track(s) with ${maxScore} flames.`,
              timestamp: userVotes[userVotes.length - 1]?.created_at || new Date().toISOString(),
              status: decisions[flagId] || "pending",
              votesCast,
              averageRatingGiven,
            });
          }

          // Check 3: Extreme Outlier / Straight-line downvoting (average <= 1.5 across 5+ votes)
          if (votesCast >= 5 && averageRatingGiven <= 1.5 && !hasTorpedoFlag) {
            const flagId = `flag-outlier-${bId}-${voterId}`;
            detectedFlags.push({
              id: flagId,
              battleId: bId,
              battleTitle,
              voterUserId: voterId,
              voterNickname,
              voterEmail,
              voterAvatar,
              flagType: "extreme_outlier",
              details: `Abnormally low average rating (${averageRatingGiven} flames) across ${votesCast} submissions (straight-line downvoting pattern).`,
              timestamp: userVotes[userVotes.length - 1]?.created_at || new Date().toISOString(),
              status: decisions[flagId] || "pending",
              votesCast,
              averageRatingGiven,
            });
          }

          // Check 3: Rapid Velocity Clicking (multiple individual votes submitted under 1.5 seconds)
          // Note: When a user locks their completed ballot, all rows are inserted in a single batch with identical timestamps.
          // We ignore single-batch ballot submissions (time span < 3s across all tracks) to prevent false positives.
          if (votesCast >= 3) {
            const sortedByTime = [...userVotes]
              .filter((v) => v.created_at)
              .map((v) => new Date(v.created_at!).getTime())
              .sort((a, b) => a - b);

            const totalTimeSpan = sortedByTime[sortedByTime.length - 1] - sortedByTime[0];
            const isSingleBatchSubmission = totalTimeSpan < 3000;

            if (!isSingleBatchSubmission) {
              let rapidCount = 0;
              for (let i = 1; i < sortedByTime.length; i++) {
                const diff = sortedByTime[i] - sortedByTime[i - 1];
                if (diff > 100 && diff < 1500) {
                  rapidCount++;
                }
              }

              if (rapidCount >= 3) {
                const flagId = `flag-rapid-${bId}-${voterId}`;
                detectedFlags.push({
                  id: flagId,
                  battleId: bId,
                  battleTitle,
                  voterUserId: voterId,
                  voterNickname,
                  voterEmail,
                  voterAvatar,
                  flagType: "rapid_clicking",
                  details: `Detected ${rapidCount} rapid vote submissions (<1.5s interval), indicating bot-like or speed voting without listening.`,
                  timestamp: userVotes[userVotes.length - 1]?.created_at || new Date().toISOString(),
                  status: decisions[flagId] || "pending",
                  votesCast,
                  averageRatingGiven,
                });
              }
            }
          }
        });
      });

      // Compute total voters scanned
      let totalVotersScanned = 0;
      Object.values(battleVoterGroups).forEach((voters) => {
        totalVotersScanned += Object.keys(voters).length;
      });

      setScanStats({
        totalVoters: totalVotersScanned,
        totalBattles: Object.keys(battleVoterGroups).length,
        lastScannedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      });

      setFlags(detectedFlags);
    } catch (err) {
      console.error("Error scanning anomalies:", err);
      setErrorBanner(`Scan error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    scanAnomalies();
  }, [scanAnomalies]);

  // Handle Moderation Action
  const handleAction = async (flag: ExtendedModerationFlag, action: "approved" | "discarded") => {
    setActionLoadingId(flag.id);
    try {
      if (action === "discarded") {
        // Purge voter's votes from this battle and recompute battle scores
        await battleService.unlockUserRatings(flag.battleId, flag.voterUserId);

        activityLogService.logActivity({
          type: "battle.update",
          description: `Admin discarded suspicious votes from '${flag.voterNickname}' in ${flag.battleTitle}`,
          metadata: {
            battleId: flag.battleId,
            voterId: flag.voterUserId,
            reason: flag.details,
            action: "discard_votes",
          },
        });
      }

      saveDecisionOverride(flag.id, action);
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, status: action } : f))
      );
    } catch {
      // console.error("Error applying moderation action:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter flags by selected battle and status
  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      const matchesBattle = selectedBattleId === "all" || f.battleId === selectedBattleId;
      const matchesStatus = filterStatus === "all" || f.status === filterStatus;
      return matchesBattle && matchesStatus;
    });
  }, [flags, selectedBattleId, filterStatus]);

  const getBadgeStyle = (type: ModerationFlag["flagType"]) => {
    switch (type) {
      case "torpedo_voting":
        return { label: "Torpedo / Favoritism Bias", color: "text-rose-400 bg-rose-500/10" };
      case "rapid_clicking":
        return { label: "Rapid Click Velocity", color: "text-amber-400 bg-amber-500/10" };
      case "multi_account_ip":
        return { label: "IP/Device Collusion", color: "text-purple-400 bg-purple-500/10" };
      case "incomplete_votes":
        return { label: "Below Vote Threshold", color: "text-amber-400 bg-amber-500/10" };
      case "extreme_outlier":
      default:
        return { label: "Outlier Rating Bias", color: "text-indigo-400 bg-indigo-500/10" };
    }
  };

  const pendingCount = flags.filter(
    (f) => (selectedBattleId === "all" || f.battleId === selectedBattleId) && f.status === "pending"
  ).length;

  const approvedCount = flags.filter(
    (f) => (selectedBattleId === "all" || f.battleId === selectedBattleId) && f.status === "approved"
  ).length;

  const discardedCount = flags.filter(
    (f) => (selectedBattleId === "all" || f.battleId === selectedBattleId) && f.status === "discarded"
  ).length;

  const totalFlagsCount = flags.filter(
    (f) => selectedBattleId === "all" || f.battleId === selectedBattleId
  ).length;

  return (
    <AdminGuard>
      <div className="w-full space-y-8 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Panel</span>
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-[#FF5E3A]" />
              <span>Voting Moderation</span>
            </h1>
            {scanStats && (
              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Scanned {scanStats.totalVoters} voters across {scanStats.totalBattles} battle(s) • Last scan: {scanStats.lastScannedAt}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Metric Card: Pending */}
            <div className="bg-surface-card rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-xs text-zinc-400 font-bold">Pending</span>
              <span className="text-sm font-bold text-[#FF5E3A]">
                {pendingCount}
              </span>
            </div>

            {/* Metric Card: Approved */}
            <div className="bg-surface-card rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-xs text-zinc-400 font-bold">Approved</span>
              <span className="text-sm font-bold text-emerald-400">
                {approvedCount}
              </span>
            </div>

            {/* Metric Card: Discarded */}
            <div className="bg-surface-card rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-xs text-zinc-400 font-bold">Discarded</span>
              <span className="text-sm font-bold text-zinc-300">
                {discardedCount}
              </span>
            </div>

            {/* Reset Decisions Button */}
            {(approvedCount > 0 || discardedCount > 0) && (
              <button
                onClick={clearAllDecisions}
                className="px-3.5 py-2 rounded-2xl bg-surface-card hover:bg-surface-hover text-zinc-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                title="Reset all moderation overrides back to Pending"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Decisions</span>
              </button>
            )}

            {/* Refresh Scanner Button */}
            <button
              onClick={scanAnomalies}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-2xl bg-surface-card hover:bg-surface-hover text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Scan all battles for anomalies"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-brand" : "text-zinc-400"}`} />
              <span className="hidden sm:inline">Scan & Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert Banner */}
        {errorBanner && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-400 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-zinc-400 hover:text-white font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Battle Filter Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBattleId("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedBattleId === "all"
                ? "bg-brand text-white shadow-md"
                : "bg-surface-card text-zinc-400 hover:text-white hover:bg-surface-hover"
            }`}
          >
            All Battles
          </button>

          {battles.map((b) => {
            const isSelected = selectedBattleId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBattleId(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-brand text-white shadow-md"
                    : "bg-surface-card text-zinc-400 hover:text-white hover:bg-surface-hover"
                }`}
              >
                <span>{b.title}</span>
                {b.phase === "rating" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Live Rating Active" />
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Status Tabs */}
        <div className="flex items-center gap-2">
          {(["pending", "all", "approved", "discarded"] as const).map((status) => {
            const count = status === "all" 
              ? flags.filter((f) => selectedBattleId === "all" || f.battleId === selectedBattleId).length
              : flags.filter((f) => (selectedBattleId === "all" || f.battleId === selectedBattleId) && f.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  filterStatus === status
                    ? "bg-brand text-white shadow-md"
                    : "bg-surface-card text-zinc-400 hover:text-white hover:bg-surface-hover"
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Flags List */}
        <div className="space-y-3.5">
          {isLoading ? (
            <div className="bg-surface-card rounded-3xl p-12 text-center space-y-3 shadow-md">
              <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Scanning all battle ratings for anomalies...</p>
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="bg-surface-card rounded-3xl p-12 text-center text-zinc-400 shadow-md space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-white">
                {totalFlagsCount > 0 ? "No Flags in This View" : "All Clear!"}
              </h2>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                {totalFlagsCount > 0
                  ? `There are ${totalFlagsCount} anomaly/anomalies detected for this battle, but none under "${filterStatus}". Switch tabs or reset decisions.`
                  : selectedBattleId === "all"
                  ? "No flagged voting anomalies detected across any battle in this category."
                  : `No flagged voting anomalies found for ${battles.find((b) => b.id === selectedBattleId)?.title || "this battle"}.`}
              </p>
              {totalFlagsCount > 0 && filterStatus !== "all" && (
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setFilterStatus("all")}
                    className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    View All Flags ({totalFlagsCount})
                  </button>
                  <button
                    onClick={clearAllDecisions}
                    className="px-4 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All to Pending</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredFlags.map((flag) => {
              const badge = getBadgeStyle(flag.flagType);
              const isActionLoading = actionLoadingId === flag.id;

              return (
                <div
                  key={flag.id}
                  className="bg-surface-card rounded-3xl p-6 space-y-4 transition-all shadow-md"
                >
                  {/* Top Row: Badge, Battle Name & Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-3xl text-xs font-bold ${badge.color}`}>
                        {badge.label}
                      </span>

                      {/* Battle Badge */}
                      <span className="px-2.5 py-1 rounded-3xl text-xs font-bold bg-[#121212] text-zinc-300 flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-brand" />
                        <span>{flag.battleTitle}</span>
                      </span>

                      <span className="text-xs text-zinc-500">
                        {new Date(flag.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>

                    {/* Status Indicator */}
                    <span className={`text-xs font-bold uppercase ${
                      flag.status === "approved"
                        ? "text-emerald-400"
                        : flag.status === "discarded"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}>
                      Status: {flag.status}
                    </span>
                  </div>

                  {/* Voter and Violation Details */}
                  <div className="bg-surface-subtle rounded-3xl p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#121212] relative shrink-0">
                          <Image
                            src={flag.voterAvatar || "/avatars/default-avatar.png"}
                            alt={flag.voterNickname}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <strong className="text-white">{flag.voterNickname}</strong>
                          <span className="text-zinc-500 ml-1.5">({flag.voterEmail})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-zinc-400">
                        <span>Votes Cast: <strong className="text-white">{flag.votesCast}</strong></span>
                        <span className="flex items-center gap-1">
                          Avg Rating: <strong className="text-[#FF5E3A]">{flag.averageRatingGiven}</strong>
                          <Flame className="w-3.5 h-3.5 fill-[#FF5E3A] text-[#FF5E3A]" />
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed pt-1">
                      <strong className="text-zinc-400">Detection Trigger: </strong>
                      {flag.details}
                    </p>
                  </div>

                  {/* Moderation Actions */}
                  {flag.status === "pending" ? (
                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        onClick={() => handleAction(flag, "approved")}
                        disabled={isActionLoading}
                        className="px-4 py-2 rounded-xl bg-surface-subtle hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Keep Votes</span>
                      </button>

                      <button
                        onClick={() => handleAction(flag, "discarded")}
                        disabled={isActionLoading}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Discard Votes & Recalculate</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        onClick={() => resetFlagDecision(flag.id)}
                        disabled={isActionLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-zinc-400 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Reopen flag for review"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen / Reset to Pending</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </AdminGuard>
  );
}
