"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, PlusCircle, Disc, Trophy, AlertTriangle, Users, Settings, UserCheck, ArrowRight, Layers, FileEdit } from "lucide-react";
import { sampleProducers } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { AdminGuard } from "@/components/AdminGuard";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { loginWithUser } = useAuth();
  const pendingFlagsCount = 0;

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="w-7 h-7 text-brand" />
            <span>Admin Control Center</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage beat battles, curate releases, configure community settings, and review flagged votes.
          </p>
        </div>
      </div>

      {/* Action Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Option 1: Create New Battle */}
        <Link
          href="/admin/new-battle"
          className="bg-surface-card rounded-2xl p-6 hover:bg-surface-hover transition-all space-y-4 group shadow-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-brand transition-colors">
              Create New Battle
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Launch a new beat battle, upload downloadable sample packs, configure start/rating/jury deadlines, and assign hosts & judges.
            </p>
          </div>
        </Link>

        {/* Option 2: Edit Existing Battles */}
        <Link
          href="/admin/battles"
          className="bg-surface-card rounded-2xl p-6 hover:bg-surface-hover transition-all space-y-4 group shadow-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Layers className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
              Edit Battle(s)
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Inspect live & archived battles, update timelines, manage tracklists, and review submissions.
            </p>
          </div>
        </Link>

        {/* Option 3: Create New Release */}
        <Link
          href="/admin/new-release"
          className="bg-surface-card rounded-2xl p-6 hover:bg-surface-hover transition-all space-y-4 group shadow-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Disc className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
              Create New Release
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Publish official Beats & Pieces compilation tapes with tracklists, producer credits, and streaming links.
            </p>
          </div>
        </Link>

        {/* Option 4: Edit Releases */}
        <Link
          href="/admin/releases"
          className="bg-surface-card rounded-2xl p-6 hover:bg-surface-hover transition-all space-y-4 group shadow-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <FileEdit className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
              Edit Release(s)
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Manage existing beat tapes, update Spotify/Bandcamp links, and edit tape descriptions.
            </p>
          </div>
        </Link>

        {/* Option 5: Voting Anomaly & Anti-Fraud Moderation */}
        <Link
          href="/admin/moderation"
          className="bg-surface-card rounded-2xl p-6 hover:bg-surface-hover transition-all space-y-4 group relative shadow-md"
        >
          {pendingFlagsCount > 0 && (
            <span className="absolute top-6 right-6 px-2.5 py-1 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-mono font-bold">
              {pendingFlagsCount} Pending Flags
            </span>
          )}

          <div className="w-12 h-12 rounded-2xl bg-[#FF5E3A]/10 flex items-center justify-center text-[#FF5E3A] group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-[#FF5E3A] transition-colors">
              Voting Anomaly & Moderation
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Review automatically flagged suspicious ratings (rapid clicks, outlier ratings, incomplete voter threshold).
            </p>
          </div>
        </Link>

        {/* Option 6: User & Role Permissions */}
        <div className="bg-surface-card rounded-2xl p-6 hover:bg-surface-hover transition-all space-y-4 group cursor-pointer shadow-md"
             onClick={() => alert("Role management dashboard.")}>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
              Users & Discord Roles
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Inspect registered producers, sync Discord roles, and assign Judge or Admin permissions.
            </p>
          </div>
        </div>

      </div>

      {/* QUICK SWITCHER FOR TESTING & DEMO SHOWCASE (ADMIN ONLY) */}
      <div className="bg-surface-card rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              Account Switcher (Testing & Demo Showcase)
            </h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {Object.keys(sampleProducers).length} Accounts Available
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          As admin, click any producer profile below to preview the platform from their perspective:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1 max-h-56 overflow-y-auto pr-1">
          {Object.entries(sampleProducers).map(([id, prod]) => (
            <button
              key={id}
              onClick={() => {
                loginWithUser(id);
                router.push("/profile");
              }}
              className="p-3 rounded-2xl bg-[#121212] hover:bg-[#202020] text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-brand transition-colors truncate">
                  {prod.nickname}
                </span>
                <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
              <span className="text-xs font-mono text-zinc-500 truncate block mt-0.5">
                {prod.email}
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
    </AdminGuard>
  );
}
