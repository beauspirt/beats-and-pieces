"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Battle, ModerationFlag, UserProfile } from "@/lib/types";
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, Ban, AlertTriangle, 
  Flame, RefreshCw, Trophy, Swords, Zap, Check, ChevronDown, Clock
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

  // Anomaly Scanner across battles
  const scanAnomalies = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Sync fresh battles & submissions
      await battleService.syncFromSupabase();
      const allBattles = battleService.getAllBattles();
      setBattles(allBattles);

      // 2. Fetch all ratings from Supabase
      const { data: dbRatings, error } = await supabase
        .from("ratings")
        .select("id, battle_id, submission_id, voter_id, score, created_at");

      if (error || !dbRatings) {
        setFlags([]);
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

          // Check 2: Extreme Outlier / Straight-line downvoting (e.g. giving all 1.0s or <= 1.2 across 5+ votes)
          if (votesCast >= 5 && averageRatingGiven <= 1.2) {
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

          // Check 3: Rapid Velocity Clicking (multiple votes submitted under 1.5 seconds)
          if (votesCast >= 3) {
            const sortedByTime = [...userVotes]
              .filter((v) => v.created_at)
              .map((v) => new Date(v.created_at!).getTime())
              .sort((a, b) => a - b);

            let rapidCount = 0;
            for (let i = 1; i < sortedByTime.length; i++) {
              if (sortedByTime[i] - sortedByTime[i - 1] < 1500) {
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
        });
      });

      setFlags(detectedFlags);
    } catch {
      // console.error("Error scanning anomalies:", err);
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
      case "rapid_clicking":
        return { label: "Rapid Click Velocity", color: "text-rose-400 bg-rose-500/10" };
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

  const discardedCount = flags.filter(
    (f) => (selectedBattleId === "all" || f.battleId === selectedBattleId) && f.status === "discarded"
  ).length;

  return (
    <AdminGuard>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        
        {/* Top Breadcrumb */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admin Control Center</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-[#FF5E3A]" />
              <span>Voting Anomaly & Moderation</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time fraud prevention & voting audit across all beat battles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Metric Card: Pending */}
            <div className="bg-surface-card rounded-3xl px-4 py-2 text-center shadow-sm">
              <span className="text-xs text-zinc-500 uppercase font-bold block">Pending</span>
              <span className="text-lg font-bold text-[#FF5E3A]">
                {pendingCount}
              </span>
            </div>

            {/* Metric Card: Discarded */}
            <div className="bg-surface-card rounded-3xl px-4 py-2 text-center shadow-sm">
              <span className="text-xs text-zinc-500 uppercase font-bold block">Discarded</span>
              <span className="text-lg font-bold text-zinc-400">
                {discardedCount}
              </span>
            </div>

            {/* Refresh Scanner Button */}
            <button
              onClick={scanAnomalies}
              disabled={isLoading}
              className="px-3.5 py-3 rounded-xl bg-surface-card hover:bg-surface-hover text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Scan all battles for anomalies"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-brand" : "text-zinc-400"}`} />
              <span className="hidden sm:inline">Scan & Refresh</span>
            </button>
          </div>
        </div>

        {/* Battle Filter Dropdown / Pills */}
        <div className="bg-surface-card rounded-3xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Filter by Battle:
            </span>
            <span className="text-xs text-zinc-500">
              {battles.length} battles tracked
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBattleId("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedBattleId === "all"
                  ? "bg-brand text-white shadow-md"
                  : "bg-[#121212] text-zinc-400 hover:text-white hover:bg-[#1E1E1E]"
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
                      : "bg-[#121212] text-zinc-400 hover:text-white hover:bg-[#1E1E1E]"
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
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-surface-card rounded-3xl p-12 text-center space-y-3 shadow-md">
              <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Scanning all battle ratings for anomalies...</p>
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="bg-surface-card rounded-3xl p-12 text-center text-zinc-400 shadow-md space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-white">All Clear!</h2>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                {selectedBattleId === "all"
                  ? "No flagged voting anomalies detected across any battle in this category."
                  : `No flagged voting anomalies found for ${battles.find((b) => b.id === selectedBattleId)?.title || "this battle"}.`}
              </p>
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
                  {flag.status === "pending" && (
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
