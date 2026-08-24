"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { battleService } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Flame, Trophy } from "lucide-react";
import { Competition } from "@/lib/types";

export default function BattlesPage() {
  const { isLoggedIn } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [mounted, setMounted] = useState(false);

  const refreshBattles = useCallback(() => {
    setCompetitions(battleService.getAllBattles());
  }, []);

  useEffect(() => {
    refreshBattles();
    setMounted(true);

    battleService.syncFromSupabase().then(() => {
      refreshBattles();
    });

    const handleUpdate = () => {
      refreshBattles();
    };

    window.addEventListener("bnp_battles_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("bnp_battles_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshBattles]);

  if (!mounted) {
    return (
      <div className="space-y-10 w-full animate-in fade-in duration-300">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const allActive = competitions.filter((c) => c.phase !== "completed");
  const activeBattle = allActive[0];
  const additionalActive = allActive.slice(1);
  const pastBattles = competitions.filter((c) => c.phase === "completed");

  return (
    <div className="space-y-12 sm:space-y-16 w-full animate-in fade-in duration-300">
      
      {/* SECTION 1: ACTIVE BATTLE (IF ANY ONGOING BATTLE EXISTS) */}
      {activeBattle && (
        <section className="space-y-4">
          <div className="flex items-center justify-between h-9">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E3A] animate-pulse" />
              <span>Active Battle</span>
            </h2>
          </div>

          <Link
            href={`/battles/${activeBattle.id}`}
            className="bg-[#181818] rounded-[28px] p-4 flex flex-col md:flex-row gap-6 items-start hover:bg-[#1A1A1A] transition-all shadow-xl block cursor-pointer group relative overflow-hidden"
          >
            {/* Cover Art Thumbnail (Responsive Square) */}
            <div className="w-full sm:max-w-[320px] aspect-square rounded-xl overflow-hidden relative shrink-0 bg-[#121212] shadow-2xl mx-auto md:mx-0">
              <Image
                src={activeBattle.coverImage || "/covers/default-battle.png"}
                alt={activeBattle.title}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Info */}
            <div className="flex-1 w-full min-w-0 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
                  {activeBattle.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                  <span className="px-3.5 py-1.5 rounded-full bg-[#7B61FF] text-xs font-bold text-white shadow-sm inline-flex items-center justify-center text-center leading-none">
                    {(() => {
                      const hasActiveJudges = Boolean(
                        (Array.isArray(activeBattle.judges) && activeBattle.judges.length > 0) ||
                        (Array.isArray(activeBattle.judgeDetails) && activeBattle.judgeDetails.length > 0)
                      );
                      if (activeBattle.phase === "submission") return "Phase 1: Submissions Open";
                      if (activeBattle.phase === "rating") return "Phase 2: Public Rating";
                      if (activeBattle.phase === "judging") return "Phase 3: Jury Evaluation";
                      return hasActiveJudges ? "Phase 4: Results" : "Phase 3: Results";
                    })()}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-[#121212] text-xs text-[#A0A0A0] inline-flex items-center justify-center text-center leading-none">
                    {activeBattle.totalSubmissions} Total Entries
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-sm text-[#A0A0A0]">
                <p>Hosted by: <span className="text-white">{activeBattle.hosts?.[0] || "Nerub"}</span></p>
                {activeBattle.judges.length > 0 && (
                  <p>Judged by: <span className="text-white">{activeBattle.judges.join(", ")}</span></p>
                )}
              </div>

              {activeBattle.description && (
                <p className="text-sm text-[#D1D1D1] leading-relaxed">
                  {activeBattle.description}
                </p>
              )}

              <div className="text-xs text-[#888888] pt-2">
                Submissions open • Enter your beat to participate
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* SECTION 1.5: ADDITIONAL ACTIVE BATTLES (IF MORE THAN ONE) */}
      {additionalActive.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
              <span>Other Ongoing Battles</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {additionalActive.map((battle) => {
              const hasBattleJudges = Boolean(
                (Array.isArray(battle.judges) && battle.judges.length > 0) ||
                (Array.isArray(battle.judgeDetails) && battle.judgeDetails.length > 0)
              );
              return (
              <Link
                key={battle.id}
                href={`/battles/${battle.id}`}
                className="bg-[#181818] rounded-[28px] p-4 hover:bg-[#1C1C1C] transition-all flex flex-col group shadow-lg space-y-3.5 border border-brand/20"
              >
                <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-[#121212] shrink-0">
                  <Image
                    src={battle.coverImage || "/covers/default-battle.png"}
                    alt={battle.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#888888]">
                      <span className="px-2.5 py-1 rounded-full bg-brand/20 text-brand text-xs font-bold">
                        {battle.phase === "submission"
                          ? "Phase 1"
                          : battle.phase === "rating"
                          ? "Phase 2"
                          : battle.phase === "judging"
                          ? "Phase 3"
                          : hasBattleJudges ? "Phase 4" : "Phase 3"}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-[#121212] text-[#A0A0A0] text-xs">
                        {battle.totalSubmissions} Entries
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">
                      {battle.title}
                    </h3>

                    <p className="text-xs text-[#888888] line-clamp-3 leading-relaxed">
                      {battle.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-brand">
                    <span>Enter Battle</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: BATTLES ARCHIVE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Battles Archive</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pastBattles.map((battle, index) => {
            const battleSubs = battleService.getSubmissionsByBattleId(battle.id);
            const topSub = battleSubs.find((s) => s.rank === 1) || battleSubs[0];
            const resolvedWinner = (battle.winner && battle.winner !== "TBD") ? battle.winner : (topSub?.beatmakerTag || "TBD");

            return (
              <Link
                key={battle.id}
                href={`/battles/${battle.id}`}
                className="bg-[#181818] rounded-[28px] p-4 hover:bg-[#1C1C1C] transition-all flex flex-col group shadow-lg space-y-3.5"
              >
                {/* Compact Square Card Cover Art */}
                <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-[#121212] shrink-0">
                  <Image
                    src={battle.coverImage || "/covers/default-battle.png"}
                    alt={battle.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    priority={index < 4}
                    className="object-cover"
                  />
                </div>

                {/* Card Details */}
                <div className="flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#888888]">
                      <span>{battle.endedAt ? new Date(battle.endedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Completed"}</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#121212] text-[#A0A0A0] text-xs inline-flex items-center justify-center text-center leading-none">
                        {battle.totalSubmissions} Entries
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white leading-snug">
                      {battle.title}
                    </h3>

                    <p className="text-xs text-[#888888] line-clamp-3 leading-relaxed">
                      {battle.description}
                    </p>
                  </div>

                  {/* Winner Summary Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    <div className="text-white font-bold text-xs">
                      <span>Winner: {resolvedWinner}</span>
                    </div>
                    <span className="text-[#888888] group-hover:text-white transition-colors flex items-center gap-1 text-xs">
                      Results <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
