"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminGuard } from "@/components/AdminGuard";
import {
  activityLogService,
  ActivityLogEntry,
  ActivityCategory,
  ActivityEventType,
} from "@/services/activityLogService";
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Search,
  X,
  LogIn,
  UserPlus,
  UserCheck,
  Music,
  Trash2,
  Swords,
  Flame,
  Award,
  Trophy,
  Disc,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";

const CATEGORIES: { key: ActivityCategory; label: string }[] = [
  { key: "all", label: "All Activity" },
  { key: "auth", label: "Logins & Signups" },
  { key: "profiles", label: "Profiles" },
  { key: "beats", label: "Beats" },
  { key: "battles", label: "Battles & Voting" },
  { key: "releases", label: "Releases" },
];

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSec < 60) return "Just now";
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventStyle(type: ActivityEventType) {
  switch (type) {
    case "auth.login":
      return {
        label: "Signed In",
        icon: LogIn,
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
      };
    case "auth.signup":
      return {
        label: "New Account",
        icon: UserPlus,
        bg: "bg-teal-500/10",
        text: "text-teal-400",
        border: "border-teal-500/20",
      };
    case "profile.update":
      return {
        label: "Profile Updated",
        icon: UserCheck,
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
      };
    case "beat.upload":
      return {
        label: "Beat Uploaded",
        icon: Music,
        bg: "bg-[#7B61FF]/10",
        text: "text-[#7B61FF]",
        border: "border-[#7B61FF]/20",
      };
    case "beat.delete":
      return {
        label: "Beat Deleted",
        icon: Trash2,
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        border: "border-rose-500/20",
      };
    case "battle.submit":
      return {
        label: "Battle Entry",
        icon: Swords,
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
      };
    case "battle.vote":
      return {
        label: "Public Vote",
        icon: Flame,
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/20",
      };
    case "battle.jury_score":
      return {
        label: "Jury Score",
        icon: Award,
        bg: "bg-cyan-500/10",
        text: "text-cyan-400",
        border: "border-cyan-500/20",
      };
    case "battle.create":
    case "battle.update":
      return {
        label: "Battle Config",
        icon: Trophy,
        bg: "bg-yellow-500/10",
        text: "text-yellow-400",
        border: "border-yellow-500/20",
      };
    case "release.create":
    case "release.update":
      return {
        label: "Release",
        icon: Disc,
        bg: "bg-fuchsia-500/10",
        text: "text-fuchsia-400",
        border: "border-fuchsia-500/20",
      };
    default:
      return {
        label: "System",
        icon: Activity,
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        border: "border-zinc-500/20",
      };
  }
}

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [category, setCategory] = useState<ActivityCategory>("all");
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    const data = activityLogService.getLogs({
      category,
      search,
      limit: 150,
    });
    setLogs(data);
  }, [category, search]);

  useEffect(() => {
    loadLogs();
    activityLogService.syncFromSupabase().then(() => {
      loadLogs();
    });
  }, [loadLogs]);

  // Listen to live platform activity events
  useEffect(() => {
    const handleLiveActivity = () => {
      loadLogs();
    };

    window.addEventListener("bnp_activity_logged", handleLiveActivity);
    return () => {
      window.removeEventListener("bnp_activity_logged", handleLiveActivity);
    };
  }, [loadLogs]);

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    try {
      await activityLogService.syncFromSupabase();
      loadLogs();
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  return (
    <AdminGuard>
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin Panel</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <Activity className="w-7 h-7 text-brand" />
                <span>Platform Activity Logs</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time audit trail of logins, profile updates, beat uploads, battle submissions, and jury evaluations.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncSupabase}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#181818] hover:bg-[#222222] text-xs font-bold text-white transition-all shadow-md self-start sm:self-auto cursor-pointer border border-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Logs"}</span>
            </button>
          </div>
        </div>

        {/* Controls Container: Search & Category Pills */}
        <div className="bg-[#181818] rounded-[28px] p-5 sm:p-6 space-y-4 shadow-lg border border-white/5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user nickname, action, or track..."
              className="w-full bg-[#121212] rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand border border-white/5 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {CATEGORIES.map((c) => {
              const isActive = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-brand text-white shadow-md shadow-brand/20"
                      : "bg-[#121212] text-zinc-400 hover:text-white hover:bg-[#1E1E1E]"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Logs Stream */}
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="bg-[#181818] rounded-[28px] p-12 text-center space-y-3 border border-white/5">
              <Activity className="w-10 h-10 text-zinc-600 mx-auto" />
              <h2 className="text-lg font-bold text-white">No Activity Found</h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No platform activity matches your filter criteria. Try adjusting your search query or category filter.
              </p>
            </div>
          ) : (
            logs.map((log) => {
              const style = getEventStyle(log.type);
              const Icon = style.icon;
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
              const isExpanded = expandedLogId === log.id;

              return (
                <div
                  key={log.id}
                  className="bg-[#181818] rounded-[24px] p-4 sm:p-5 border border-white/5 space-y-3 shadow-md hover:border-white/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Avatar + Event Details */}
                    <div className="flex items-start gap-3.5">
                      {/* Avatar or Event Icon */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#121212] border border-white/10 relative shadow-inner">
                          <Image
                            src={log.userAvatar || "/avatars/default-avatar.png"}
                            alt={log.userNickname || "User"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${style.bg} ${style.border} border flex items-center justify-center`}
                        >
                          <Icon className={`w-3 h-3 ${style.text}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {log.userNickname || "System"}
                          </span>

                          {log.userRole && (
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand/15 text-brand">
                              {log.userRole}
                            </span>
                          )}

                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text} border ${style.border}`}
                          >
                            {style.label}
                          </span>
                        </div>

                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {log.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Timestamp & Details Toggle */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs text-zinc-500 whitespace-nowrap" title={new Date(log.timestamp).toLocaleString()}>
                        {formatTimeAgo(log.timestamp)}
                      </span>

                      {hasMetadata && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400 hover:text-brand transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide Data" : "View Data"}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable JSON Metadata Inspector */}
                  {hasMetadata && isExpanded && (
                    <div className="bg-[#121212] rounded-xl p-3.5 border border-white/5 text-xs font-mono text-zinc-300 overflow-x-auto space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2 text-zinc-400 font-bold mb-1">
                        <Shield className="w-3.5 h-3.5 text-brand" />
                        <span>Event Metadata:</span>
                      </div>
                      <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
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
