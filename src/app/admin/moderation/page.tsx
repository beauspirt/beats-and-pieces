"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ModerationFlag } from "@/lib/types";
import { ArrowLeft, ShieldAlert, CheckCircle2, Ban, AlertTriangle, Filter, Search, Flame, Clock } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";

export default function VotingModerationPage() {
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "discarded">("pending");

  const handleAction = (flagId: string, action: "approved" | "discarded") => {
    setFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, status: action } : f))
    );
  };

  const filteredFlags = flags.filter(
    (f) => filterStatus === "all" || f.status === filterStatus
  );

  const getBadgeStyle = (type: ModerationFlag["flagType"]) => {
    switch (type) {
      case "rapid_clicking":
        return { label: "Rapid Click Spam (<1s/beat)", color: "text-red-400 bg-red-500/10" };
      case "multi_account_ip":
        return { label: "IP/Device Collusion", color: "text-purple-400 bg-purple-500/10" };
      case "incomplete_votes":
        return { label: "Below Minimum Threshold", color: "text-amber-400 bg-amber-500/10" };
      default:
        return { label: "Outlier Rating", color: "text-blue-400 bg-blue-500/10" };
    }
  };

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
            Human-in-the-loop fraud prevention for Beat Battle #5 public rating.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-surface-card rounded-xl px-4 py-2 text-center shadow-sm">
            <span className="text-xs text-zinc-500 uppercase font-mono block">Pending</span>
            <span className="text-lg font-bold text-[#FF5E3A] font-mono">
              {flags.filter((f) => f.status === "pending").length}
            </span>
          </div>
          <div className="bg-surface-card rounded-xl px-4 py-2 text-center shadow-sm">
            <span className="text-xs text-zinc-500 uppercase font-mono block">Discarded</span>
            <span className="text-lg font-bold text-zinc-400 font-mono">
              {flags.filter((f) => f.status === "discarded").length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["pending", "all", "approved", "discarded"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filterStatus === status
                ? "bg-brand text-white shadow-md"
                : "bg-surface-card text-zinc-400 hover:text-white"
            }`}
          >
            {status} ({flags.filter((f) => status === "all" || f.status === status).length})
          </button>
        ))}
      </div>

      {/* Flags List */}
      <div className="space-y-4">
        {filteredFlags.length === 0 ? (
          <div className="bg-surface-card rounded-2xl p-12 text-center text-zinc-400 shadow-md">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-white">All clear!</p>
            <p className="text-xs text-zinc-500 mt-1">No flagged anomalies in this category.</p>
          </div>
        ) : (
          filteredFlags.map((flag) => {
            const badge = getBadgeStyle(flag.flagType);

            return (
              <div
                key={flag.id}
                className="bg-surface-card rounded-2xl p-6 space-y-4 transition-all shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      {new Date(flag.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <span className={`text-xs font-mono font-bold uppercase ${
                    flag.status === "approved"
                      ? "text-emerald-400"
                      : flag.status === "discarded"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}>
                    Status: {flag.status}
                  </span>
                </div>

                {/* Voter and Violation Details */}
                <div className="bg-surface-subtle rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">Voter: </span>
                      <strong className="text-white">{flag.voterNickname}</strong>
                      <span className="text-zinc-500 ml-1">({flag.voterEmail})</span>
                    </div>

                    <div className="flex items-center gap-4 font-mono text-zinc-400">
                      <span>Votes Cast: <strong className="text-white">{flag.votesCast}</strong></span>
                      <span className="flex items-center gap-1">
                        Avg Rating: <strong className="text-[#FF5E3A]">{flag.averageRatingGiven}</strong>
                        <Flame className="w-3.5 h-3.5 fill-[#FF5E3A] text-[#FF5E3A]" />
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed pt-2">
                    <strong className="text-zinc-400">Detection Trigger: </strong>
                    {flag.details}
                  </p>
                </div>

                {/* Moderation Actions */}
                {flag.status === "pending" && (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleAction(flag.id, "approved")}
                      className="px-4 py-2 rounded-xl bg-surface-subtle hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Keep Votes</span>
                    </button>

                    <button
                      onClick={() => handleAction(flag.id, "discarded")}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Discard Votes & Penalize</span>
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
