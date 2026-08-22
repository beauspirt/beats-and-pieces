"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { battleService } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Trophy } from "lucide-react";
import { Competition } from "@/lib/types";

export default function BattlesPage() {
  const { isLoggedIn } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompetitions(battleService.getAllBattles());
    setMounted(true);

    battleService.syncFromSupabase().then(() => {
      setCompetitions(battleService.getAllBattles());
    });
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-10 w-full animate-in fade-in duration-300">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const activeBattle = competitions.find((c) => c.phase !== "completed");
  const pastBattles = competitions.filter((c) => c.phase === "completed");

  return (
    <div className="space-y-10 w-full animate-in fade-in duration-300">
      
      {/* SECTION 1: ACTIVE BATTLE (IF ANY ONGOING BATTLE EXISTS) */}
      {activeBattle && (
        <section className="space-y-4">
          <div className="flex items-center justify-between h-9">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E3A] animate-pulse" />
              <span>Active Battle</span>
            </h2>
          </div>

          <Link
            href={isLoggedIn ? `/battles/${activeBattle.id}` : "/signin"}
            className="bg-[#181818] rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row gap-7 items-start hover:bg-[#1A1A1A] transition-all shadow-xl block cursor-pointer group relative overflow-hidden"
          >
            {/* Cover Art Thumbnail (Grand 320px Square) */}
            <div
              className="w-full md:w-80 h-80 max-w-[320px] max-h-[320px] rounded-2xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl"
              style={{ width: "320px", height: "320px", position: "relative" }}
            >
              <Image
                src={activeBattle.coverImage}
                alt={activeBattle.title}
                width={320}
                height={320}
                className="w-full h-full object-cover"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                priority
              />
            </div>

            {/* Info */}
            <div className="flex-1 w-full min-w-0 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  {activeBattle.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#7B61FF] text-xs sm:text-sm font-semibold text-white shadow-sm inline-flex items-center justify-center text-center leading-none">
                    {activeBattle.phase === "submission"
                      ? "Phase 1: Submissions Open"
                      : activeBattle.phase === "rating"
                      ? "Phase 2: Public Rating"
                      : activeBattle.phase === "judging"
                      ? "Phase 3: Jury Evaluation"
                      : "Phase 4: Results"}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs sm:text-sm text-[#A0A0A0] inline-flex items-center justify-center text-center leading-none">
                    {activeBattle.totalSubmissions} Total Entries
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-sm sm:text-base text-[#A0A0A0]">
                <p>Hosted by: <span className="text-white font-medium">{activeBattle.hosts?.[0] || "Nerub"}</span></p>
                {activeBattle.judges.length > 0 && (
                  <p>Judged by: <span className="text-white font-medium">{activeBattle.judges.join(", ")}</span></p>
                )}
              </div>

              {activeBattle.description && (
                <p className="text-sm sm:text-base text-[#D1D1D1] leading-relaxed">
                  {activeBattle.description}
                </p>
              )}

              <div className="text-xs sm:text-sm text-[#888888] pt-2">
                Submissions open • Enter your beat to participate
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* SECTION 2: PAST BATTLES ARCHIVE */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Past Battles</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {pastBattles.map((battle) => (
            <Link
              key={battle.id}
              href={`/battles/${battle.id}`}
              className="bg-[#181818] rounded-2xl p-3.5 sm:p-4 hover:bg-[#1C1C1C] transition-all flex flex-col group shadow-lg space-y-3"
            >
              {/* Compact Square Card Cover Art */}
              <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-[#121212] shrink-0">
                <Image
                  src={battle.coverImage}
                  alt={battle.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Card Details */}
              <div className="flex-1 flex flex-col justify-between space-y-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#888888]">
                    <span>{battle.endedAt ? new Date(battle.endedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Completed"}</span>
                    <span className="font-medium px-2.5 py-1 rounded-full bg-[#121212] text-[#A0A0A0] text-xs inline-flex items-center justify-center text-center leading-none">
                      {battle.totalSubmissions} Entries
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                    {battle.title}
                  </h3>

                  <p className="text-xs text-[#888888] line-clamp-3 leading-relaxed">
                    {battle.description}
                  </p>
                </div>

                {/* Winner Summary Footer */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <div className="text-white font-bold text-xs">
                    <span>Winner: {battle.winner || "TBD"}</span>
                  </div>
                  <span className="text-[#888888] group-hover:text-white transition-colors flex items-center gap-1 text-xs">
                    Results <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
