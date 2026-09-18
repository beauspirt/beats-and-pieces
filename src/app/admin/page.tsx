"use client";

import React from "react";
import Link from "next/link";
import { Trophy, Disc, AlertTriangle, Activity, Users } from "lucide-react";
import { AdminGuard } from "@/components/AdminGuard";

export default function AdminDashboardPage() {
  const pendingFlagsCount = 0;

  return (
    <AdminGuard>
      <div className="w-full space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="pb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Admin Panel
          </h1>
        </div>

        {/* Action Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Battles */}
          <Link
            href="/admin/battles"
            className="bg-surface-card rounded-3xl p-5 hover:bg-surface-hover transition-all flex items-center gap-4 group shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white group-hover:text-brand transition-colors">
              Battles
            </h2>
          </Link>

          {/* Option 2: Releases */}
          <Link
            href="/admin/releases"
            className="bg-surface-card rounded-3xl p-5 hover:bg-surface-hover transition-all flex items-center gap-4 group shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
              <Disc className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
              Releases
            </h2>
          </Link>

          {/* Option 3: Voting Moderation */}
          <Link
            href="/admin/moderation"
            className="bg-surface-card rounded-3xl p-5 hover:bg-surface-hover transition-all flex items-center justify-between gap-4 group relative shadow-md"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5E3A]/10 flex items-center justify-center text-[#FF5E3A] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-[#FF5E3A] transition-colors truncate">
                Voting Moderation
              </h2>
            </div>
            {pendingFlagsCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#FF5E3A]/20 text-[#FF5E3A] text-xs font-bold shrink-0">
                {pendingFlagsCount} Flags
              </span>
            )}
          </Link>

          {/* Option 4: Activity Logs */}
          <Link
            href="/admin/logs"
            className="bg-surface-card rounded-3xl p-5 hover:bg-surface-hover transition-all flex items-center gap-4 group shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
              Activity Logs
            </h2>
          </Link>

          {/* Option 5: Accounts */}
          <Link
            href="/admin/accounts"
            className="bg-surface-card rounded-3xl p-5 hover:bg-surface-hover transition-all flex items-center gap-4 group shadow-md"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#7B61FF]/10 flex items-center justify-center text-[#7B61FF] shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white group-hover:text-[#7B61FF] transition-colors">
              Accounts
            </h2>
          </Link>
        </div>
      </div>
    </AdminGuard>
  );
}
