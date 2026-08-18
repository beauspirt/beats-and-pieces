"use client";

import React from "react";
import Link from "next/link";
import { Shield, PlusCircle, Disc, Trophy, AlertTriangle, Users, Settings } from "lucide-react";
import { sampleModerationFlags } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const pendingFlagsCount = sampleModerationFlags.filter((f) => f.status === "pending").length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="border-b border-surface-border pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 text-brand" />
            <span>Admin Control Center</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage competitions, curate releases, configure community settings, and review flagged votes.
          </p>
        </div>
      </div>

      {/* Action Options Grid (Matching Figma Admin Panel Options.png + Moderation) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Option 1: Create New Competition */}
        <Link
          href="/admin/new-battle"
          className="bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-brand hover:bg-surface-hover transition-all space-y-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white group-hover:text-brand transition-colors">
              Create New Competition
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Launch a new beat battle, upload downloadable sample packs, configure start/rating/jury deadlines, and assign hosts & judges.
            </p>
          </div>
        </Link>

        {/* Option 2: Voting Anomaly & Anti-Fraud Moderation */}
        <Link
          href="/admin/moderation"
          className="bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-[#FF5E3A] hover:bg-surface-hover transition-all space-y-4 group relative"
        >
          {pendingFlagsCount > 0 && (
            <span className="absolute top-6 right-6 px-2.5 py-1 rounded-full bg-[#FF5E3A]/20 border border-[#FF5E3A]/40 text-[#FF5E3A] text-xs font-mono font-bold">
              {pendingFlagsCount} Pending Flags
            </span>
          )}

          <div className="w-12 h-12 rounded-xl bg-[#FF5E3A]/10 border border-[#FF5E3A]/20 flex items-center justify-center text-[#FF5E3A] group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white group-hover:text-[#FF5E3A] transition-colors">
              Voting Anomaly & Moderation
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Review automatically flagged suspicious ratings (rapid clicks, 1-star spamming, incomplete voter threshold, IP duplicates).
            </p>
          </div>
        </Link>

        {/* Option 3: Create New Release */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-zinc-700 transition-all space-y-4 group cursor-pointer"
             onClick={() => alert("New Release creator modal opened!")}>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Disc className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
              Create New Release
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Publish official Beats & Pieces compilation tapes with tracklists, producer credits, and Spotify/Bandcamp links.
            </p>
          </div>
        </div>

        {/* Option 4: User & Role Permissions */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-zinc-700 transition-all space-y-4 group cursor-pointer"
             onClick={() => alert("Role management dashboard.")}>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
              Users & Discord Roles
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Inspect registered producers, sync Discord roles, and assign Judge or Admin permissions.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
